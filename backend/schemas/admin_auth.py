"""Request/response models for /api/admin-auth/*."""

from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminSessionResponse(BaseModel):
    token: str
    username: str
    expires_at: float
