"""Writes one permission_audit row per access decision so both allows and
denies are recoverable later. Audit failures are swallowed — a transient Mongo
hiccup must never turn a request into a 500."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from dal import access_audit_repository
from schemas.policy import AccessDecision

log = logging.getLogger(__name__)


def _coerce_user_id(user: dict) -> Optional[object]:
    raw_user_id = user.get("user_id") or user.get("_id")
    if raw_user_id is None:
        return None
    if isinstance(raw_user_id, ObjectId):
        return raw_user_id
    try:
        return ObjectId(str(raw_user_id))
    except Exception:
        return str(raw_user_id)


async def record_access_decision(
    *,
    user: dict,
    action: str,
    resource: str,
    decision: AccessDecision,
    route: Optional[str] = None,
    request_id: Optional[str] = None,
) -> None:
    entry = {
        "ts": datetime.now(timezone.utc),
        "user_id": _coerce_user_id(user) if user else None,
        "username": user.get("username") if user else None,
        "user_type": user.get("type") if user else None,
        "action": str(action),
        "resource": resource,
        "decision": decision.effect,
        "reason": decision.reason,
        "route": route,
        "request_id": request_id,
    }
    try:
        await access_audit_repository.insert_audit_entry(entry)
    except Exception as exc:
        log.warning("access_audit: insert failed: %s", exc)
