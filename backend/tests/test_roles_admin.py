"""Role + user-role management endpoints (PR8).

Owner-only enforcement is provided by the same require/check path —
non-owners hit default deny when PERMISSIONS_ENFORCE is on. Tests focus
on the CRUD shape and the safety rails (system-role lock, default-role
detach lock)."""

from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

import config


@pytest.fixture
def audit_log():
    return []


@pytest.fixture
def fake_admin_users():
    class FakeAdminUsers:
        def __init__(self):
            self.docs: dict[ObjectId, dict] = {}

        async def find_one(self, filter_):
            if "_id" in filter_:
                doc = self.docs.get(filter_["_id"])
                return dict(doc) if doc else None
            for d in self.docs.values():
                if all(d.get(k) == v for k, v in filter_.items()):
                    return dict(d)
            return None

        async def update_one(self, filter_, update):
            doc = self.docs.get(filter_["_id"])
            if not doc:
                return SimpleNamespace(matched_count=0)
            if "$set" in update:
                doc.update(update["$set"])
            if "$addToSet" in update:
                for key, value in update["$addToSet"].items():
                    cur = doc.setdefault(key, [])
                    if isinstance(value, dict) and "$each" in value:
                        for v in value["$each"]:
                            if v not in cur:
                                cur.append(v)
                    elif value not in cur:
                        cur.append(value)
            if "$pull" in update:
                for key, value in update["$pull"].items():
                    cur = doc.get(key, [])
                    if isinstance(value, dict) and "$in" in value:
                        doc[key] = [x for x in cur if x not in value["$in"]]
                    else:
                        doc[key] = [x for x in cur if x != value]
            return SimpleNamespace(matched_count=1)

    return FakeAdminUsers()


@pytest.fixture
def fake_roles():
    class FakeRoles:
        def __init__(self):
            self.docs: dict[str, dict] = {}

        def find(self, filter_=None):
            rows = list(self.docs.values())

            class Cursor:
                def __init__(self, rows): self.rows = rows
                def sort(self, *a, **kw): return self
                async def to_list(self, length): return [dict(r) for r in self.rows[:length]]

            return Cursor(rows)

        async def find_one(self, filter_, projection=None):
            name = filter_.get("name")
            doc = self.docs.get(name)
            return dict(doc) if doc else None

        async def insert_one(self, doc):
            self.docs[doc["name"]] = dict(doc)
            return SimpleNamespace(inserted_id="x")

        async def update_one(self, filter_, update):
            name = filter_["name"]
            if name not in self.docs:
                return SimpleNamespace(matched_count=0)
            self.docs[name].update(update.get("$set", {}))
            return SimpleNamespace(matched_count=1)

        async def delete_one(self, filter_):
            name = filter_["name"]
            existed = name in self.docs
            self.docs.pop(name, None)
            return SimpleNamespace(deleted_count=int(existed))

    coll = FakeRoles()
    coll.docs["S3ReadOnlyAccess"] = {
        "name": "S3ReadOnlyAccess",
        "description": "Read only",
        "is_system": True,
        "policy": [
            {"effect": "allow", "actions": ["tc:s3:GetObject"], "resources": ["s3://*"]}
        ],
    }
    coll.docs["S3ReadWriteAccess"] = {
        "name": "S3ReadWriteAccess",
        "description": "Read + write",
        "is_system": True,
        "policy": [],
    }
    coll.docs["admin-default"] = {
        "name": "admin-default",
        "description": "Default for admins",
        "is_system": True,
        "policy": [],
    }
    return coll


@pytest.fixture(autouse=True)
def stub_env(monkeypatch, audit_log, fake_roles, fake_admin_users):
    async def fake_record(**kwargs):
        audit_log.append(kwargs)

    async def passthrough(session):
        return session
    monkeypatch.setattr("services.permissions.deps.load_actor", passthrough)
    monkeypatch.setattr("services.permissions.deps.audit.record", fake_record)
    monkeypatch.setattr("clients.mongo_client.roles", fake_roles)
    monkeypatch.setattr("services.role_service.roles_coll", fake_roles)
    monkeypatch.setattr("clients.mongo_client.admin_users", fake_admin_users)
    monkeypatch.setattr("services.admin_users.admin_users", fake_admin_users)
    monkeypatch.setattr("services.user_roles_service.admin_users", fake_admin_users)


