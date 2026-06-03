"""/api/auth/roles + /users/{id}/roles + /users/{id}/inline-policy.

Owner-only: every handler calls require_owner() before touching role state.
"""

from fastapi import APIRouter, Depends, Response

from authentication.authenticated_user import AuthenticatedUser
from exceptions import ResourceNotFoundError
from schemas.role import (
    AttachRolesRequest,
    CreateRoleRequest,
    RoleListResponse,
    RoleResponse,
    SetInlinePolicyRequest,
    UpdateRoleRequest,
)
from services import role_service, user_role_service, user_service

router = APIRouter(prefix="/api/auth", tags=["access-control"])


@router.get("/roles", response_model=RoleListResponse)
async def list_roles(
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> RoleListResponse:
    actor.require_owner()
    roles = await role_service.list_roles()
    return RoleListResponse(items=[_to_role_response(role) for role in roles])


@router.post("/roles", response_model=RoleResponse, status_code=201)
async def create_role(
    request: CreateRoleRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> RoleResponse:
    actor.require_owner()
    role = await role_service.create_role(request.name, request.description, request.policy)
    return _to_role_response(role)


@router.get("/roles/{name}", response_model=RoleResponse)
async def get_role(
    name: str,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> RoleResponse:
    actor.require_owner()
    role = await role_service.get_role(name)
    if not role:
        raise ResourceNotFoundError(f"role '{name}' not found.")
    return _to_role_response(role)


@router.patch("/roles/{name}", response_model=RoleResponse)
async def update_role(
    name: str,
    request: UpdateRoleRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> RoleResponse:
    actor.require_owner()
    role = await role_service.update_role(name, description=request.description, policy=request.policy)
    return _to_role_response(role)


@router.delete("/roles/{name}", status_code=204, response_class=Response)
async def delete_role(
    name: str,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    actor.require_owner()
    await role_service.delete_role(name)
    return Response(status_code=204)


@router.patch("/users/{user_id}/roles/attach")
async def attach_roles(
    user_id: str,
    request: AttachRolesRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> dict:
    actor.require_owner()
    user = await user_role_service.attach_roles_to_user(
        user_service.parse_user_id(user_id), request.names
    )
    return {"id": str(user["_id"]), "attached_roles": user.get("attached_roles", [])}


@router.patch("/users/{user_id}/roles/detach")
async def detach_roles(
    user_id: str,
    request: AttachRolesRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> dict:
    actor.require_owner()
    user = await user_role_service.detach_roles_from_user(
        user_service.parse_user_id(user_id), request.names
    )
    return {"id": str(user["_id"]), "attached_roles": user.get("attached_roles", [])}


@router.put("/users/{user_id}/inline-policy")
async def set_inline_policy(
    user_id: str,
    request: SetInlinePolicyRequest,
    actor: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
) -> dict:
    actor.require_owner()
    user = await user_role_service.set_user_inline_policy(
        user_service.parse_user_id(user_id), request.policy
    )
    return {"id": str(user["_id"]), "inline_policy": user.get("inline_policy", [])}


def _to_role_response(role: dict) -> RoleResponse:
    return RoleResponse(
        name=role["name"],
        description=role.get("description", ""),
        policy=role.get("policy", []),
        is_system=bool(role.get("is_system", False)),
        created_at=role.get("created_at"),
        updated_at=role.get("updated_at"),
    )
