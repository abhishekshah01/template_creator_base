"""Manage the roles and inline policy attached to a user."""

from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from dal import user_repository
from exceptions import InvalidInputError, ResourceNotFoundError
from schemas.policy import PolicyStatement
from services import role_service
from services.access_control.role_seeder import DEFAULT_ROLE_BY_USER_TYPE


async def attach_roles_to_user(user_id: ObjectId, role_names: list[str]) -> dict:
    if not role_names:
        raise InvalidInputError("role names list is empty.")
    await _get_user_or_404(user_id)
    await _assert_roles_exist(role_names)
    await user_repository.add_roles_to_user(user_id, role_names, datetime.now(timezone.utc))
    return await user_repository.find_user_by_id(user_id)


async def detach_roles_from_user(user_id: ObjectId, role_names: list[str]) -> dict:
    if not role_names:
        raise InvalidInputError("role names list is empty.")
    user = await _get_user_or_404(user_id)

    # The type-default role tracks the user's type; detaching it would partially
    # demote the user by hand. Change the type instead.
    default_role = DEFAULT_ROLE_BY_USER_TYPE.get(user.get("type", "admin"))
    if default_role and default_role in role_names:
        raise InvalidInputError(
            f"cannot detach '{default_role}' — change the user's type instead."
        )

    await user_repository.remove_roles_from_user(user_id, role_names, datetime.now(timezone.utc))
    return await user_repository.find_user_by_id(user_id)


async def set_user_inline_policy(user_id: ObjectId, policy: list[PolicyStatement]) -> dict:
    await _get_user_or_404(user_id)
    # Re-validate via the schema so a raw dict can never slip through.
    serialized = [PolicyStatement(**statement.model_dump()).model_dump() for statement in policy]
    await user_repository.update_user_fields(
        user_id, {"inline_policy": serialized, "updated_at": datetime.now(timezone.utc)}
    )
    return await user_repository.find_user_by_id(user_id)


async def _get_user_or_404(user_id: ObjectId) -> dict:
    user = await user_repository.find_user_by_id(user_id)
    if not user:
        raise ResourceNotFoundError("user not found.")
    return user


async def _assert_roles_exist(role_names: list[str]) -> None:
    for name in role_names:
        if not await role_service.role_exists(name):
            raise InvalidInputError(f"role '{name}' does not exist.")
