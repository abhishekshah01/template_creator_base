"""Mongo-backed admin sessions for the AWS S3 Navigate UI.

Login flow:
  1. Caller provides {account, username, password} — account may be either
     the 12-digit account_id or the @emergent.sh email.
  2. We look up the admin user, verify *username matches* (defends against
     someone guessing only the account), then bcrypt-verify the password.
  3. On success we mint a 32-byte opaque token, persist a row in
     admin_sessions with expires_at = now + 6h.

TTL is sliding 6h — every successful `require()` call extends the session.
Expired rows are background-deleted by Mongo's TTL monitor on `expires_at`.
Manual logout deletes the row immediately.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException

from clients.mongo_client import admin_sessions
from services import admin_users as users_svc

SESSION_TTL = timedelta(hours=6)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_expiry() -> datetime:
    return _now() + SESSION_TTL


def _serialize(session: dict, *, fresh_token: Optional[str] = None) -> dict:
    """Shape returned to callers of login()/require(). Includes admin_id (ObjectId)
    for downstream handlers; the wire response schema strips it before send.
    """
    return {
        "token": fresh_token or session["token"],
        "admin_id": session["admin_id"],
        "username": session["username"],
        "account_id": session["account_id"],
        "email": session["email"],
        "expires_at": session["expires_at"].timestamp(),
    }


async def login(account: str, username: str, password: str) -> dict:
    """Authenticate and mint a session. Raises 401 on any credential mismatch."""
    # Deliberately vague error message — don't leak which field is wrong.
    generic_401 = HTTPException(401, "Invalid account, username, or password.")

    if not account or not username or not password:
        raise generic_401

    admin = await users_svc.find_by_account_or_email(account)
    if not admin or not admin.get("is_active", True):
        raise generic_401
    if admin.get("username") != username:
        raise generic_401
    if not await users_svc.verify_password(password, admin["password_hash"]):
        raise generic_401

    token = secrets.token_urlsafe(32)
    now = _now()
    session = {
        "token": token,
        "admin_id": admin["_id"],
        "account_id": admin["account_id"],
        "email": admin["email"],
        "username": admin["username"],
        "created_at": now,
        "last_seen_at": now,
        "expires_at": _new_expiry(),
    }
    await admin_sessions.insert_one(session)
    await users_svc.mark_logged_in(admin["_id"])
    return _serialize(session)


async def require(token: Optional[str]) -> dict:
    """Validate the token and slide the TTL. 401 if missing / expired / revoked."""
    if not token:
        raise HTTPException(401, "Sign in required.")

    session = await admin_sessions.find_one({"token": token})
    if not session:
        raise HTTPException(401, "Session expired. Sign in again.")

    now = _now()
    expires_at = session.get("expires_at")
    # Mongo's TTL monitor runs ~60s, so a row may still be present briefly after expiry.
    if not isinstance(expires_at, datetime) or expires_at <= now:
        await admin_sessions.delete_one({"token": token})
        raise HTTPException(401, "Session expired. Sign in again.")

    new_expiry = _new_expiry()
    await admin_sessions.update_one(
        {"token": token},
        {"$set": {"last_seen_at": now, "expires_at": new_expiry}},
    )
    session["expires_at"] = new_expiry
    return _serialize(session)


async def logout(token: Optional[str]) -> None:
    if not token:
        return
    await admin_sessions.delete_one({"token": token})
