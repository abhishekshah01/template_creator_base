"""Request/response models for /api/admin-auth/*."""

from typing import Optional

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    # `account` accepts either the 12-digit Account ID or an @emergent.sh email.
    # Backend resolves which it is at lookup time.
    account: str = Field(min_length=1, max_length=256)
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class AdminSessionResponse(BaseModel):
    token: str
    username: str
    account_id: Optional[str] = None
    email: Optional[str] = None
    expires_at: float
