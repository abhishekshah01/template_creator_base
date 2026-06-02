"""Role CRUD. System roles are owned by services/permissions/seed.py and
cannot be edited via the API — that constraint is enforced here so the
admin endpoints can't drift from it."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException

from clients.mongo_client import roles as roles_coll
from schemas.permissions import Role, Statement


async def list_roles() -> list[dict]:
    cursor = roles_coll.find().sort("name", 1)
    return await cursor.to_list(length=500)


async def get_role(name: str) -> Optional[dict]:
    return await roles_coll.find_one({"name": name})


async def create_role(name: str, description: str, policy: list[Statement]) -> dict:
    if not name or "*" in name or "/" in name:
        raise HTTPException(400, "role name must be non-empty and contain no '*' or '/' characters.")
    existing = await roles_coll.find_one({"name": name})
    if existing:
        raise HTTPException(409, f"A role named '{name}' already exists.")
    Role(name=name, description=description, policy=policy)
    now = datetime.now(timezone.utc)
    doc = {
        "name": name,
        "description": description,
        "is_system": False,
        "policy": [s.model_dump() for s in policy],
        "created_at": now,
        "updated_at": now,
    }
    await roles_coll.insert_one(doc)
    return doc


async def update_role(
    name: str,
    *,
    description: Optional[str] = None,
    policy: Optional[list[Statement]] = None,
) -> dict:
    existing = await roles_coll.find_one({"name": name})
    if not existing:
        raise HTTPException(404, f"role '{name}' not found.")
    if existing.get("is_system"):
        raise HTTPException(403, f"role '{name}' is a system role — edit services/permissions/seed.py instead.")

    patches: dict = {"updated_at": datetime.now(timezone.utc)}
    if description is not None:
        patches["description"] = description
    if policy is not None:
        Role(name=name, description=description or existing.get("description", ""), policy=policy)
        patches["policy"] = [s.model_dump() for s in policy]

    await roles_coll.update_one({"name": name}, {"$set": patches})
    return await roles_coll.find_one({"name": name})


async def delete_role(name: str) -> None:
    existing = await roles_coll.find_one({"name": name})
    if not existing:
        raise HTTPException(404, f"role '{name}' not found.")
    if existing.get("is_system"):
        raise HTTPException(403, f"role '{name}' is a system role and cannot be deleted.")
    await roles_coll.delete_one({"name": name})


async def role_exists(name: str) -> bool:
    return await roles_coll.find_one({"name": name}, {"_id": 1}) is not None
