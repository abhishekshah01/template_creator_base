"""Idempotent seeding of system roles, run on every startup. Editing this file
is the canonical way to change what a system role grants — direct Mongo edits to
a system role are overwritten on the next start."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from dal import role_repository
from schemas.policy import PolicyStatement, Role
from services.access_control import permission_catalog

log = logging.getLogger(__name__)


def _allow_statement(actions, resources) -> PolicyStatement:
    # Coerce enum members to plain strings and sort so the persisted policy is
    # stable across restarts (otherwise set-iteration order makes Mongo see a
    # "modified" doc every time).
    return PolicyStatement(
        effect="allow",
        actions=sorted(str(action) for action in actions),
        resources=list(resources),
    )


ATTACHABLE_ROLES: tuple[Role, ...] = (
    Role(
        name="S3ReadOnlyAccess",
        description="Browse buckets and download objects across all S3 paths.",
        is_system=True,
        policy=[_allow_statement(permission_catalog.READ_ACTIONS, ["s3://*"])],
    ),
    Role(
        name="S3ReadWriteAccess",
        description="S3ReadOnlyAccess plus upload and create-folder. No delete, no cache invalidation.",
        is_system=True,
        policy=[_allow_statement(permission_catalog.READ_WRITE_ACTIONS, ["s3://*"])],
    ),
    Role(
        name="S3FullAccess",
        description="Every S3 action on every path, including delete and cache invalidation.",
        is_system=True,
        policy=[_allow_statement(permission_catalog.FULL_ACTIONS, ["s3://*"])],
    ),
)

DEFAULT_ROLE_BY_USER_TYPE: dict[str, str] = {
    "owner": "owner-default",
    "admin": "admin-default",
    "user": "user-default",
}

# Auto-attached when a user of the matching type is created. owner-default
# mirrors the owner short-circuit in the evaluator; it exists for audit clarity.
TYPE_DEFAULT_ROLES: tuple[Role, ...] = (
    Role(
        name="owner-default",
        description="Default role for every owner. Mirrors the owner short-circuit.",
        is_system=True,
        policy=[PolicyStatement(effect="allow", actions=["*"], resources=["*"])],
    ),
    Role(
        name="admin-default",
        description="Default role for every admin. Read + write, no delete.",
        is_system=True,
        policy=[_allow_statement(permission_catalog.READ_WRITE_ACTIONS, ["s3://*"])],
    ),
    Role(
        name="user-default",
        description="Default role for every standard user. No access until roles are attached.",
        is_system=True,
        policy=[],
    ),
)

SYSTEM_ROLES: tuple[Role, ...] = ATTACHABLE_ROLES + TYPE_DEFAULT_ROLES
SYSTEM_ROLE_NAMES: frozenset[str] = frozenset(role.name for role in SYSTEM_ROLES)


def _to_document(role: Role) -> dict:
    return {
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "policy": [statement.model_dump() for statement in role.policy],
    }


async def seed_system_roles() -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = updated = unchanged = 0

    for role in SYSTEM_ROLES:
        document = _to_document(role)
        existing = await role_repository.find_role_by_name(role.name)
        if existing is None:
            await role_repository.insert_role({**document, "created_at": now, "updated_at": now})
            created += 1
            continue

        is_unchanged = (
            existing.get("description") == document["description"]
            and existing.get("is_system") == document["is_system"]
            and existing.get("policy") == document["policy"]
        )
        if is_unchanged:
            unchanged += 1
            continue

        await role_repository.update_role_fields(role.name, {**document, "updated_at": now})
        updated += 1

    log.info("role_seeder: created=%d updated=%d unchanged=%d", created, updated, unchanged)
    return {"created": created, "updated": updated, "unchanged": unchanged}
