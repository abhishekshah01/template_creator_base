"""Pydantic models for the permission system.

`Statement` is the atomic unit of a grant — an effect (allow/deny), a list
of actions it applies to, and a list of resource URIs it applies to. AWS
IAM uses this exact shape.

`Role` is a named bundle of statements that can be attached to users.

`Decision` is what the evaluator returns. It carries the reason as a
human-readable string so the audit log can record *why* a request was
allowed or denied — useful for "why was this allowed?" investigations
that a pure bool would not support.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from services.permissions import actions as actions_mod

Effect = Literal["allow", "deny"]


class Statement(BaseModel):
    """One allow/deny rule.

    `actions` accepts both literal action codes (validated against
    `ALL_ACTIONS`) and wildcards (`tc:*`, `tc:s3:*`, `*`). Wildcards are
    permitted so admins can author broad policies, but a wildcard MUST
    cover at least one known action — otherwise the policy is a no-op
    and almost certainly a typo.
    """

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
                if not action_matches_any(entry, actions_mod.ALL_ACTIONS):
                    raise ValueError(
                        f"wildcard action '{entry}' matches no known action; "
                        f"check the spelling against services.permissions.actions"
                    )
            else:
                if not actions_mod.is_known(entry):
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
            # We deliberately don't restrict the resource grammar beyond
            # non-empty — the matcher handles wildcards and the route's
            # resource_fn is the only thing that constructs them.
        return v


class Role(BaseModel):
    """A named bundle of statements attached to users."""

    name: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=512)
    policy: list[Statement] = Field(default_factory=list)
    is_system: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Decision(BaseModel):
    """The result of evaluating (user, action, resource).

    `effect` is `"allow"` or `"deny"`. `reason` is a short, machine-stable
    string the audit log records verbatim — keep it stable across releases
    if you ever want to query the audit log by reason.
    """

    effect: Effect
    reason: str

    @property
    def allowed(self) -> bool:
        return self.effect == "allow"
