from __future__ import annotations

import logging
import uuid
from typing import Awaitable, Callable, Optional, Union

from fastapi import Depends, HTTPException, Request

import config
from routers.admin_auth import get_current_admin
from services import admin_users as users_svc
from services.permissions import audit, evaluator

log = logging.getLogger(__name__)


ResourceFn = Union[
    Callable[[Request], str],
    Callable[[Request], Awaitable[str]],
    str,
]


async def _resolve_resource(resource_fn: ResourceFn, request: Request) -> str:
    if isinstance(resource_fn, str):
        return resource_fn
    out = resource_fn(request)
    if hasattr(out, "__await__"):
        out = await out
    return str(out)


async def load_actor(session: dict) -> dict:
    if not session:
        return session
    # Session already enriched (test fixtures or future cache).
    if "type" in session and "attached_roles" in session:
        return session
    admin_id = session.get("admin_id")
    if not admin_id:
        return session
    doc = await users_svc.find_by_id(admin_id)
    if not doc:
        return session
    return {
        **session,
        "_id": doc.get("_id"),
        "type": doc.get("type"),
        "attached_roles": doc.get("attached_roles", []),
        "inline_policy": doc.get("inline_policy", []),
        "is_admin": doc.get("is_admin", False),
        "is_active": doc.get("is_active", True),
    }


async def check(user: dict, action: str, resource: str, request: Request) -> None:
    actor = await load_actor(user)
    decision = await evaluator.evaluate(actor, action, resource)

    request_id = (
        request.headers.get("x-request-id")
        or getattr(request.state, "request_id", None)
        or str(uuid.uuid4())
    )

    await audit.record(
        user=actor,
        action=action,
        resource=resource,
        decision=decision,
        route=request.url.path,
        request_id=request_id,
    )

    if not decision.allowed and config.PERMISSIONS_ENFORCE:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "permission_denied",
                "action": action,
                "resource": resource,
                "reason": decision.reason,
            },
        )

    if not decision.allowed:
        log.info(
            "permissions.dry_run: deny would have fired action=%s resource=%s user=%s reason=%s",
            action, resource, actor.get("username"), decision.reason,
        )


def require(action: str, resource_fn: ResourceFn):
    async def dep(
        request: Request,
        user: dict = Depends(get_current_admin),
    ) -> dict:
        resource = await _resolve_resource(resource_fn, request)
        await check(user, action, resource, request)
        return user

    return dep


async def effective_policy(user: Optional[dict]) -> list[dict]:
    if not user:
        return []
    if user.get("type") == "owner" or user.get("is_admin") is True:
        return [{"effect": "allow", "actions": ["*"], "resources": ["*"]}]
    stmts = await evaluator.collect_statements(user)
    return [s.model_dump() for s in stmts]
