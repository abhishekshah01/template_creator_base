"""Request/response models for /api/admin-auth/*."""

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class AdminSessionResponse(BaseModel):
    token: str
    username: str
    expires_at: float
