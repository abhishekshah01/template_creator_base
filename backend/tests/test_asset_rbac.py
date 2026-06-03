"""End-to-end RBAC wiring on /api/asset/*.

Stubs the admin auth dep + the evaluator + the audit writer, then drives
each of the 8 actions through TestClient so we can verify:
  - the right action code is evaluated per route
  - the right resource URI is constructed from the request body
  - upload-url dispatches CreateFolder vs PutObject by key suffix
  - dry-run mode never raises 403
  - enforce mode raises 403 on deny
  - asset_service is bypassed (no upstream calls happen on deny)
"""

import pytest
from fastapi.testclient import TestClient

import config
from schemas.permissions import Decision


@pytest.fixture
def audit_log():
    return []


@pytest.fixture(autouse=True)
def stub_rbac(monkeypatch, audit_log):
    state = {"decision": Decision(effect="allow", reason="explicit allow")}

    async def fake_evaluate(user, action, resource):
        return state["decision"]

    async def fake_record(**kwargs):
        audit_log.append(kwargs)

    async def fake_admin():
        return {"user_id": "u-1", "username": "tester", "type": "admin"}

    async def passthrough(session):
        return session
    monkeypatch.setattr("services.permissions.deps.resolve_user", passthrough)
    monkeypatch.setattr("services.permissions.deps.evaluator.evaluate", fake_evaluate)
    monkeypatch.setattr("services.permissions.deps.audit.record", fake_record)
    # Asset router imports get_current_admin from routers.admin_auth.
    monkeypatch.setattr("routers.admin_auth.get_current_admin", fake_admin)
    monkeypatch.setattr("routers.asset.get_current_admin", fake_admin)
    return state


@pytest.fixture
def upstream_calls(monkeypatch):
    calls: list[tuple[str, dict]] = []

    async def make_fake(name):
        async def fake(*args, **kwargs):
            calls.append((name, kwargs))
            return {"ok": True, "_route": name}
        return fake

    import asyncio
    from services import asset_service

    monkeypatch.setattr(asset_service, "list_buckets", asyncio.run(make_fake("list_buckets")))
    monkeypatch.setattr(asset_service, "list_objects", asyncio.run(make_fake("list_objects")))
    monkeypatch.setattr(asset_service, "object_meta", asyncio.run(make_fake("object_meta")))
    monkeypatch.setattr(asset_service, "mint_download_url", asyncio.run(make_fake("download")))
    monkeypatch.setattr(asset_service, "mint_upload_url", asyncio.run(make_fake("upload")))
    monkeypatch.setattr(asset_service, "delete_object", asyncio.run(make_fake("delete")))
    monkeypatch.setattr(asset_service, "invalidate_cache", asyncio.run(make_fake("invalidate")))
    return calls


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


# ----- per-route mapping (allow path) -----------------------------------


def _last_action(audit_log):
    return audit_log[-1]["action"]


def _last_resource(audit_log):
    return audit_log[-1]["resource"]


def test_buckets_evaluates_listbuckets(client, audit_log, upstream_calls):
    r = client.post("/api/asset/buckets", json={"bearer_token": "x", "force": False})
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:ListBuckets"
    assert _last_resource(audit_log) == "s3://*"


def test_objects_evaluates_listbucket_with_prefix(client, audit_log, upstream_calls):
    r = client.post(
        "/api/asset/objects",
        json={"bucket": "bkt", "prefix": "templates/", "bearer_token": "x", "force": False},
    )
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:ListBucket"
    assert _last_resource(audit_log) == "s3://bkt/templates/"


def test_object_meta_evaluates_getobject(client, audit_log, upstream_calls):
    r = client.post(
        "/api/asset/object-meta",
        json={"bucket": "bkt", "key": "templates/x.png", "bearer_token": "x"},
    )
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:GetObject"
    assert _last_resource(audit_log) == "s3://bkt/templates/x.png"


def test_download_url_evaluates_getobject(client, audit_log, upstream_calls):
    r = client.post(
        "/api/asset/download-url",
        json={"bucket": "bkt", "key": "templates/x.png", "bearer_token": "x", "download": False},
    )
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:GetObject"


def test_upload_url_for_file_evaluates_putobject(client, audit_log, upstream_calls):
    r = client.post(
        "/api/asset/upload-url",
        json={"bucket": "bkt", "key": "templates/x.png", "content_type": "image/png", "bearer_token": "x"},
    )
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:PutObject"


def test_upload_url_for_folder_marker_evaluates_createfolder(client, audit_log, upstream_calls):
    r = client.post(
        "/api/asset/upload-url",
        json={"bucket": "bkt", "key": "templates/new-folder/", "content_type": "application/x-directory", "bearer_token": "x"},
    )
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:CreateFolder"


def test_delete_evaluates_deleteobject(client, audit_log, upstream_calls):
    r = client.post("/api/asset/delete", json={"bucket": "bkt", "key": "x.png", "bearer_token": "x"})
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:DeleteObject"


def test_invalidate_evaluates_invalidatecache(client, audit_log, upstream_calls):
    r = client.post(
        "/api/asset/invalidate",
        json={
            "cloudfront_distribution_id": "E1234",
            "path": "/templates/*",
            "bearer_token": "x",
        },
    )
    assert r.status_code == 200
    assert _last_action(audit_log) == "tc:s3:InvalidateCache"
    assert _last_resource(audit_log) == "cloudfront://E1234/templates/*"


# ----- enforce vs dry-run behaviour -------------------------------------


def test_deny_with_enforce_off_lets_request_through(
    client, audit_log, upstream_calls, stub_rbac, monkeypatch
):
    monkeypatch.setattr(config, "PERMISSIONS_ENFORCE", False)
    stub_rbac["decision"] = Decision(effect="deny", reason="default deny")

    r = client.post("/api/asset/buckets", json={"bearer_token": "x", "force": False})

    assert r.status_code == 200
    assert audit_log[-1]["decision"].effect == "deny"


def test_deny_with_enforce_on_returns_403_and_skips_upstream(
    client, audit_log, upstream_calls, stub_rbac, monkeypatch
):
    monkeypatch.setattr(config, "PERMISSIONS_ENFORCE", True)
    stub_rbac["decision"] = Decision(effect="deny", reason="default deny")
    upstream_calls.clear()

    r = client.post("/api/asset/delete", json={"bucket": "bkt", "key": "x.png", "bearer_token": "x"})

    assert r.status_code == 403
    body = r.json()
    assert body["detail"]["action"] == "tc:s3:DeleteObject"
    assert body["detail"]["resource"] == "s3://bkt/x.png"
    # asset_service.delete_object must not have been called.
    assert not any(name == "delete" for name, _ in upstream_calls)
