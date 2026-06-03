"""Role CRUD. System roles are owned by role_seeder.py and cannot be mutated via
the API — that constraint is enforced here so the endpoints can't drift from it."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from dal import role_repository
from exceptions import (
    DuplicateResourceError,
    ForbiddenError,
    InvalidInputError,
    ResourceNotFoundError,
)
from schemas.policy import PolicyStatement, Role


async def list_roles() -> list[dict]:
    return await role_repository.list_roles_alphabetical()


async def get_role(name: str) -> Optional[dict]:
    return await role_repository.find_role_by_name(name)


async def role_exists(name: str) -> bool:
    return await role_repository.role_exists(name)


async def create_role(name: str, description: str, policy: list[PolicyStatement]) -> dict:
    if not name or "*" in name or "/" in name:
        raise InvalidInputError("role name must be non-empty and contain no '*' or '/'.")
    if await role_repository.find_role_by_name(name):
        raise DuplicateResourceError(f"A role named '{name}' already exists.")

    Role(name=name, description=description, policy=policy)  # validate shape
    now = datetime.now(timezone.utc)
    document = {
        "name": name,
        "description": description,
        "is_system": False,
        "policy": [statement.model_dump() for statement in policy],
        "created_at": now,
        "updated_at": now,
    }
    await role_repository.insert_role(document)
    return document


async def update_role(
    name: str,
    *,
    description: Optional[str] = None,
    policy: Optional[list[PolicyStatement]] = None,
) -> dict:
    existing = await _get_editable_role(name)

    fields: dict = {"updated_at": datetime.now(timezone.utc)}
    if description is not None:
        fields["description"] = description
    if policy is not None:
        Role(name=name, description=description or existing.get("description", ""), policy=policy)
        fields["policy"] = [statement.model_dump() for statement in policy]

    await role_repository.update_role_fields(name, fields)
    return await role_repository.find_role_by_name(name)


async def delete_role(name: str) -> None:
    await _get_editable_role(name)
    await role_repository.delete_role_by_name(name)


async def _get_editable_role(name: str) -> dict:
    existing = await role_repository.find_role_by_name(name)
    if not existing:
        raise ResourceNotFoundError(f"role '{name}' not found.")
    if existing.get("is_system"):
        raise ForbiddenError(f"role '{name}' is a system role — edit role_seeder.py instead.")
    return existing
