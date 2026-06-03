"""Mongo-backed sessions for the S3 Navigate gate.

A session row carries user_id (FK into users) and type so the authenticated
identity is available without an extra lookup. TTL is a sliding 6h — every
successful authenticate_token() extends it; Mongo's TTL monitor deletes expired
rows on `expires_at`.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from dal import session_repository
from exceptions import AuthenticationRequiredError, SessionExpiredError
from services import user_service

SESSION_TTL = timedelta(hours=6)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _next_expiry() -> datetime:
    return _now() + SESSION_TTL


def _to_session_payload(session: dict, *, fresh_token: Optional[str] = None) -> dict:
    return {
        "token": fresh_token or session["token"],
        "user_id": session["user_id"],
        "type": session.get("type", "admin"),
        "username": session["username"],
        "account_id": session.get("account_id"),
        "email": session.get("email"),
        "expires_at": session["expires_at"].timestamp(),
    }


async def login(account: str, username: str, password: str) -> dict:
    # Deliberately vague message — never leak which field was wrong.
    invalid_credentials = AuthenticationRequiredError("Invalid account, username, or password.")

    if not account or not username or not password:
        raise invalid_credentials

    user = await user_service.find_user_by_account_or_email(account)
    if not user or not user.get("is_active", True):
        raise invalid_credentials
    if user.get("username") != username:
        raise invalid_credentials
    if not await user_service.verify_password(password, user["password_hash"]):
        raise invalid_credentials

    now = _now()
    session = {
        "token": secrets.token_urlsafe(32),
        "user_id": user["_id"],
        "type": user.get("type", "admin"),
        "account_id": user["account_id"],
        "email": user["email"],
        "username": user["username"],
        "created_at": now,
        "last_seen_at": now,
        "expires_at": _next_expiry(),
    }
    await session_repository.insert_session(session)
    await user_service.mark_user_logged_in(user["_id"])
    return _to_session_payload(session)


async def authenticate_token(token: Optional[str]) -> dict:
    if not token:
        raise AuthenticationRequiredError()

    session = await session_repository.find_session_by_token(token)
    if not session:
        raise SessionExpiredError()

    now = _now()
    expires_at = session.get("expires_at")
    # The TTL monitor runs ~every 60s, so a row can linger briefly after expiry.
    if not isinstance(expires_at, datetime) or expires_at <= now:
        await session_repository.delete_session_by_token(token)
        raise SessionExpiredError()

    new_expiry = _next_expiry()
    await session_repository.slide_session_expiry(token, now, new_expiry)
    session["expires_at"] = new_expiry
    return _to_session_payload(session)


async def logout(token: Optional[str]) -> None:
    if not token:
        return
    await session_repository.delete_session_by_token(token)
