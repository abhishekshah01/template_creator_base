"""Request/response models for /api/admin-auth/*."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from schemas.permissions import Statement

UserType = Literal["owner", "admin", "user"]


class AdminLoginRequest(BaseModel):
    # `account` accepts either the 12-digit Account ID or an @emergent.sh email.
    account: str = Field(min_length=1, max_length=256)
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class AdminSessionResponse(BaseModel):
    token: str
    username: str
    account_id: Optional[str] = None
    email: Optional[str] = None
    expires_at: float


class CreateAdminRequest(BaseModel):
    account_id: str = Field(min_length=12, max_length=12)
    email: str = Field(min_length=3, max_length=256)
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=8, max_length=256)
    type: UserType = "admin"


class UpdateAdminRequest(BaseModel):
    email: Optional[str] = Field(default=None, min_length=3, max_length=256)
    username: Optional[str] = Field(default=None, min_length=2, max_length=64)
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=256)


class AdminUserResponse(BaseModel):
    id: str
    account_id: str
    email: str
    username: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    type: UserType = "admin"
    attached_roles: list[str] = Field(default_factory=list)
    inline_policy: list[Statement] = Field(default_factory=list)


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
