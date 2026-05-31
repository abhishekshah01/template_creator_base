"""/api/admin-auth/* — gate for the AWS S3 Navigate UI."""

from typing import Optional

from fastapi import APIRouter, Header

from schemas.admin_auth import AdminLoginRequest, AdminSessionResponse
from services import admin_auth_service as svc

router = APIRouter(prefix="/api/admin-auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminSessionResponse)
async def login(req: AdminLoginRequest) -> AdminSessionResponse:
    data = await svc.login(req.account, req.username, req.password)
    return AdminSessionResponse(**data)


@router.get("/me", response_model=AdminSessionResponse)
async def me(x_admin_token: Optional[str] = Header(default=None)) -> AdminSessionResponse:
    data = await svc.require(x_admin_token)
    return AdminSessionResponse(**data)


@router.post("/logout")
async def logout(x_admin_token: Optional[str] = Header(default=None)) -> dict:
    await svc.logout(x_admin_token)
    return {"ok": True}
