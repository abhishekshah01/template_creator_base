"""User lifecycle and credential handling.

Owns validation, bcrypt hashing, and orchestration across repositories. One
`users` collection holds every type (owner / admin / user); the type and its
default role are assigned here at creation time.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Optional

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId

from dal import session_repository, user_repository
from exceptions import (
    ConflictError,
    DuplicateResourceError,
    InvalidInputError,
    ResourceNotFoundError,
)
from services.access_control.role_seeder import DEFAULT_ROLE_BY_USER_TYPE

USER_TYPES: tuple[str, ...] = ("owner", "admin", "user")

_ACCOUNT_ID_PATTERN = re.compile(r"^\d{12}$")
_EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+\-]+@emergent\.sh$", re.IGNORECASE)
_USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._\-]{2,64}$")
_HAS_UPPERCASE = re.compile(r"[A-Z]")
_HAS_LOWERCASE = re.compile(r"[a-z]")
_HAS_DIGIT = re.compile(r"\d")


def validate_account_id(account_id: str) -> str:
    if not _ACCOUNT_ID_PATTERN.match(account_id or ""):
        raise InvalidInputError("account_id must be exactly 12 digits.")
    return account_id


def validate_email(email: str) -> str:
    if not _EMAIL_PATTERN.match(email or ""):
        raise InvalidInputError("email must be a valid @emergent.sh address.")
    return email.lower()


def validate_username(username: str) -> str:
    if not _USERNAME_PATTERN.match(username or ""):
        raise InvalidInputError("username must be 2-64 chars: letters, digits, dot, underscore, or hyphen.")
    return username


def validate_password(password: str) -> None:
    if not password or len(password) < 8:
        raise InvalidInputError("password must be at least 8 characters.")
    if not _HAS_UPPERCASE.search(password):
        raise InvalidInputError("password must contain an uppercase letter.")
    if not _HAS_LOWERCASE.search(password):
        raise InvalidInputError("password must contain a lowercase letter.")
    if not _HAS_DIGIT.search(password):
        raise InvalidInputError("password must contain a digit.")


def validate_user_type(user_type: str) -> str:
    if user_type not in USER_TYPES:
        raise InvalidInputError(f"type must be one of {USER_TYPES}.")
    return user_type


def parse_user_id(raw_user_id: str) -> ObjectId:
    try:
        return ObjectId(raw_user_id)
    except (InvalidId, TypeError):
        raise InvalidInputError("Invalid user id.") from None


async def hash_password(plaintext: str) -> str:
    def _hash() -> str:
        return bcrypt.hashpw(plaintext.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

    return await asyncio.to_thread(_hash)


async def verify_password(plaintext: str, password_hash: str) -> bool:
    def _check() -> bool:
        try:
            return bcrypt.checkpw(plaintext.encode("utf-8"), password_hash.encode("utf-8"))
        except (ValueError, TypeError):
            return False

    return await asyncio.to_thread(_check)


async def find_user_by_account_or_email(account_or_email: str) -> Optional[dict]:
    if not account_or_email:
        return None
    return await user_repository.find_user_by_account_or_email(account_or_email)


async def get_user_by_id(user_id: ObjectId) -> Optional[dict]:
    return await user_repository.find_user_by_id(user_id)


async def list_users() -> list[dict]:
    users = await user_repository.list_users_newest_first()
    for user in users:
        user.pop("password_hash", None)
    return users


async def mark_user_logged_in(user_id: ObjectId) -> None:
    await user_repository.update_user_fields(user_id, {"last_login_at": datetime.now(timezone.utc)})


async def revoke_user_sessions(user_id: ObjectId) -> int:
    return await session_repository.delete_sessions_for_user(user_id)


async def create_user(
    *,
    account_id: str,
    email: str,
    username: str,
    password: str,
    user_type: str = "admin",
    created_by: Optional[ObjectId] = None,
) -> dict:
    account_id = validate_account_id(account_id)
    email = validate_email(email)
    username = validate_username(username)
    validate_password(password)
    user_type = validate_user_type(user_type)

    now = datetime.now(timezone.utc)
    document = {
        "account_id": account_id,
        "email": email,
        "username": username,
        "password_hash": await hash_password(password),
        "is_active": True,
        "type": user_type,
        "attached_roles": [DEFAULT_ROLE_BY_USER_TYPE[user_type]],
        "inline_policy": [],
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
        "created_by": created_by,
        "updated_by": created_by,
    }
    try:
        document["_id"] = await user_repository.insert_user(document)
    except Exception as exc:
        raise _duplicate_user_error(str(exc)) from None

    document.pop("password_hash", None)
    return document


async def update_user(
    user_id: ObjectId,
    *,
    email: Optional[str] = None,
    username: Optional[str] = None,
    is_active: Optional[bool] = None,
    actor_id: Optional[ObjectId] = None,
) -> dict:
    target = await get_user_by_id(user_id)
    if not target:
        raise ResourceNotFoundError("User not found.")

    fields: dict = {}
    if email is not None:
        fields["email"] = validate_email(email)
    if username is not None:
        fields["username"] = validate_username(username)
    if is_active is not None:
        fields["is_active"] = bool(is_active)
        if not is_active and target.get("is_active", True):
            await _assert_not_last_active_user(user_id)

    if not fields:
        return _strip_password_hash(target)

    fields["updated_at"] = datetime.now(timezone.utc)
    if actor_id is not None:
        fields["updated_by"] = actor_id

    try:
        await user_repository.update_user_fields(user_id, fields)
    except Exception as exc:
        raise _duplicate_user_error(str(exc)) from None

    if fields.get("is_active") is False:
        await revoke_user_sessions(user_id)

    updated = await get_user_by_id(user_id)
    return _strip_password_hash(updated or {})


async def reset_user_password(
    user_id: ObjectId,
    new_password: str,
    *,
    actor_id: Optional[ObjectId] = None,
    revoke_other_sessions: bool = True,
) -> None:
    validate_password(new_password)
    target = await get_user_by_id(user_id)
    if not target:
        raise ResourceNotFoundError("User not found.")

    fields = {
        "password_hash": await hash_password(new_password),
        "updated_at": datetime.now(timezone.utc),
    }
    if actor_id is not None:
        fields["updated_by"] = actor_id

    await user_repository.update_user_fields(user_id, fields)
    if revoke_other_sessions:
        await revoke_user_sessions(user_id)


async def _assert_not_last_active_user(user_id: ObjectId) -> None:
    remaining_active = await user_repository.count_active_users(excluding_user_id=user_id)
    if remaining_active == 0:
        raise ConflictError("Cannot deactivate the last active user. Promote another user first.")


def _duplicate_user_error(message: str) -> DuplicateResourceError:
    if "account_id" in message:
        return DuplicateResourceError("A user with this account_id already exists.")
    if "email" in message:
        return DuplicateResourceError("A user with this email already exists.")
    if "username" in message:
        return DuplicateResourceError("A user with this username already exists.")
    return DuplicateResourceError("A user with these details already exists.")


def _strip_password_hash(user: dict) -> dict:
    if not user:
        return user
    user = dict(user)
    user.pop("password_hash", None)
    return user
