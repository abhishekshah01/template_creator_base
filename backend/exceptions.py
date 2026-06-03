"""Domain exceptions that map cleanly onto HTTP responses.

Routers and services raise these instead of bare HTTPException so the status
code and error shape for a given failure live in exactly one place.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException


class AuthenticationRequiredError(HTTPException):
    def __init__(self, message: str = "Sign in required.") -> None:
        super().__init__(status_code=401, detail=message)


class SessionExpiredError(HTTPException):
    def __init__(self, message: str = "Session expired. Sign in again.") -> None:
        super().__init__(status_code=401, detail=message)


class InvalidInputError(HTTPException):
    def __init__(self, message: str) -> None:
        super().__init__(status_code=400, detail=message)


class ResourceNotFoundError(HTTPException):
    def __init__(self, message: str) -> None:
        super().__init__(status_code=404, detail=message)


class DuplicateResourceError(HTTPException):
    def __init__(self, message: str) -> None:
        super().__init__(status_code=409, detail=message)


class PermissionDeniedError(HTTPException):
    """403 carrying the denied (action, resource) so the frontend can render a
    targeted banner instead of a generic auth error."""

    def __init__(self, action: Any, resource: str, reason: str) -> None:
        super().__init__(
            status_code=403,
            detail={
                "error": "permission_denied",
                "action": str(action),
                "resource": resource,
                "reason": reason,
            },
        )
