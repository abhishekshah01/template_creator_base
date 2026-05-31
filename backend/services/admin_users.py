"""Admin user CRUD + credential validation.

Source of truth: the `admin_users` collection in Mongo. Passwords are stored
as bcrypt hashes; all hashing/verification runs on a thread so the event loop
isn't blocked.

This module is *not* responsible for sessions — see admin_auth_service.py.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException

from clients.mongo_client import admin_users

# --- validation ---------------------------------------------------------------

_ACCOUNT_ID_RE = re.compile(r"^\d{12}$")
_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@emergent\.sh$", re.IGNORECASE)
_USERNAME_RE = re.compile(r"^[A-Za-z0-9._\-]{2,64}$")

# Password policy chosen earlier in the design conversation: min 8 chars, must
# contain at least one upper, lower, and digit. No special-char requirement —
# length matters more, and we still permit them.
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


# --- bcrypt (CPU-bound — wrap in to_thread) ----------------------------------

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


# --- queries -----------------------------------------------------------------

async def find_by_account_or_email(value: str) -> Optional[dict]:
    """Look up an admin by account_id OR email. `value` may be either."""
    if not value:
        return None
    v = value.strip()
    return await admin_users.find_one(
        {"$or": [{"account_id": v}, {"email": v.lower()}]}
    )


async def find_by_id(user_id) -> Optional[dict]:
    return await admin_users.find_one({"_id": user_id})


async def mark_logged_in(user_id) -> None:
    await admin_users.update_one(
        {"_id": user_id},
        {"$set": {"last_login_at": datetime.now(timezone.utc)}},
    )


# --- create (used by the bootstrap CLI) --------------------------------------

async def create_admin(
    *,
    account_id: str,
    email: str,
    username: str,
    password: str,
) -> dict:
    """Validate, hash, and insert. Returns the inserted doc (sans password_hash)."""
    account_id = validate_account_id(account_id)
    email = validate_email(email)
    username = validate_username(username)
    validate_password(password)

    now = datetime.now(timezone.utc)
    doc = {
        "account_id": account_id,
        "email": email,
        "username": username,
        "password_hash": await hash_password(password),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    }
    try:
        result = await admin_users.insert_one(doc)
    except Exception as e:
        # DuplicateKeyError on account_id/email/username unique indexes
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