def _login_as(app, user_type: str, user_id: ObjectId = None):
    user_id = user_id or ObjectId()
    user = {"admin_id": user_id, "username": user_type, "type": user_type, "is_admin": False}

    async def fake_admin():
        return user

    from routers.admin_auth import get_current_admin
    app.dependency_overrides[get_current_admin] = fake_admin
    return user


@pytest.fixture
def app():
    from main import app as _app
    yield _app
    _app.dependency_overrides.clear()


@pytest.fixture
def client(app):
    return TestClient(app)


# ----- role read paths --------------------------------------------------


def test_owner_can_list_roles(client, monkeypatch, app):
    _login_as(app, "owner")
    r = client.get("/api/admin-auth/roles")
    assert r.status_code == 200
    names = {item["name"] for item in r.json()["items"]}
    assert "S3ReadOnlyAccess" in names


def test_owner_can_get_role(client, monkeypatch, app):
    _login_as(app, "owner")
    r = client.get("/api/admin-auth/roles/S3ReadOnlyAccess")
    assert r.status_code == 200
    assert r.json()["name"] == "S3ReadOnlyAccess"


def test_get_role_404(client, monkeypatch, app):
    _login_as(app, "owner")
    r = client.get("/api/admin-auth/roles/DoesNotExist")
    assert r.status_code == 404


def test_non_owner_blocked_when_enforce_on(client, monkeypatch, app):
    monkeypatch.setattr(config, "PERMISSIONS_ENFORCE", True)
    _login_as(app, "user")
    r = client.get("/api/admin-auth/roles")
    assert r.status_code == 403


# ----- role mutation safety -------------------------------------------


def test_owner_can_create_custom_role(client, monkeypatch, app, fake_roles):
    _login_as(app, "owner")
    r = client.post("/api/admin-auth/roles", json={
        "name": "CustomReader",
        "description": "scoped reader",
        "policy": [
            {"effect": "allow", "actions": ["tc:s3:GetObject"], "resources": ["s3://b/templates/*"]}
        ],
    })
    assert r.status_code == 201
    assert "CustomReader" in fake_roles.docs
    assert fake_roles.docs["CustomReader"]["is_system"] is False


def test_create_role_rejects_duplicate(client, monkeypatch, app):
    _login_as(app, "owner")
    r = client.post("/api/admin-auth/roles", json={
        "name": "S3ReadOnlyAccess",
        "policy": [],
    })
    assert r.status_code == 409


def test_create_role_rejects_unknown_action_in_policy(client, monkeypatch, app):
    _login_as(app, "owner")
    r = client.post("/api/admin-auth/roles", json={
        "name": "BogusRole",
        "policy": [{"effect": "allow", "actions": ["tc:s3:Hadouken"], "resources": ["*"]}],
    })
    assert r.status_code == 422


def test_cannot_update_system_role(client, monkeypatch, app):
    _login_as(app, "owner")
    r = client.patch(
        "/api/admin-auth/roles/S3ReadOnlyAccess",
        json={"description": "tampered"},
    )
    assert r.status_code == 403


def test_cannot_delete_system_role(client, monkeypatch, app):
    _login_as(app, "owner")
    r = client.delete("/api/admin-auth/roles/S3ReadOnlyAccess")
    assert r.status_code == 403


def test_can_update_then_delete_custom_role(client, monkeypatch, app, fake_roles):
    _login_as(app, "owner")

    create = client.post("/api/admin-auth/roles", json={
        "name": "MyRole", "policy": [],
    })
    assert create.status_code == 201

    upd = client.patch("/api/admin-auth/roles/MyRole", json={"description": "updated"})
    assert upd.status_code == 200
    assert fake_roles.docs["MyRole"]["description"] == "updated"

    delete = client.delete("/api/admin-auth/roles/MyRole")
    assert delete.status_code == 204
    assert "MyRole" not in fake_roles.docs


