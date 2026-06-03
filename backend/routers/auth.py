"""/api/auth/* — the session gate for the S3 Navigate UI plus user management.

Every gated route depends on AuthenticatedUser.require_user, which validates the
X-Auth-Token header and returns the caller's identity.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Header

from authentication.authenticated_user import AuthenticatedUser
from exceptions import ResourceNotFoundError
from schemas.auth import (
    CreateUserRequest,
    LoginRequest,
    ResetPasswordRequest,
    SessionResponse,
    UpdateUserRequest,
    UserListResponse,
    UserPermissionsResponse,
    UserResponse,
)
from services import session_service, user_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=SessionResponse)
async def login(request: LoginRequest) -> SessionResponse:
    session = await session_service.login(request.account, request.username, request.password)
    return _to_session_response(session)


@router.get("/me", response_model=SessionResponse)
async def get_current_session(x_auth_token: Optional[str] = Header(default=None)) -> SessionResponse:
    session = await session_service.authenticate_token(x_auth_token)
    return _to_session_response(session)


@router.get("/me/permissions", response_model=UserPermissionsResponse)
async def get_current_permissions(
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> UserPermissionsResponse:
    return UserPermissionsResponse(
        username=user.username,
        type=user.user_type,
        attached_roles=user.attached_roles,
        effective_policy=await user.effective_policy(),
    )


@router.post("/logout")
async def logout(x_auth_token: Optional[str] = Header(default=None)) -> dict:
    await session_service.logout(x_auth_token)
    return {"ok": True}


@router.get("/users", response_model=UserListResponse)
async def list_users(
    _actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> UserListResponse:
    users = await user_service.list_users()
    return UserListResponse(items=[_to_user_response(user) for user in users])


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> UserResponse:
    user = await user_service.create_user(
        account_id=request.account_id,
        email=request.email,
        username=request.username,
        password=request.password,
        user_type=request.type,
        created_by=actor.user_id,
    )
    return _to_user_response(user)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    _actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> UserResponse:
    user = await user_service.get_user_by_id(user_service.parse_user_id(user_id))
    if not user:
        raise ResourceNotFoundError("User not found.")
    return _to_user_response(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> UserResponse:
    updated = await user_service.update_user(
        user_service.parse_user_id(user_id),
        email=request.email,
        username=request.username,
        is_active=request.is_active,
        actor_id=actor.user_id,
    )
    return _to_user_response(updated)


@router.post("/users/{user_id}/password")
async def reset_user_password(
    user_id: str,
    request: ResetPasswordRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> dict:
    target_id = user_service.parse_user_id(user_id)
    await user_service.reset_user_password(
        target_id,
        request.new_password,
        actor_id=actor.user_id,
        # Don't kick the actor out of their own password reset.
        revoke_other_sessions=(target_id != actor.user_id),
    )
    return {"ok": True}


def _to_session_response(session: dict) -> SessionResponse:
    return SessionResponse(
        token=session["token"],
        username=session["username"],
        type=session.get("type", "admin"),
        account_id=session.get("account_id"),
        email=session.get("email"),
        expires_at=session["expires_at"],
    )


def _to_user_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        account_id=user["account_id"],
        email=user["email"],
        username=user["username"],
        is_active=bool(user.get("is_active", True)),
        type=user.get("type", "admin"),
        attached_roles=user.get("attached_roles", []),
        inline_policy=user.get("inline_policy", []),
        created_at=user["created_at"],
        updated_at=user.get("updated_at"),
        last_login_at=user.get("last_login_at"),
        created_by=str(user["created_by"]) if user.get("created_by") else None,
        updated_by=str(user["updated_by"]) if user.get("updated_by") else None,
    )
