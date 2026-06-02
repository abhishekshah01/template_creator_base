"""Async MongoDB singleton.

Owns the `AsyncIOMotorClient` instance and the named collections so services
can `from clients.mongo_client import template_jobs` instead of constructing
their own client.
"""

from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient

import config

_client: AsyncIOMotorClient = AsyncIOMotorClient(config.MONGO_URL, tz_aware=True)
_db = _client[config.DB_NAME]

template_jobs = _db["template_jobs"]
admin_users = _db["admin_users"]
admin_sessions = _db["admin_sessions"]
roles = _db["roles"]
permission_audit = _db["permission_audit"]


async def ensure_indexes() -> None:
    """Create the indexes our services rely on. Idempotent — safe to call on every startup.

    Wired into main.py's lifespan so the indexes exist before the first request.
    """
    # admin_users: a given account_id / email / username can only exist once.
    await admin_users.create_index("account_id", unique=True)
    await admin_users.create_index("email", unique=True)
    await admin_users.create_index("username", unique=True)

    # admin_sessions: Mongo background-deletes expired rows within ~60s of expires_at.
    # `expireAfterSeconds: 0` means "expire at the timestamp in this field, no grace".
    await admin_sessions.create_index("expires_at", expireAfterSeconds=0)
    await admin_sessions.create_index("token", unique=True)

    await roles.create_index("name", unique=True)

    # No TTL on permission_audit — rows are kept indefinitely.
    await permission_audit.create_index([("user_id", 1), ("ts", -1)])
    await permission_audit.create_index([("ts", -1)])
    await permission_audit.create_index([("action", 1), ("ts", -1)])


async def aclose() -> None:
    """Close the Mongo client. Wired into main.py's lifespan shutdown."""
    _client.close()
