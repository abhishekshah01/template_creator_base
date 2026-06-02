"""FastAPI dependency factory: require(action, resource_fn).

  @router.post("/upload-url", dependencies=[Depends(require(S3_PUT_OBJECT, lambda req: f"s3://{req.bucket}/{req.key}"))])

evaluator.evaluate() is called for the current admin; the decision plus
its reason is written to permission_audit either way. If the decision is
deny AND PERMISSIONS_ENFORCE is on, raises HTTP 403. With the flag off,
the request continues — dry-run mode while we wire every route."""

from __future__ import annotations

import logging
import uuid
from typing import Awaitable, Callable, Optional, Union

from fastapi import Depends, HTTPException, Request

import config
from routers.admin_auth import get_current_admin
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
        out = await out  # type: ignore[assignment]
    return str(out)


def require(action: str, resource_fn: ResourceFn):
    async def dep(
        request: Request,
        user: dict = Depends(get_current_admin),
    ) -> dict:
        resource = await _resolve_resource(resource_fn, request)
        decision = await evaluator.evaluate(user, action, resource)

        request_id = (
            request.headers.get("x-request-id")
            or getattr(request.state, "request_id", None)
            or str(uuid.uuid4())
        )
        route = request.url.path

        await audit.record(
            user=user,
            action=action,
            resource=resource,
            decision=decision,
            route=route,
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
                action, resource, user.get("username"), decision.reason,
            )
        return user

    return dep


async def effective_policy(user: Optional[dict]) -> list[dict]:
    if not user:
        return []
    if user.get("type") == "owner" or user.get("is_admin") is True:
        return [{"effect": "allow", "actions": ["*"], "resources": ["*"]}]
    stmts = await evaluator.collect_statements(user)
    return [s.model_dump() for s in stmts]
