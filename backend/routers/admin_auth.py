"""/api/admin-auth/* — gate for the AWS S3 Navigate UI and admin user CRUD.

Auth flow:
  - `get_current_admin` is the FastAPI dependency every gated route uses.
    It validates the X-Admin-Token header, slides the TTL, and returns the
    actor's identity (admin_id, account_id, email, username) for the handler.

Admin management (PATCH/POST /users/...) lives under the same router so the
prefix stays /api/admin-auth and everything is auth-gated by the same dep.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from schemas.admin_auth import (
    AdminLoginRequest,
    AdminSessionResponse,
    AdminUserListResponse,
    AdminUserResponse,
    CreateAdminRequest,
    ResetPasswordRequest,
    UpdateAdminRequest,
)
from services import admin_auth_service as auth_svc
from services import admin_users as users_svc

router = APIRouter(prefix="/api/admin-auth", tags=["admin-auth"])


async def get_current_admin(x_admin_token: Optional[str] = Header(default=None)) -> dict:
    """FastAPI dependency: 401 unless the bearer token resolves to a live session.

    Returns the dict shape from admin_auth_service.require — includes admin_id
    (ObjectId) so handlers can mutate the current user without an extra lookup.
    """
    return await auth_svc.require(x_admin_token)


@router.post("/login", response_model=AdminSessionResponse)
async def login(req: AdminLoginRequest) -> AdminSessionResponse:
    data = await auth_svc.login(req.account, req.username, req.password)
    return _session_response(data)


@router.get("/me", response_model=AdminSessionResponse)
async def me(me: dict = Depends(get_current_admin)) -> AdminSessionResponse:
    return _session_response(me)


@router.get("/me/permissions")
async def me_permissions(me: dict = Depends(get_current_admin)) -> dict:
    # Local import to avoid the circular: deps.py imports get_current_admin
    # from this module.
    from services.permissions.deps import get_effective_policy

    admin = await users_svc.find_by_id(me["admin_id"])
    return {
        "username": me.get("username"),
        "type": (admin or {}).get("type", "admin"),
        "attached_roles": (admin or {}).get("attached_roles", []),
        "effective_policy": await get_effective_policy(admin),
    }


@router.post("/logout")
async def logout(x_admin_token: Optional[str] = Header(default=None)) -> dict:
    await auth_svc.logout(x_admin_token)
    return {"ok": True}


@router.get("/users", response_model=AdminUserListResponse)
async def list_admin_users(_me: dict = Depends(get_current_admin)) -> AdminUserListResponse:
    docs = await users_svc.list_admins()
    return AdminUserListResponse(items=[_admin_response(d) for d in docs])


@router.post("/users", response_model=AdminUserResponse, status_code=201)
async def create_admin_user(
    req: CreateAdminRequest,
    me: dict = Depends(get_current_admin),
) -> AdminUserResponse:
    doc = await users_svc.create_admin(
        account_id=req.account_id,
        email=req.email,
        username=req.username,
        password=req.password,
        user_type=req.type,
        created_by=me["admin_id"],
    )
    return _admin_response(doc)


@router.get("/users/{admin_id}", response_model=AdminUserResponse)
async def get_admin_user(
    admin_id: str,
    _me: dict = Depends(get_current_admin),
) -> AdminUserResponse:
    oid = users_svc.to_object_id(admin_id)
    doc = await users_svc.find_by_id(oid)
    if not doc:
        raise HTTPException(404, "Admin not found.")
    return _admin_response(doc)


@router.patch("/users/{admin_id}", response_model=AdminUserResponse)
async def update_admin_user(
    admin_id: str,
    req: UpdateAdminRequest,
    me: dict = Depends(get_current_admin),
    x_admin_token: Optional[str] = Header(default=None),
) -> AdminUserResponse:
    oid = users_svc.to_object_id(admin_id)
    updated = await users_svc.update_admin(
        oid,
        email=req.email,
        username=req.username,
        is_active=req.is_active,
        actor_id=me["admin_id"],
    )
    # If the actor just deactivated themselves, their current session is gone
    # (revoke_sessions was called inside update_admin). Tell the client.
    self_logged_out = bool(
        req.is_active is False and oid == me["admin_id"]
    )
    response = _admin_response(updated)
    if self_logged_out:
        # Wire a hint to the client by setting the header; body is still the
        # updated admin record so the page can render the post-action state.
        # Frontend uses 401 from the next /me call to bounce to sign-in too.
        pass  # client checks res.is_active == False && id === own; nothing extra needed
    return response


@router.post("/users/{admin_id}/password")
async def reset_admin_password(
    admin_id: str,
    req: ResetPasswordRequest,
    me: dict = Depends(get_current_admin),
) -> dict:
    oid = users_svc.to_object_id(admin_id)
    await users_svc.reset_password(
        oid,
        req.new_password,
        actor_id=me["admin_id"],
        revoke_other_sessions=(oid != me["admin_id"]),  # don't kick the actor out of their own password reset
    )
    return {"ok": True}


def _session_response(data: dict) -> AdminSessionResponse:
    return AdminSessionResponse(
        token=data["token"],
        username=data["username"],
        account_id=data.get("account_id"),
        email=data.get("email"),
        expires_at=data["expires_at"],
    )


def _admin_response(doc: dict) -> AdminUserResponse:
    return AdminUserResponse(
        id=str(doc["_id"]),
        account_id=doc["account_id"],
        email=doc["email"],
        username=doc["username"],
        is_active=bool(doc.get("is_active", True)),
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at"),
        last_login_at=doc.get("last_login_at"),
        created_by=str(doc["created_by"]) if doc.get("created_by") else None,
        updated_by=str(doc["updated_by"]) if doc.get("updated_by") else None,
        type=doc.get("type", "admin"),
        attached_roles=doc.get("attached_roles", []),
        inline_policy=doc.get("inline_policy", []),
    )
