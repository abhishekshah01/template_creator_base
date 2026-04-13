"""Async MongoDB client for template-creator's own persistence layer.

Backs the logging system (audit_events + app_logs) and any future
persistence (template_runs, drafts, etc.). Reads MONGO_URL + DB_NAME
from environment.

- `audit_events`  — regular collection, domain events (state-changing actions)
- `app_logs`      — capped collection (~500 MB), operational/debug stream
"""

from __future__ import annotations

import logging
import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import CollectionInvalid

_log = logging.getLogger("template_creator.db")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "template_creator")

# Capped collection sizing for app_logs (operational/debug stream).
_APP_LOGS_SIZE_BYTES = int(os.environ.get("APP_LOGS_CAP_BYTES", 500 * 1024 * 1024))
_APP_LOGS_MAX_DOCS = int(os.environ.get("APP_LOGS_CAP_DOCS", 2_000_000))

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[DB_NAME]
    return _db


def audit_events():
    """Regular, long-retention domain events."""
    return get_db()["audit_events"]


def app_logs():
    """Capped collection — operational/debug log stream."""
    return get_db()["app_logs"]


async def ensure_schema() -> None:
    """Create the capped app_logs collection and all indexes.

    Safe to call repeatedly: creation errors on existing collections
    are swallowed, indexes are idempotent.
    """
    db = get_db()

    # Capped app_logs
    existing = await db.list_collection_names()
    if "app_logs" not in existing:
        try:
            await db.create_collection(
                "app_logs",
                capped=True,
                size=_APP_LOGS_SIZE_BYTES,
                max=_APP_LOGS_MAX_DOCS,
            )
            _log.info("created capped collection app_logs (%d bytes / %d docs)",
                      _APP_LOGS_SIZE_BYTES, _APP_LOGS_MAX_DOCS)
        except CollectionInvalid:
            pass

    # Indexes — audit_events (queried by user, flow, event type, time)
    await audit_events().create_index([("ts", DESCENDING)])
    await audit_events().create_index([("flow_id", ASCENDING)])
    await audit_events().create_index([("request_id", ASCENDING)])
    await audit_events().create_index([("event", ASCENDING), ("ts", DESCENDING)])
    await audit_events().create_index([("user_id", ASCENDING), ("ts", DESCENDING)])
    await audit_events().create_index([("env", ASCENDING), ("ts", DESCENDING)])
    await audit_events().create_index([("outcome", ASCENDING), ("ts", DESCENDING)])

    # Indexes — app_logs (live tail + flow correlation + level filter)
    # Capped collections preserve insertion order, so natural sort handles live-tail.
    await app_logs().create_index([("flow_id", ASCENDING)])
    await app_logs().create_index([("request_id", ASCENDING)])
    await app_logs().create_index([("level", ASCENDING), ("ts", DESCENDING)])


async def ping() -> bool:
    """Quick reachability check (for /readyz)."""
    try:
        await get_client().admin.command("ping")
        return True
    except Exception:
        return False
