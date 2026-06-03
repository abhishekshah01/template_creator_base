"""Persistence for the `roles` collection."""

from __future__ import annotations

from typing import Optional

from clients.mongo_client import roles


async def list_roles_alphabetical(limit: int = 500) -> list[dict]:
    cursor = roles.find().sort("name", 1)
    return await cursor.to_list(length=limit)


async def find_role_by_name(name: str) -> Optional[dict]:
    return await roles.find_one({"name": name})


async def find_roles_by_names(names: list[str]) -> list[dict]:
    if not names:
        return []
    cursor = roles.find({"name": {"$in": names}})
    return await cursor.to_list(length=len(names))


async def role_exists(name: str) -> bool:
    return await roles.find_one({"name": name}, {"_id": 1}) is not None


async def insert_role(document: dict) -> None:
    await roles.insert_one(document)


async def update_role_fields(name: str, fields: dict) -> None:
    await roles.update_one({"name": name}, {"$set": fields})


async def delete_role_by_name(name: str) -> None:
    await roles.delete_one({"name": name})
