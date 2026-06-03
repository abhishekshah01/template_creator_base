"""Each /api/asset/* route resolves the right (action, resource) and a denial
short-circuits before the upstream proxy is called."""

import pytest
from fastapi.testclient import TestClient

from authentication.authenticated_user import AuthenticatedUser
from exceptions import PermissionDeniedError
from main import app
from services import asset_service
from services.access_control.permission_catalog import S3Action

BUCKET = "my-bucket"
TOKEN = "bearer-xyz"


class RecordingUser:
    def __init__(self):
        self.checks: list[tuple[str, str]] = []
        self.deny = False

    async def require_permission(self, action, resource):
        self.checks.append((str(action), resource))
        if self.deny:
            raise PermissionDeniedError(action=action, resource=resource, reason="explicit deny")


@pytest.fixture
def actor():
    return RecordingUser()


@pytest.fixture
def upstream_calls(monkeypatch):
    calls: list[str] = []

    def stub(name):
        async def fake(*args, **kwargs):
            calls.append(name)
            return {"ok": True}

        return fake

    for name in (
        "mint_upload_url",
        "delete_object",
        "invalidate_cache",
        "list_buckets",
        "list_objects",
        "object_meta",
        "mint_download_url",
    ):
        monkeypatch.setattr(asset_service, name, stub(name))
    return calls


@pytest.fixture
def client(actor):
    app.dependency_overrides[AuthenticatedUser.require_user] = lambda: actor
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_buckets_checks_list_buckets(client, actor, upstream_calls):
    resp = client.post("/api/asset/buckets", json={"bearer_token": TOKEN})
    assert resp.status_code == 200
    assert actor.checks == [(str(S3Action.LIST_BUCKETS), "s3://*")]
    assert upstream_calls == ["list_buckets"]


def test_objects_builds_prefixed_resource(client, actor, upstream_calls):
    client.post("/api/asset/objects", json={"bucket": BUCKET, "prefix": "images/", "bearer_token": TOKEN})
    assert actor.checks == [(str(S3Action.LIST_BUCKET), f"s3://{BUCKET}/images/")]


def test_upload_file_uses_put_object(client, actor, upstream_calls):
    client.post("/api/asset/upload-url", json={"bucket": BUCKET, "key": "a/b.png", "bearer_token": TOKEN})
    assert actor.checks == [(str(S3Action.PUT_OBJECT), f"s3://{BUCKET}/a/b.png")]


def test_upload_folder_marker_uses_create_folder(client, actor, upstream_calls):
    client.post("/api/asset/upload-url", json={"bucket": BUCKET, "key": "a/", "bearer_token": TOKEN})
    assert actor.checks == [(str(S3Action.CREATE_FOLDER), f"s3://{BUCKET}/a/")]


def test_delete_checks_delete_object(client, actor, upstream_calls):
    client.post("/api/asset/delete", json={"bucket": BUCKET, "key": "x.png", "bearer_token": TOKEN})
    assert actor.checks == [(str(S3Action.DELETE_OBJECT), f"s3://{BUCKET}/x.png")]


def test_denied_request_returns_403_and_skips_upstream(client, actor, upstream_calls):
    actor.deny = True
    resp = client.post("/api/asset/delete", json={"bucket": BUCKET, "key": "x.png", "bearer_token": TOKEN})
    assert resp.status_code == 403
    assert resp.json()["detail"]["error"] == "permission_denied"
    assert upstream_calls == []
