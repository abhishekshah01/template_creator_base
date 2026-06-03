"""Policy primitives shared across the access-control layer.

`PolicyStatement` is the security boundary: its validators reject unknown
actions and dead wildcards so a malformed policy can never reach the database.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from services.access_control import permission_catalog

PermissionEffect = Literal["allow", "deny"]


class PolicyStatement(BaseModel):
    effect: PermissionEffect
    actions: list[str] = Field(min_length=1)
    resources: list[str] = Field(min_length=1)

    @field_validator("actions")
    @classmethod
    def reject_unknown_actions(cls, actions: list[str]) -> list[str]:
        from services.access_control.policy_matcher import wildcard_matches_any_action

        for action in actions:
            if not action:
                raise ValueError("action entries must be non-empty")
            if "*" in action:
                if not wildcard_matches_any_action(action, permission_catalog.ALL_S3_ACTIONS):
                    raise ValueError(
                        f"wildcard action '{action}' matches no known action; "
                        f"check it against services.access_control.permission_catalog"
                    )
            elif not permission_catalog.is_known_action(action):
                raise ValueError(
                    f"unknown action '{action}'; add it to permission_catalog first"
                )
        return actions

    @field_validator("resources")
    @classmethod
    def reject_empty_resources(cls, resources: list[str]) -> list[str]:
        for resource in resources:
            if not resource:
                raise ValueError("resource entries must be non-empty")
        return resources


class Role(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=512)
    policy: list[PolicyStatement] = Field(default_factory=list)
    is_system: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AccessDecision(BaseModel):
    effect: PermissionEffect
    reason: str

    @property
    def is_allowed(self) -> bool:
        return self.effect == "allow"
