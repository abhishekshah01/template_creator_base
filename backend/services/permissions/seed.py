"""Idempotent seeding of system roles. Runs on every app startup; editing
this file is the canonical way to change what a system role grants — direct
Mongo edits to a system role doc will be overwritten on the next start."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from clients.mongo_client import roles as roles_coll
from schemas.permissions import Role, Statement
from services.permissions import actions

log = logging.getLogger(__name__)


def _stmt_allow(action_set, resources):
    # Sort actions so the persisted policy is deterministic — without this,
    # set-iteration order would make Mongo see a 'modified' doc every restart.
    return Statement(effect="allow", actions=sorted(action_set), resources=list(resources))


ATTACHABLE_ROLES: tuple[Role, ...] = (
    Role(
        name="S3ReadOnlyAccess",
        description="Browse buckets and download objects across all S3 paths.",
        is_system=True,
        policy=[_stmt_allow(actions.S3_READ_ACTIONS, ["s3://*"])],
    ),
    Role(
        name="S3ReadWriteAccess",
        description="S3ReadOnlyAccess plus upload and create-folder. No delete, no cache invalidation.",
        is_system=True,
        policy=[_stmt_allow(actions.S3_WRITE_ACTIONS, ["s3://*"])],
    ),
    Role(
        name="S3FullAccess",
        description="Every tc:s3 action on every path. Includes delete and cache invalidation.",
        is_system=True,
        policy=[_stmt_allow(actions.S3_FULL_ACTIONS, ["s3://*"])],
    ),
)

# Auto-attached when a user of the matching type is created. The owner
# type also has a short-circuit in the evaluator, so owner-default is
# mostly for audit-log clarity.
TYPE_DEFAULT_ROLES: tuple[Role, ...] = (
    Role(
        name="owner-default",
        description="Default role attached to every owner user. Mirrors the owner short-circuit in the evaluator.",
        is_system=True,
        policy=[Statement(effect="allow", actions=["*"], resources=["*"])],
    ),
    Role(
        name="admin-default",
        description="Default role attached to every admin user. Read + write, no delete.",
        is_system=True,
        policy=[_stmt_allow(actions.S3_WRITE_ACTIONS, ["s3://*"])],
    ),
    Role(
        name="user-default",
        description="Default role attached to every standard user. Empty policy — zero access until an admin attaches more roles.",
        is_system=True,
        policy=[],
    ),
)

SYSTEM_ROLES: tuple[Role, ...] = ATTACHABLE_ROLES + TYPE_DEFAULT_ROLES
SYSTEM_ROLE_NAMES: frozenset[str] = frozenset(r.name for r in SYSTEM_ROLES)


def _to_mongo_doc(role: Role) -> dict:
    return {
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "policy": [s.model_dump() for s in role.policy],
    }


async def seed_system_roles() -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = updated = unchanged = 0

    for role in SYSTEM_ROLES:
        doc = _to_mongo_doc(role)
        existing = await roles_coll.find_one({"name": role.name})
        if existing is None:
            await roles_coll.insert_one({**doc, "created_at": now, "updated_at": now})
            created += 1
            continue

        same = (
            existing.get("description") == doc["description"]
            and existing.get("is_system") == doc["is_system"]
            and existing.get("policy") == doc["policy"]
        )
        if same:
            unchanged += 1
            continue

        await roles_coll.update_one(
            {"name": role.name},
            {"$set": {**doc, "updated_at": now}},
        )
        updated += 1

    log.info("permissions.seed: created=%d updated=%d unchanged=%d", created, updated, unchanged)
    return {"created": created, "updated": updated, "unchanged": unchanged}
