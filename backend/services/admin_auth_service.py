"""Admin auth gate for the AWS S3 Navigate browser.

Single shared admin credential (ADMIN_USERNAME / ADMIN_PASSWORD env vars).
On successful login we mint an opaque token kept in process memory; the
frontend stores it in localStorage and sends it via the X-Admin-Token header.

TTL is sliding 24h — any successful `me()` call refreshes the expiry. Tokens
are lost on backend restart, which forces a re-login (acceptable for an
internal tool).
"""

from __future__ import annotations

import asyncio
import os
import secrets
import time
from typing import Optional

from fastapi import HTTPException

_sessions: dict[str, dict] = {}
_sessions_lock = asyncio.Lock()


def _get_creds() -> tuple[str, str]:
    """Read creds at call time so env var changes (and import-order quirks) don't bite."""
    return os.environ.get("ADMIN_USERNAME", ""), os.environ.get("ADMIN_PASSWORD", "")


def _get_ttl_seconds() -> int:
    return int(os.environ.get("ADMIN_SESSION_TTL_SECONDS", str(24 * 60 * 60)))


async def login(username: str, password: str) -> dict:
    admin_username, admin_password = _get_creds()
    if not (admin_username and admin_password):
        raise HTTPException(
            503,
            "Admin auth not configured (set ADMIN_USERNAME / ADMIN_PASSWORD in backend/.env).",
        )
    ok_user = secrets.compare_digest(username or "", admin_username)
    ok_pass = secrets.compare_digest(password or "", admin_password)
    if not (ok_user and ok_pass):
        raise HTTPException(401, "Invalid username or password.")

    token = secrets.token_urlsafe(32)
    expires_at = time.time() + _get_ttl_seconds()
    async with _sessions_lock:
        _sessions[token] = {"username": username, "expires_at": expires_at}
    return {"token": token, "username": username, "expires_at": expires_at}


async def require(token: Optional[str]) -> dict:
    """Validate the token; refresh TTL sliding. Raise 401 on missing/expired."""
    if not token:
        raise HTTPException(401, "Sign in required.")
    async with _sessions_lock:
        session = _sessions.get(token)
        if not session:
            raise HTTPException(401, "Session expired. Sign in again.")
        if time.time() > session["expires_at"]:
            _sessions.pop(token, None)
            raise HTTPException(401, "Session expired. Sign in again.")
        session["expires_at"] = time.time() + _get_ttl_seconds()
        return {
            "token": token,
            "username": session["username"],
            "expires_at": session["expires_at"],
        }


async def logout(token: Optional[str]) -> None:
    if not token:
        return
    async with _sessions_lock:
        _sessions.pop(token, None)
