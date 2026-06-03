"""Persistence for the `users` collection. Pure Mongo access — no validation,
hashing, or HTTP concerns (those live in services/user_service.py)."""

from __future__ import annotations

from typing import Any, Optional

from bson import ObjectId

from clients.mongo_client import users


async def find_user_by_id(user_id: ObjectId) -> Optional[dict]:
    return await users.find_one({"_id": user_id})


async def find_user_by_account_or_email(account_or_email: str) -> Optional[dict]:
    value = account_or_email.strip()
    return await users.find_one(
        {"$or": [{"account_id": value}, {"email": value.lower()}]}
    )


async def insert_user(document: dict) -> ObjectId:
    result = await users.insert_one(document)
    return result.inserted_id


async def update_user_fields(user_id: ObjectId, fields: dict) -> None:
    await users.update_one({"_id": user_id}, {"$set": fields})


async def list_users_newest_first(limit: int = 500) -> list[dict]:
    cursor = users.find().sort("created_at", -1)
    return await cursor.to_list(length=limit)


async def count_active_users(excluding_user_id: Optional[ObjectId] = None) -> int:
    query: dict[str, Any] = {"is_active": True}
    if excluding_user_id is not None:
        query["_id"] = {"$ne": excluding_user_id}
    return await users.count_documents(query)


async def add_roles_to_user(user_id: ObjectId, role_names: list[str], updated_at) -> None:
    await users.update_one(
        {"_id": user_id},
        {
            "$addToSet": {"attached_roles": {"$each": role_names}},
            "$set": {"updated_at": updated_at},
        },
    )


async def remove_roles_from_user(user_id: ObjectId, role_names: list[str], updated_at) -> None:
    await users.update_one(
        {"_id": user_id},
        {
            "$pull": {"attached_roles": {"$in": role_names}},
            "$set": {"updated_at": updated_at},
        },
    )
