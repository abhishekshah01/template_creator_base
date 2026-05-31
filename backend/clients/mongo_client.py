"""Async MongoDB singleton.

Owns the `AsyncIOMotorClient` instance and the `template_jobs` collection so
services can `from clients.mongo_client import template_jobs` instead of
constructing their own client.
"""

from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient

import config

_client: AsyncIOMotorClient = AsyncIOMotorClient(config.MONGO_URL)
_db = _client[config.DB_NAME]

template_jobs = _db["template_jobs"]


async def aclose() -> None:
    """Close the Mongo client. Wired into main.py's lifespan shutdown."""
    _client.close()
