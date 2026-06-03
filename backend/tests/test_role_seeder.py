"""System-role seeding is complete and idempotent."""

import pytest

from dal import role_repository
from services.access_control import role_seeder


@pytest.fixture
def in_memory_roles(monkeypatch):
    store: dict[str, dict] = {}

    async def find(name):
        return store.get(name)

    async def insert(document):
        store[document["name"]] = dict(document)

    async def update(name, fields):
        store[name].update(fields)

    monkeypatch.setattr(role_repository, "find_role_by_name", find)
    monkeypatch.setattr(role_repository, "insert_role", insert)
    monkeypatch.setattr(role_repository, "update_role_fields", update)
    return store


async def test_seed_inserts_every_system_role(in_memory_roles):
    result = await role_seeder.seed_system_roles()
    assert result["created"] == len(role_seeder.SYSTEM_ROLES)
    assert set(in_memory_roles) == set(role_seeder.SYSTEM_ROLE_NAMES)


async def test_seed_is_idempotent(in_memory_roles):
    await role_seeder.seed_system_roles()
    second = await role_seeder.seed_system_roles()
    assert second["created"] == 0
    assert second["unchanged"] == len(role_seeder.SYSTEM_ROLES)


def test_every_user_type_has_a_default_role():
    for default_role in role_seeder.DEFAULT_ROLE_BY_USER_TYPE.values():
        assert default_role in role_seeder.SYSTEM_ROLE_NAMES
