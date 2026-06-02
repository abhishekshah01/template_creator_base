"""Admin user CRUD + credential validation.

Source of truth: the `admin_users` collection in Mongo. Passwords are stored
as bcrypt hashes; all hashing/verification runs on a thread so the event loop
isn't blocked.

This module is *not* responsible for session lifecycle — see
admin_auth_service.py. It does delete an admin's sessions on deactivate /
hard delete so an admin can't keep using the app after losing access.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any, Optional

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

from clients.mongo_client import admin_sessions, admin_users

_ACCOUNT_ID_RE = re.compile(r"^\d{12}$")
_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@emergent\.sh$", re.IGNORECASE)
_USERNAME_RE = re.compile(r"^[A-Za-z0-9._\-]{2,64}$")

# Password policy: min 8 chars, must contain at least one upper, lower, digit.
_PW_UPPER = re.compile(r"[A-Z]")
_PW_LOWER = re.compile(r"[a-z]")
_PW_DIGIT = re.compile(r"\d")


def validate_account_id(account_id: str) -> str:
    if not _ACCOUNT_ID_RE.match(account_id or ""):
        raise HTTPException(400, "account_id must be exactly 12 digits.")
    return account_id


def validate_email(email: str) -> str:
    if not _EMAIL_RE.match(email or ""):
        raise HTTPException(400, "email must be a valid @emergent.sh address.")
    return email.lower()


def validate_username(username: str) -> str:
    if not _USERNAME_RE.match(username or ""):
        raise HTTPException(
            400,
            "username must be 2-64 chars, letters / digits / dot / underscore / hyphen.",
        )
    return username


def validate_password(password: str) -> None:
    """Raises 400 on policy violations. Returns None on success (no normalization)."""
    if not password or len(password) < 8:
        raise HTTPException(400, "password must be at least 8 characters.")
    if not _PW_UPPER.search(password):
        raise HTTPException(400, "password must contain an uppercase letter.")
    if not _PW_LOWER.search(password):
        raise HTTPException(400, "password must contain a lowercase letter.")
    if not _PW_DIGIT.search(password):
        raise HTTPException(400, "password must contain a digit.")


def to_object_id(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError):
        raise HTTPException(400, "Invalid admin id.") from None


async def hash_password(password: str) -> str:
    def _hash() -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    return await asyncio.to_thread(_hash)


async def verify_password(password: str, password_hash: str) -> bool:
    def _check() -> bool:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except (ValueError, TypeError):
            return False
    return await asyncio.to_thread(_check)


async def find_by_account_or_email(value: str) -> Optional[dict]:
    """Look up an admin by account_id OR email. `value` may be either."""
    if not value:
        return None
    v = value.strip()
    return await admin_users.find_one(
        {"$or": [{"account_id": v}, {"email": v.lower()}]}
    )


async def find_by_id(user_id: ObjectId) -> Optional[dict]:
    return await admin_users.find_one({"_id": user_id})


async def list_admins() -> list[dict]:
    """Newest first. Returns all admins (active + inactive). password_hash stripped."""
    cursor = admin_users.find().sort("created_at", -1)
    rows = await cursor.to_list(length=500)
    for r in rows:
        r.pop("password_hash", None)
    return rows


async def count_active(excluding_id: Optional[ObjectId] = None) -> int:
    q: dict[str, Any] = {"is_active": True}
    if excluding_id is not None:
        q["_id"] = {"$ne": excluding_id}
    return await admin_users.count_documents(q)


async def mark_logged_in(user_id: ObjectId) -> None:
    await admin_users.update_one(
        {"_id": user_id},
        {"$set": {"last_login_at": datetime.now(timezone.utc)}},
    )


async def revoke_sessions(user_id: ObjectId) -> int:
    """Delete every session for this admin. Returns the count deleted."""
    res = await admin_sessions.delete_many({"admin_id": user_id})
    return res.deleted_count


USER_TYPES: tuple[str, ...] = ("owner", "admin", "user")
USER_TYPE_DEFAULT_ROLE: dict[str, str] = {
    "owner": "owner-default",
    "admin": "admin-default",
    "user": "user-default",
}


def validate_user_type(user_type: str) -> str:
    if user_type not in USER_TYPES:
        raise HTTPException(400, f"type must be one of {USER_TYPES}.")
    return user_type


async def create_admin(
    *,
    account_id: str,
    email: str,
    username: str,
    password: str,
    user_type: str = "admin",
    created_by: Optional[ObjectId] = None,
) -> dict:
    """Validate, hash, and insert. Returns the inserted doc (sans password_hash)."""
    account_id = validate_account_id(account_id)
    email = validate_email(email)
    username = validate_username(username)
    validate_password(password)
    user_type = validate_user_type(user_type)

    now = datetime.now(timezone.utc)
    doc = {
        "account_id": account_id,
        "email": email,
        "username": username,
        "password_hash": await hash_password(password),
        "is_active": True,
        "type": user_type,
        "attached_roles": [USER_TYPE_DEFAULT_ROLE[user_type]],
        "inline_policy": [],
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
        "created_by": created_by,
        "updated_by": created_by,
    }
    try:
        result = await admin_users.insert_one(doc)
    except Exception as e:
        msg = str(e)
        if "account_id" in msg:
            raise HTTPException(409, "An admin with this account_id already exists.") from None
        if "email" in msg:
            raise HTTPException(409, "An admin with this email already exists.") from None
        if "username" in msg:
            raise HTTPException(409, "An admin with this username already exists.") from None
        raise

    doc["_id"] = result.inserted_id
    doc.pop("password_hash", None)
    return doc


async def update_admin(
    admin_id: ObjectId,
    *,
    email: Optional[str] = None,
    username: Optional[str] = None,
    is_active: Optional[bool] = None,
    actor_id: Optional[ObjectId] = None,
) -> dict:
    """Patch an admin row. Rejects last-active-admin deactivation.

    If `is_active` is being flipped to False, the caller is responsible for
    enforcing self-deactivate semantics. This function only guards against the
    "last admin" lockout.
    """
    target = await find_by_id(admin_id)
    if not target:
        raise HTTPException(404, "Admin not found.")

    patches: dict[str, Any] = {}
    if email is not None:
        patches["email"] = validate_email(email)
    if username is not None:
        patches["username"] = validate_username(username)
    if is_active is not None:
        patches["is_active"] = bool(is_active)
        if not is_active and target.get("is_active", True):
            # Block if this would leave zero active admins.
            others = await count_active(excluding_id=admin_id)
            if others == 0:
                raise HTTPException(
                    409,
                    "Cannot deactivate the last active admin. Promote another admin first.",
                )

    if not patches:
        return _strip_secret(target)

    patches["updated_at"] = datetime.now(timezone.utc)
    if actor_id is not None:
        patches["updated_by"] = actor_id

    try:
        await admin_users.update_one({"_id": admin_id}, {"$set": patches})
    except Exception as e:
        msg = str(e)
        if "email" in msg:
            raise HTTPException(409, "Another admin already uses this email.") from None
        if "username" in msg:
            raise HTTPException(409, "Another admin already uses this username.") from None
        raise

    # If we just deactivated, kill every session for them.
    if patches.get("is_active") is False:
        await revoke_sessions(admin_id)

    updated = await find_by_id(admin_id)
    return _strip_secret(updated or {})


async def reset_password(
    admin_id: ObjectId,
    new_password: str,
    *,
    actor_id: Optional[ObjectId] = None,
    revoke_other_sessions: bool = True,
) -> None:
    """Hash + set new password. Also kills the target's other sessions by default."""
    validate_password(new_password)
    target = await find_by_id(admin_id)
    if not target:
        raise HTTPException(404, "Admin not found.")

    patches = {
        "password_hash": await hash_password(new_password),
        "updated_at": datetime.now(timezone.utc),
    }
    if actor_id is not None:
        patches["updated_by"] = actor_id

    await admin_users.update_one({"_id": admin_id}, {"$set": patches})

    if revoke_other_sessions:
        await revoke_sessions(admin_id)


def _strip_secret(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("password_hash", None)
    return doc


async def ensure_rbac_fields() -> int:
    """Backfill type/attached_roles/inline_policy on docs that predate
    PR3. Idempotent — only touches docs where `type` is missing, so a
    manually emptied attached_roles list is preserved."""
    res = await admin_users.update_many(
        {"type": {"$exists": False}},
        {
            "$set": {
                "type": "admin",
                "attached_roles": [USER_TYPE_DEFAULT_ROLE["admin"]],
                "inline_policy": [],
            }
        },
    )
    return res.modified_count
