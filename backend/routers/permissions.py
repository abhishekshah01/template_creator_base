"""/api/admin-auth/roles + /users/{id}/roles + /users/{id}/inline-policy.

Owner-only endpoints — enforced via the same evaluator everything else uses,
so the rule lives in one place and the audit log captures every attempt."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from bson import ObjectId
from bson.errors import InvalidId

from routers.admin_auth import get_current_admin
from schemas.roles import (
    AttachRolesRequest,
    CreateRoleRequest,
    RoleListResponse,
    RoleResponse,
    SetInlinePolicyRequest,
    UpdateRoleRequest,
)
from services import admin_users as users_svc
from services import role_service, user_roles_service
from services.permissions.deps import check

router = APIRouter(prefix="/api/admin-auth", tags=["permissions"])


PSEUDO_RESOURCE = "tc://rbac/admin"


async def _owner_only(action: str, request: Request, user: dict) -> None:
    await check(user, action, PSEUDO_RESOURCE, request)


def _to_object_id(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError):
        raise HTTPException(400, "invalid user id.") from None


def _to_role_response(doc: dict) -> RoleResponse:
    return RoleResponse(
        name=doc["name"],
        description=doc.get("description", ""),
        policy=doc.get("policy", []),
        is_system=bool(doc.get("is_system", False)),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )


@router.get("/roles", response_model=RoleListResponse)
async def list_roles(
    request: Request,
    me: dict = Depends(get_current_admin),
) -> RoleListResponse:
    await _owner_only("tc:iam:ListRoles", request, me)
    docs = await role_service.list_roles()
    return RoleListResponse(items=[_to_role_response(d) for d in docs])


@router.post("/roles", response_model=RoleResponse, status_code=201)
async def create_role(
    req: CreateRoleRequest,
    request: Request,
    me: dict = Depends(get_current_admin),
) -> RoleResponse:
    await _owner_only("tc:iam:CreateRole", request, me)
    doc = await role_service.create_role(req.name, req.description, req.policy)
    return _to_role_response(doc)


@router.get("/roles/{name}", response_model=RoleResponse)
async def get_role(
    name: str,
    request: Request,
    me: dict = Depends(get_current_admin),
) -> RoleResponse:
    await _owner_only("tc:iam:GetRole", request, me)
    doc = await role_service.get_role(name)
    if not doc:
        raise HTTPException(404, f"role '{name}' not found.")
    return _to_role_response(doc)


@router.patch("/roles/{name}", response_model=RoleResponse)
async def update_role(
    name: str,
    req: UpdateRoleRequest,
    request: Request,
    me: dict = Depends(get_current_admin),
) -> RoleResponse:
    await _owner_only("tc:iam:UpdateRole", request, me)
    doc = await role_service.update_role(name, description=req.description, policy=req.policy)
    return _to_role_response(doc)


@router.delete("/roles/{name}", status_code=204, response_class=Response)
async def delete_role(
    name: str,
    request: Request,
    me: dict = Depends(get_current_admin),
):
    await _owner_only("tc:iam:DeleteRole", request, me)
    await role_service.delete_role(name)
    return Response(status_code=204)


@router.patch("/users/{admin_id}/roles/attach")
async def attach_roles(
    admin_id: str,
    req: AttachRolesRequest,
    request: Request,
    me: dict = Depends(get_current_admin),
) -> dict:
    await _owner_only("tc:iam:AttachUserRole", request, me)
    doc = await user_roles_service.attach_roles(_to_object_id(admin_id), req.names)
    return {"id": str(doc["_id"]), "attached_roles": doc.get("attached_roles", [])}


@router.patch("/users/{admin_id}/roles/detach")
async def detach_roles(
    admin_id: str,
    req: AttachRolesRequest,
    request: Request,
    me: dict = Depends(get_current_admin),
) -> dict:
    await _owner_only("tc:iam:DetachUserRole", request, me)
    doc = await user_roles_service.detach_roles(_to_object_id(admin_id), req.names)
    return {"id": str(doc["_id"]), "attached_roles": doc.get("attached_roles", [])}


@router.put("/users/{admin_id}/inline-policy")
async def set_inline_policy(
    admin_id: str,
    req: SetInlinePolicyRequest,
    request: Request,
    me: dict = Depends(get_current_admin),
) -> dict:
    await _owner_only("tc:iam:SetInlinePolicy", request, me)
    doc = await user_roles_service.set_inline_policy(_to_object_id(admin_id), req.policy)
    return {"id": str(doc["_id"]), "inline_policy": doc.get("inline_policy", [])}
