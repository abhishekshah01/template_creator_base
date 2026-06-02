"""create_admin now sets type/attached_roles/inline_policy; ensure_rbac_fields
backfills docs that predate the migration."""

from types import SimpleNamespace

import pytest


@pytest.fixture
def fake_admin_users():
    class FakeAdminUsers:
        def __init__(self):
            self.docs: list[dict] = []

        async def insert_one(self, doc):
            self.docs.append(dict(doc))
            return SimpleNamespace(inserted_id=f"id-{len(self.docs)}")

        async def update_many(self, filter_, update):
            modified = 0
            for d in self.docs:
                if "type" in filter_ and filter_["type"].get("$exists") is False:
                    if "type" in d:
                        continue
                d.update(update.get("$set", {}))
                modified += 1
            return SimpleNamespace(modified_count=modified)

        async def find_one(self, filter_):
            for d in self.docs:
                if all(d.get(k) == v for k, v in filter_.items()):
                    return dict(d)
            return None

    return FakeAdminUsers()


@pytest.fixture(autouse=True)
def patch_admin_users(monkeypatch, fake_admin_users):
    monkeypatch.setattr("clients.mongo_client.admin_users", fake_admin_users)
    monkeypatch.setattr("services.admin_users.admin_users", fake_admin_users)
    return fake_admin_users


@pytest.mark.asyncio
async def test_create_admin_defaults_to_admin_type(fake_admin_users):
    from services import admin_users as svc

    await svc.create_admin(
        account_id="123456789012",
        email="abc@emergent.sh",
        username="abc",
        password="Hunter22x",
    )

    doc = fake_admin_users.docs[0]
    assert doc["type"] == "admin"
    assert doc["attached_roles"] == ["admin-default"]
    assert doc["inline_policy"] == []
    assert doc["is_active"] is True


@pytest.mark.asyncio
async def test_create_owner_attaches_owner_default(fake_admin_users):
    from services import admin_users as svc

    await svc.create_admin(
        account_id="123456789012",
        email="abc@emergent.sh",
        username="abc",
        password="Hunter22x",
        user_type="owner",
    )

    doc = fake_admin_users.docs[0]
    assert doc["type"] == "owner"
    assert doc["attached_roles"] == ["owner-default"]


@pytest.mark.asyncio
async def test_create_member_user_attaches_user_default(fake_admin_users):
    from services import admin_users as svc

    await svc.create_admin(
        account_id="123456789012",
        email="abc@emergent.sh",
        username="abc",
        password="Hunter22x",
        user_type="user",
    )

    doc = fake_admin_users.docs[0]
    assert doc["type"] == "user"
    assert doc["attached_roles"] == ["user-default"]
    assert doc["inline_policy"] == []


@pytest.mark.asyncio
async def test_create_rejects_unknown_type(fake_admin_users):
    from fastapi import HTTPException

    from services import admin_users as svc

    with pytest.raises(HTTPException) as exc:
        await svc.create_admin(
            account_id="123456789012",
            email="abc@emergent.sh",
            username="abc",
            password="Hunter22x",
            user_type="god-mode",
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_ensure_rbac_fields_backfills_pre_migration_docs(fake_admin_users):
    """An admin created before PR3 should gain type/attached_roles/inline_policy
    on the first lifespan that runs the migration."""
    from services import admin_users as svc

    fake_admin_users.docs.append(
        {"_id": "legacy", "username": "old", "email": "old@emergent.sh", "is_active": True}
    )

    modified = await svc.ensure_rbac_fields()

    assert modified == 1
    legacy = fake_admin_users.docs[0]
    assert legacy["type"] == "admin"
    assert legacy["attached_roles"] == ["admin-default"]
    assert legacy["inline_policy"] == []


@pytest.mark.asyncio
async def test_ensure_rbac_fields_is_idempotent(fake_admin_users):
    """Already-migrated docs aren't touched on subsequent runs."""
    from services import admin_users as svc

    fake_admin_users.docs.append(
        {
            "_id": "abc",
            "username": "x",
            "type": "admin",
            "attached_roles": ["S3FullAccess"],
            "inline_policy": [],
        }
    )

    modified = await svc.ensure_rbac_fields()

    assert modified == 0
    # Manually customised attached_roles is preserved — the migration only
    # touches docs missing `type` entirely.
    assert fake_admin_users.docs[0]["attached_roles"] == ["S3FullAccess"]
