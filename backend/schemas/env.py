"""Models for /api/environments + /api/switch-environment."""

from pydantic import BaseModel


class SwitchEnvironmentRequest(BaseModel):
    env_name: str
