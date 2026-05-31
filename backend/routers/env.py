"""/api/environments, /api/switch-environment."""

from fastapi import APIRouter

from schemas.env import SwitchEnvironmentRequest
from services import env_service

router = APIRouter(tags=["env"])


@router.get("/api/environments")
def list_environments():
    return env_service.get_environments()


@router.post("/api/switch-environment")
def switch_environment(req: SwitchEnvironmentRequest):
    return env_service.switch_environment(req.env_name)
