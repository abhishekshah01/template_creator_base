"""Request/response models for /api/auth/*."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from schemas.policy import PolicyStatement

UserType = Literal["owner", "admin", "user"]


class LoginRequest(BaseModel):
    # `account` accepts either the 12-digit account_id or an @emergent.sh email.
    account: str = Field(min_length=1, max_length=256)
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class SessionResponse(BaseModel):
    token: str
    username: str
    type: UserType = "admin"
    account_id: Optional[str] = None
    email: Optional[str] = None
    expires_at: float


class CreateUserRequest(BaseModel):
    account_id: str = Field(min_length=12, max_length=12)
    email: str = Field(min_length=3, max_length=256)
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=8, max_length=256)
    type: UserType = "admin"


class UpdateUserRequest(BaseModel):
    email: Optional[str] = Field(default=None, min_length=3, max_length=256)
    username: Optional[str] = Field(default=None, min_length=2, max_length=64)
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=256)


class UserResponse(BaseModel):
    id: str
    account_id: str
    email: str
    username: str
    is_active: bool
    type: UserType = "admin"
    attached_roles: list[str] = Field(default_factory=list)
    inline_policy: list[PolicyStatement] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class UserListResponse(BaseModel):
    items: list[UserResponse]


class UserPermissionsResponse(BaseModel):
    username: Optional[str] = None
    type: UserType = "admin"
    attached_roles: list[str] = Field(default_factory=list)
    effective_policy: list[PolicyStatement] = Field(default_factory=list)
