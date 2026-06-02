"""Idempotency tests for the system-role seed.

The seed runs on every app startup, so it must be exactly-once in effect:
first start creates the roles, second start sees no changes, editing the
seed file updates the matching role on the next start.
"""

from types import SimpleNamespace

import pytest


@pytest.fixture
def fake_roles():
    """In-memory replacement for the `roles` Mongo collection.

    Only implements the surface the seed module actually uses
    (find_one, insert_one, update_one). Mirrors the FakeCollection
    pattern already used by test_template.py.
    """

    class FakeRoles:
        def __init__(self):
            self.docs: dict[str, dict] = {}
            self.inserts = 0
            self.updates = 0

        async def find_one(self, filter_):
            name = filter_.get("name")
            doc = self.docs.get(name)
            return dict(doc) if doc else None

        async def insert_one(self, doc):
            self.docs[doc["name"]] = dict(doc)
            self.inserts += 1
            return SimpleNamespace(inserted_id="x")

        async def update_one(self, filter_, update):
            name = filter_["name"]
            existing = self.docs.get(name)
            if not existing:
                return SimpleNamespace(matched_count=0)
            existing.update(update.get("$set", {}))
            self.updates += 1
            return SimpleNamespace(matched_count=1)

    return FakeRoles()


@pytest.fixture(autouse=True)
def patch_roles(monkeypatch, fake_roles):
    monkeypatch.setattr("clients.mongo_client.roles", fake_roles)
    monkeypatch.setattr("services.permissions.seed.roles_coll", fake_roles)
    return fake_roles


@pytest.mark.asyncio
async def test_first_seed_creates_every_role(fake_roles):
    from services.permissions import seed

    result = await seed.seed_system_roles()

    assert result["created"] == len(seed.SYSTEM_ROLES)
    assert result["updated"] == 0
    assert result["unchanged"] == 0
    assert set(fake_roles.docs.keys()) == set(seed.SYSTEM_ROLE_NAMES)


@pytest.mark.asyncio
async def test_repeat_seed_is_a_noop(fake_roles):
    from services.permissions import seed

    await seed.seed_system_roles()
    fake_roles.inserts = 0
    fake_roles.updates = 0

    result = await seed.seed_system_roles()

    assert result["created"] == 0
    assert result["updated"] == 0
    assert result["unchanged"] == len(seed.SYSTEM_ROLES)
    assert fake_roles.inserts == 0
    assert fake_roles.updates == 0


@pytest.mark.asyncio
async def test_seed_updates_a_role_with_changed_policy(fake_roles):
    from services.permissions import seed

    await seed.seed_system_roles()

    # Mutate one role's stored policy as if someone edited Mongo directly.
    fake_roles.docs["S3ReadOnlyAccess"]["policy"] = []
    fake_roles.inserts = 0
    fake_roles.updates = 0

    result = await seed.seed_system_roles()

    assert result["created"] == 0
    assert result["updated"] == 1
    assert result["unchanged"] == len(seed.SYSTEM_ROLES) - 1
    # The roll-forward should restore the policy to the seed file's value.
    assert len(fake_roles.docs["S3ReadOnlyAccess"]["policy"]) == 1


@pytest.mark.asyncio
async def test_every_attachable_role_carries_only_known_actions(fake_roles):
    """A system role with an unknown action would crash the evaluator at
    runtime. Pin that the seed never produces one."""
    from services.permissions import actions, seed

    await seed.seed_system_roles()

    for role in seed.ATTACHABLE_ROLES:
        for stmt in role.policy:
            for a in stmt.actions:
                if "*" not in a:
                    assert a in actions.ALL_ACTIONS, f"role {role.name} has unknown action {a}"


@pytest.mark.asyncio
async def test_kind_default_roles_exist(fake_roles):
    """Every user kind has its `-default` role seeded so user creation can
    auto-attach without a runtime existence check."""
    from services.permissions import seed

    await seed.seed_system_roles()

    for name in ("owner-default", "admin-default", "user-default"):
        assert name in fake_roles.docs


@pytest.mark.asyncio
async def test_owner_default_role_has_wildcard_policy(fake_roles):
    from services.permissions import seed

    await seed.seed_system_roles()

    owner = fake_roles.docs["owner-default"]
    assert owner["policy"] == [
        {"effect": "allow", "actions": ["*"], "resources": ["*"]}
    ]


@pytest.mark.asyncio
async def test_user_default_role_has_empty_policy(fake_roles):
    """The 'zero permissions by default' rule lives in the seed file — pin
    it so a future seed edit can't silently grant new users access."""
    from services.permissions import seed

    await seed.seed_system_roles()

    user_default = fake_roles.docs["user-default"]
    assert user_default["policy"] == []
