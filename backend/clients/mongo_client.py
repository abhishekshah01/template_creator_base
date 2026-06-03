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
# One collection for every user type (owner / admin / user).
users = _db["users"]
user_sessions = _db["user_sessions"]
roles = _db["roles"]
permission_audit = _db["permission_audit"]


async def ensure_indexes() -> None:
    """Create the indexes our services rely on. Idempotent — safe to call on every startup.

    Wired into main.py's lifespan so the indexes exist before the first request.
    """
    # users: a given account_id / email / username can only exist once.
    await users.create_index("account_id", unique=True)
    await users.create_index("email", unique=True)
    await users.create_index("username", unique=True)

    # user_sessions: Mongo background-deletes expired rows within ~60s of expires_at.
    # `expireAfterSeconds: 0` means "expire at the timestamp in this field, no grace".
    await user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await user_sessions.create_index("token", unique=True)

    await roles.create_index("name", unique=True)

    # permission_audit rows are kept indefinitely; index the common lookups.
    await permission_audit.create_index([("user_id", 1), ("ts", -1)])
    await permission_audit.create_index([("ts", -1)])
    await permission_audit.create_index([("action", 1), ("ts", -1)])


async def aclose() -> None:
    """Close the Mongo client. Wired into main.py's lifespan shutdown."""
    _client.close()
