"""Idempotent seeding of system roles.

Runs on application startup (wired into main.py's lifespan). System roles
are upserted by name so editing the seed file is the canonical way to
change what "S3ReadOnlyAccess" or "admin-default" means — never edit a
system role document directly in Mongo, the next startup will overwrite
your change.

Naming convention:
  S3ReadOnlyAccess / S3ReadWriteAccess / S3FullAccess
      AWS-style managed-policy names. These are *attachable* roles —
      admins assign them to specific users.

  owner-default / admin-default / user-default
      The implicit role for each user kind. Auto-attached on user
      creation. Renaming or removing these from a user's
      attached_role_ids is a no-op — the kind itself is the source of
      truth for which default is active (see the evaluator).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from clients.mongo_client import roles as roles_coll
from schemas.permissions import Role, Statement
from services.permissions import actions

log = logging.getLogger(__name__)


def _stmt_allow(action_set, resources):
    """Helper: produce a single allow statement with sorted action codes.
    Sorting keeps the persisted policy deterministic across restarts so
    Mongo doesn't see a "modified" document every time the seed runs.
    """
    return Statement(effect="allow", actions=sorted(action_set), resources=list(resources))


# Attachable roles — admins assign these to specific users.
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

# Kind defaults — auto-attached when a user of that kind is created.
# The owner kind also has a short-circuit in the evaluator, so the
# owner-default role is mostly cosmetic / for audit-log clarity.
KIND_DEFAULT_ROLES: tuple[Role, ...] = (
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

SYSTEM_ROLES: tuple[Role, ...] = ATTACHABLE_ROLES + KIND_DEFAULT_ROLES
SYSTEM_ROLE_NAMES: frozenset[str] = frozenset(r.name for r in SYSTEM_ROLES)


def _to_mongo_doc(role: Role) -> dict:
    """Serialize for MongoDB. We strip default-empty timestamp fields and
    let `$setOnInsert` handle created_at so re-runs don't touch it.
    """
    return {
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "policy": [s.model_dump() for s in role.policy],
    }


async def seed_system_roles() -> dict[str, int]:
    """Upsert every system role. Idempotent.

    Returns counts so the caller (lifespan + the admin endpoint) can log
    "X created, Y updated, Z unchanged" without re-querying.
    """
    now = datetime.now(timezone.utc)
    created = updated = unchanged = 0

    for role in SYSTEM_ROLES:
        doc = _to_mongo_doc(role)
        existing = await roles_coll.find_one({"name": role.name})
        if existing is None:
            await roles_coll.insert_one({**doc, "created_at": now, "updated_at": now})
            created += 1
            continue

        # Only write when the policy or description has actually changed.
        # Comparing serialized dicts keeps the check simple and accurate —
        # field order in `policy` is deterministic because actions are
        # sorted at construction time.
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

    log.info(
        "permissions.seed: created=%d updated=%d unchanged=%d", created, updated, unchanged
    )
    return {"created": created, "updated": updated, "unchanged": unchanged}
