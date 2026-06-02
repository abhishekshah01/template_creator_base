"""permission_audit writes. Every evaluate() result becomes one row so
both allows and denies are recoverable later — log-only failures are
swallowed so a transient Mongo hiccup never turns into a 500."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from clients.mongo_client import permission_audit
from schemas.permissions import Decision

log = logging.getLogger(__name__)


def _user_id(user: dict) -> Optional[object]:
    raw = user.get("_id") or user.get("admin_id")
    if raw is None:
        return None
    if isinstance(raw, ObjectId):
        return raw
    try:
        return ObjectId(str(raw))
    except Exception:
        return str(raw)


async def record(
    *,
    user: dict,
    action: str,
    resource: str,
    decision: Decision,
    route: Optional[str] = None,
    request_id: Optional[str] = None,
) -> None:
    doc = {
        "ts": datetime.now(timezone.utc),
        "user_id": _user_id(user) if user else None,
        "username": user.get("username") if user else None,
        "user_type": user.get("type") if user else None,
        "action": action,
        "resource": resource,
        "decision": decision.effect,
        "reason": decision.reason,
        "route": route,
        "request_id": request_id,
    }
    try:
        await permission_audit.insert_one(doc)
    except Exception as exc:
        # Audit failure must never break the request path. The reason for
        # the decision was already logged by the evaluator at debug level.
        log.warning("permissions.audit: insert failed: %s", exc)
