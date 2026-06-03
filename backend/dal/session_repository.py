"""Persistence for the `user_sessions` collection."""

from __future__ import annotations

from typing import Optional

from bson import ObjectId

from clients.mongo_client import user_sessions


async def insert_session(document: dict) -> None:
    await user_sessions.insert_one(document)


async def find_session_by_token(token: str) -> Optional[dict]:
    return await user_sessions.find_one({"token": token})


async def slide_session_expiry(token: str, last_seen_at, expires_at) -> None:
    await user_sessions.update_one(
        {"token": token},
        {"$set": {"last_seen_at": last_seen_at, "expires_at": expires_at}},
    )


async def delete_session_by_token(token: str) -> None:
    await user_sessions.delete_one({"token": token})


async def delete_sessions_for_user(user_id: ObjectId) -> int:
    result = await user_sessions.delete_many({"user_id": user_id})
    return result.deleted_count