# ----- user role attachment --------------------------------------------


def test_attach_role_to_user(client, monkeypatch, app, fake_admin_users):
    _login_as(app, "owner")
    bob_id = ObjectId()
    fake_admin_users.docs[bob_id] = {
        "_id": bob_id,
        "username": "bob",
        "type": "admin",
        "attached_roles": ["admin-default"],
    }

    r = client.patch(
        f"/api/admin-auth/users/{bob_id}/roles/attach",
        json={"names": ["S3ReadOnlyAccess"]},
    )
    assert r.status_code == 200
    assert "S3ReadOnlyAccess" in fake_admin_users.docs[bob_id]["attached_roles"]


def test_attach_unknown_role_fails(client, monkeypatch, app, fake_admin_users):
    _login_as(app, "owner")
    bob_id = ObjectId()
    fake_admin_users.docs[bob_id] = {"_id": bob_id, "username": "bob", "type": "admin", "attached_roles": ["admin-default"]}

    r = client.patch(
        f"/api/admin-auth/users/{bob_id}/roles/attach",
        json={"names": ["DoesNotExist"]},
    )
    assert r.status_code == 400


def test_detach_role_from_user(client, monkeypatch, app, fake_admin_users):
    _login_as(app, "owner")
    bob_id = ObjectId()
    fake_admin_users.docs[bob_id] = {
        "_id": bob_id, "username": "bob", "type": "admin",
        "attached_roles": ["admin-default", "S3ReadOnlyAccess"],
    }

    r = client.patch(
        f"/api/admin-auth/users/{bob_id}/roles/detach",
        json={"names": ["S3ReadOnlyAccess"]},
    )
    assert r.status_code == 200
    assert fake_admin_users.docs[bob_id]["attached_roles"] == ["admin-default"]


def test_cannot_detach_kind_default_role(client, monkeypatch, app, fake_admin_users):
    _login_as(app, "owner")
    bob_id = ObjectId()
    fake_admin_users.docs[bob_id] = {
        "_id": bob_id, "username": "bob", "type": "admin",
        "attached_roles": ["admin-default"],
    }

    r = client.patch(
        f"/api/admin-auth/users/{bob_id}/roles/detach",
        json={"names": ["admin-default"]},
    )
    assert r.status_code == 400


# ----- inline policy ----------------------------------------------------


def test_set_inline_policy_overwrites(client, monkeypatch, app, fake_admin_users):
    _login_as(app, "owner")
    bob_id = ObjectId()
    fake_admin_users.docs[bob_id] = {
        "_id": bob_id, "username": "bob", "type": "admin",
        "attached_roles": ["admin-default"], "inline_policy": [],
    }

    r = client.put(
        f"/api/admin-auth/users/{bob_id}/inline-policy",
        json={"policy": [
            {"effect": "deny", "actions": ["tc:s3:DeleteObject"], "resources": ["*"]}
        ]},
    )
    assert r.status_code == 200
    inline = fake_admin_users.docs[bob_id]["inline_policy"]
    assert len(inline) == 1
    assert inline[0]["effect"] == "deny"


def test_set_inline_policy_rejects_invalid_action(client, monkeypatch, app, fake_admin_users):
    _login_as(app, "owner")
    bob_id = ObjectId()
    fake_admin_users.docs[bob_id] = {"_id": bob_id, "username": "bob", "type": "admin", "attached_roles": [], "inline_policy": []}

    r = client.put(
        f"/api/admin-auth/users/{bob_id}/inline-policy",
        json={"policy": [
            {"effect": "allow", "actions": ["tc:s3:Hadouken"], "resources": ["*"]}
        ]},
    )
    assert r.status_code == 422
