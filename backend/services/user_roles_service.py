"""Attach/detach roles + manage inline_policy on a user doc."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Optional

from bson import ObjectId
from fastapi import HTTPException

from clients.mongo_client import admin_users
from schemas.permissions import Statement
from services import role_service


async def _assert_user_exists(user_id: ObjectId) -> dict:
    doc = await admin_users.find_one({"_id": user_id})
    if not doc:
        raise HTTPException(404, "user not found.")
    return doc


async def _assert_roles_exist(names: Iterable[str]) -> None:
    for n in names:
        if not await role_service.role_exists(n):
            raise HTTPException(400, f"role '{n}' does not exist.")


async def attach_roles(user_id: ObjectId, names: list[str]) -> dict:
    if not names:
        raise HTTPException(400, "names list is empty.")
    await _assert_user_exists(user_id)
    await _assert_roles_exist(names)
    await admin_users.update_one(
        {"_id": user_id},
        {
            "$addToSet": {"attached_roles": {"$each": names}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return await admin_users.find_one({"_id": user_id})


async def detach_roles(user_id: ObjectId, names: list[str]) -> dict:
    if not names:
        raise HTTPException(400, "names list is empty.")
    user = await _assert_user_exists(user_id)
    # The *-default role tracks the user's type, so detaching it would
    # let admins partially demote owners/admins/users by hand. Refuse it
    # — they should change the user's type instead.
    user_type = user.get("type", "admin")
    default_role = {
        "owner": "owner-default",
        "admin": "admin-default",
        "user": "user-default",
    }.get(user_type)
    if default_role and default_role in names:
        raise HTTPException(
            400,
            f"cannot detach '{default_role}' — change the user's type instead.",
        )

    await admin_users.update_one(
        {"_id": user_id},
        {
            "$pull": {"attached_roles": {"$in": names}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return await admin_users.find_one({"_id": user_id})


async def set_inline_policy(user_id: ObjectId, policy: list[Statement]) -> dict:
    await _assert_user_exists(user_id)
    # Statement validators already ran via the request schema, but defending
    # in depth — re-validate here so nobody can slip through with a raw dict.
    serialised = [Statement(**s.model_dump()).model_dump() for s in policy]
    await admin_users.update_one(
        {"_id": user_id},
        {
            "$set": {
                "inline_policy": serialised,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return await admin_users.find_one({"_id": user_id})
