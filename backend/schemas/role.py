"""Request/response models for /api/auth/roles and /users/{id}/roles."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from schemas.policy import PolicyStatement


class RoleResponse(BaseModel):
    name: str
    description: str = ""
    policy: list[PolicyStatement] = Field(default_factory=list)
    is_system: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RoleListResponse(BaseModel):
    items: list[RoleResponse]


class CreateRoleRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=512)
    policy: list[PolicyStatement] = Field(default_factory=list)


class UpdateRoleRequest(BaseModel):
    description: Optional[str] = Field(default=None, max_length=512)
    policy: Optional[list[PolicyStatement]] = None


class AttachRolesRequest(BaseModel):
    names: list[str] = Field(min_length=1)


class SetInlinePolicyRequest(BaseModel):
    policy: list[PolicyStatement] = Field(default_factory=list)
