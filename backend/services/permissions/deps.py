from __future__ import annotations

import uuid
from typing import Awaitable, Callable, Optional, Union

from fastapi import Depends, HTTPException, Request

import config
from routers.admin_auth import get_current_admin
from services import admin_users as users_svc
from services.permissions import audit, evaluator


ResourceFn = Union[
    Callable[[Request], str],
    Callable[[Request], Awaitable[str]],
    str,
]


async def resolve_resource(resource_fn: ResourceFn, request: Request) -> str:
    if isinstance(resource_fn, str):
        return resource_fn
    out = resource_fn(request)
    if hasattr(out, "__await__"):
        out = await out
    return str(out)


async def resolve_user(session: dict) -> dict:
    """Load the full user (with type/attached_roles/inline_policy) for the
    authenticated session. The session itself was produced by
    admin_auth_service.require() — it validates the X-Admin-Token header
    against the admin_sessions Mongo collection and carries only auth
    fields, not RBAC ones."""
    if not session:
        raise HTTPException(401, "Sign in required.")
    if "type" in session and "attached_roles" in session:
        return session
    user_id = session.get("user_id") or session.get("admin_id")
    if not user_id:
        raise HTTPException(401, "Sign in required.")
    user_doc = await users_svc.find_by_id(user_id)
    if not user_doc:
        raise HTTPException(401, "Account no longer exists. Sign in again.")
    return {
        **session,
        "_id": user_doc.get("_id"),
        "type": user_doc.get("type"),
        "attached_roles": user_doc.get("attached_roles", []),
        "inline_policy": user_doc.get("inline_policy", []),
        "is_admin": user_doc.get("is_admin", False),
        "is_active": user_doc.get("is_active", True),
    }


async def authorize(session: dict, action: str, resource: str, request: Request) -> None:
    """Resolve the user, evaluate (action, resource), write one audit row,
    raise 403 when denied AND enforcement is on."""
    user = await resolve_user(session)
    decision = await evaluator.evaluate(user, action, resource)

    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())

    await audit.record(
        user=user,
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


def require(action: str, resource_fn: ResourceFn):
    """FastAPI dependency factory: enforces (action, resource) on each request."""
    async def dep(
        request: Request,
        session: dict = Depends(get_current_admin),
    ) -> dict:
        resource = await resolve_resource(resource_fn, request)
        await authorize(session, action, resource, request)
        return session
    return dep


async def get_effective_policy(user: Optional[dict]) -> list[dict]:
    if not user:
        return []
    if user.get("type") == "owner" or user.get("is_admin") is True:
        return [{"effect": "allow", "actions": ["*"], "resources": ["*"]}]
    stmts = await evaluator.collect_statements(user)
    return [s.model_dump() for s in stmts]
