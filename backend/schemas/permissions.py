"""Statement / Role / Decision pydantic models. Statement is the security
boundary — its validators must reject unknown actions and no-op wildcards
so a malformed policy can't reach the database."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from services.permissions import actions as actions_mod

Effect = Literal["allow", "deny"]


class Statement(BaseModel):
    effect: Effect
    actions: list[str] = Field(min_length=1)
    resources: list[str] = Field(min_length=1)

    @field_validator("actions")
    @classmethod
    def _validate_actions(cls, v: list[str]) -> list[str]:
        from services.permissions.matchers import action_matches_any

        for entry in v:
            if not entry:
                raise ValueError("action entries must be non-empty")
            if "*" in entry:
                # Wildcard must cover at least one known action — otherwise
                # the statement is a no-op and almost certainly a typo.
                if not action_matches_any(entry, actions_mod.ALL_ACTIONS):
                    raise ValueError(
                        f"wildcard action '{entry}' matches no known action; "
                        f"check the spelling against services.permissions.actions"
                    )
            elif not actions_mod.is_known(entry):
                raise ValueError(
                    f"unknown action '{entry}'. "
                    f"Add it to services.permissions.actions first."
                )
        return v

    @field_validator("resources")
    @classmethod
    def _validate_resources(cls, v: list[str]) -> list[str]:
        for entry in v:
            if not entry:
                raise ValueError("resource entries must be non-empty")
        return v


class Role(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=512)
    policy: list[Statement] = Field(default_factory=list)
    is_system: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Decision(BaseModel):
    effect: Effect
    reason: str

    @property
    def allowed(self) -> bool:
        return self.effect == "allow"
