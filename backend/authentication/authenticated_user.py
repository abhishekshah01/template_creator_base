"""The authenticated identity injected into every gated route.

`AuthenticatedUser.require_user` is the FastAPI dependency: it validates the
session token, loads the user's type and policy, and returns this object. Routes
then call `require_permission(action, resource)` or `require_owner()`, which
evaluate, write an audit row, and raise on denial (when enforcement is on).
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import Header, Request

import config
from exceptions import AuthenticationRequiredError, ForbiddenError, PermissionDeniedError
from services import session_service, user_service
from services.access_control import access_audit_service, access_evaluator


class AuthenticatedUser:
    def __init__(
        self,
        *,
        user_id,
        user_type: str,
        username: Optional[str],
        account_id: Optional[str],
        email: Optional[str],
        token: Optional[str],
        attached_roles: list[str],
        inline_policy: list,
        request: Optional[Request] = None,
    ) -> None:
        self.user_id = user_id
        self.user_type = user_type
        self.username = username
        self.account_id = account_id
        self.email = email
        self.token = token
        self.attached_roles = attached_roles
        self.inline_policy = inline_policy
        self._request = request

    @classmethod
    async def require_user(
        cls,
        request: Request,
        x_auth_token: Optional[str] = Header(default=None),
    ) -> "AuthenticatedUser":
        session = await session_service.authenticate_token(x_auth_token)
        user = await user_service.get_user_by_id(session["user_id"])
        if not user:
            raise AuthenticationRequiredError("Account no longer exists. Sign in again.")
        return cls(
            user_id=session["user_id"],
            user_type=user.get("type", "admin"),
            username=session.get("username"),
            account_id=session.get("account_id"),
            email=session.get("email"),
            token=session.get("token"),
            attached_roles=user.get("attached_roles", []),
            inline_policy=user.get("inline_policy", []),
            request=request,
        )

    async def require_permission(self, action, resource: str) -> None:
        context = self._as_evaluator_context()
        decision = await access_evaluator.evaluate_access(context, str(action), resource)
        await access_audit_service.record_access_decision(
            user=context,
            action=str(action),
            resource=resource,
            decision=decision,
            route=self._route(),
            request_id=self._request_id(),
        )
        if not decision.is_allowed and config.PERMISSIONS_ENFORCE:
            raise PermissionDeniedError(action=action, resource=resource, reason=decision.reason)

    def require_owner(self) -> None:
        if self.user_type != "owner":
            raise ForbiddenError("This action requires owner privileges.")

    async def effective_policy(self) -> list[dict]:
        return await access_evaluator.describe_effective_policy(self._as_evaluator_context())

    def _as_evaluator_context(self) -> dict:
        return {
            "type": self.user_type,
            "attached_roles": self.attached_roles,
            "inline_policy": self.inline_policy,
            "user_id": self.user_id,
            "username": self.username,
        }

    def _route(self) -> Optional[str]:
        return self._request.url.path if self._request else None

    def _request_id(self) -> str:
        if self._request is None:
            return str(uuid.uuid4())
        return self._request.headers.get("x-request-id") or str(uuid.uuid4())
