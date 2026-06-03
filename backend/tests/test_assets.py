"""Tests for /api/asset/* proxies.

Mocks the upstream app-service /internal/templates/s3/* with respx so no real
HTTP traffic leaves the test process.
"""

import json

import httpx
import pytest
import respx

from authentication.authenticated_user import AuthenticatedUser
from main import app

UPSTREAM_BASE = "/internal/templates/s3"


class _AllowAllUser:
    async def require_permission(self, action, resource):
        return None


@pytest.fixture(autouse=True)
def _bypass_permissions():
    """These tests exercise the proxy layer, not RBAC — satisfy the auth dep."""
    app.dependency_overrides[AuthenticatedUser.require_user] = lambda: _AllowAllUser()
    yield
    app.dependency_overrides.pop(AuthenticatedUser.require_user, None)


def _upstream(app_service_base, suffix):
    return f"{app_service_base}{UPSTREAM_BASE}{suffix}"


def _body(call):
    """Parsed JSON body of an httpx request captured by respx."""
    return json.loads(call.request.content)


# ---------------------------------------------------------------------------
# upload-url
# ---------------------------------------------------------------------------


def test_upload_url_forwards_payload_and_bearer(client, app_service_base):
    upstream_resp = {
        "upload_url": "https://bucket.s3.amazonaws.com/key?sig=...",
        "public_url": "https://cdn.example.com/key",
        "bucket": "my-bucket",
        "key": "assets/x.png",
        "method": "PUT",
        "headers": {"Content-Type": "image/png"},
        "expires_at": 1700000000,
    }
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(_upstream(app_service_base, "/upload-url")).mock(
            return_value=httpx.Response(200, json=upstream_resp),
        )
        body = {
            "bucket": "my-bucket",
            "key": "assets/x.png",
            "content_type": "image/png",
            "bearer_token": "tok-abc",
        }
        resp = client.post("/api/asset/upload-url", json=body)

    assert resp.status_code == 200
    assert resp.json() == upstream_resp
    assert route.calls.call_count == 1
    sent = route.calls[0]
    assert sent.request.headers["authorization"] == "Bearer tok-abc"
    assert _body(sent)["bucket"] == "my-bucket"
    assert _body(sent)["key"] == "assets/x.png"
    assert _body(sent)["content_type"] == "image/png"


def test_create_folder_forwards_payload(client, app_service_base):
    upstream_resp = {"created": True, "bucket": "my-bucket", "key": "assets/new/"}
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(_upstream(app_service_base, "/folder")).mock(
            return_value=httpx.Response(200, json=upstream_resp),
        )
        resp = client.post(
            "/api/asset/create-folder",
            json={"bucket": "my-bucket", "key": "assets/new/", "bearer_token": "tok-abc"},
        )

    assert resp.status_code == 200
    assert resp.json() == upstream_resp
    sent = route.calls[0]
    assert sent.request.headers["authorization"] == "Bearer tok-abc"
    assert _body(sent) == {"bucket": "my-bucket", "key": "assets/new/"}


def test_upload_url_surfaces_upstream_400(client, app_service_base):
    with respx.mock() as mock:
        mock.post(_upstream(app_service_base, "/upload-url")).mock(
            return_value=httpx.Response(400, json={"detail": "Invalid key"}),
        )
        resp = client.post(
            "/api/asset/upload-url",
            json={
                "bucket": "bkt",
                "key": "../bad",
                "bearer_token": "t",
            },
        )
    assert resp.status_code == 400
    assert "Invalid key" in resp.text


def test_upload_mints_then_puts_bytes_server_side(client, app_service_base):
    presigned = "https://s3.example.com/assets/x.png?AWSAccessKeyId=k&Signature=s&Expires=1"
    with respx.mock(assert_all_called=True) as mock:
        mint = mock.post(_upstream(app_service_base, "/upload-url")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "upload_url": presigned,
                    "public_url": "https://cdn.example.com/assets/x.png",
                    "bucket": "my-bucket",
                    "key": "assets/x.png",
                    "method": "PUT",
                    "headers": {"Content-Type": "image/png"},
                    "expires_at": 1700000000,
                },
            ),
        )
        put = mock.put(presigned).mock(return_value=httpx.Response(200))
        resp = client.post(
            "/api/asset/upload",
            data={
                "bucket": "my-bucket",
                "key": "assets/x.png",
                "bearer_token": "tok-abc",
                "content_type": "image/png",
            },
            files={"file": ("x.png", b"\x89PNGbytes", "image/png")},
        )

    assert resp.status_code == 200
    assert resp.json()["public_url"] == "https://cdn.example.com/assets/x.png"
    assert mint.calls[0].request.headers["authorization"] == "Bearer tok-abc"
    # The bytes are PUT to the presigned URL server-side with the signed content-type.
    assert put.calls[0].request.headers["content-type"] == "image/png"
    assert put.calls[0].request.content == b"\x89PNGbytes"


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------


def test_delete_forwards_payload(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(_upstream(app_service_base, "/delete")).mock(
            return_value=httpx.Response(200, json={"deleted": True, "bucket": "bkt", "key": "test-key"}),
        )
        resp = client.post(
            "/api/asset/delete",
            json={
                "bucket": "bkt",
                "key": "test-key",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True
    assert route.calls[0].request.headers["authorization"] == "Bearer tok"


def test_delete_propagates_404(client, app_service_base):
    with respx.mock() as mock:
        mock.post(_upstream(app_service_base, "/delete")).mock(
            return_value=httpx.Response(404, json={"detail": "Object not found"}),
        )
        resp = client.post(
            "/api/asset/delete",
            json={
                "bucket": "bkt",
                "key": "missing-key",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# invalidate
# ---------------------------------------------------------------------------


def test_invalidate_forwards_path_and_dist_id(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(_upstream(app_service_base, "/invalidate")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "invalidated": True,
                    "path": "/assets/x.png",
                    "cloudfront_distribution_id": "E123",
                    "invalidation_id": "I999",
                },
            ),
        )
        resp = client.post(
            "/api/asset/invalidate",
            json={
                "cloudfront_distribution_id": "E123",
                "path": "/assets/x.png",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["invalidation_id"] == "I999"
    body = _body(route.calls[0])
    assert body["path"] == "/assets/x.png"
    assert body["cloudfront_distribution_id"] == "E123"


# ---------------------------------------------------------------------------
# list-buckets
# ---------------------------------------------------------------------------


def test_list_buckets_uses_get_upstream(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(_upstream(app_service_base, "/buckets")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "buckets": [
                        {"name": "bucket-a", "creation_date": "2024-01-01T00:00:00"},
                        {"name": "bucket-b", "creation_date": None},
                    ]
                },
            ),
        )
        resp = client.post("/api/asset/buckets", json={"bearer_token": "tok"})
    assert resp.status_code == 200
    assert len(resp.json()["buckets"]) == 2
    assert route.calls[0].request.headers["authorization"] == "Bearer tok"


# ---------------------------------------------------------------------------
# list-objects
# ---------------------------------------------------------------------------


def test_list_objects_forwards_query_params(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(_upstream(app_service_base, "/objects")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "bucket": "bkt",
                    "prefix": "assets/",
                    "folders": [{"prefix": "assets/icons/", "name": "icons"}],
                    "files": [],
                    "is_truncated": False,
                    "next_continuation_token": None,
                    "key_count": 1,
                },
            ),
        )
        resp = client.post(
            "/api/asset/objects",
            json={
                "bucket": "bkt",
                "prefix": "assets/",
                "page_size": 50,
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    sent_params = dict(route.calls[0].request.url.params)
    assert sent_params["bucket"] == "bkt"
    assert sent_params["prefix"] == "assets/"
    assert sent_params["page_size"] == "50"


def test_list_objects_includes_continuation_when_provided(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(_upstream(app_service_base, "/objects")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "bucket": "bkt",
                    "prefix": "",
                    "folders": [],
                    "files": [],
                    "is_truncated": False,
                    "next_continuation_token": None,
                    "key_count": 0,
                },
            ),
        )
        resp = client.post(
            "/api/asset/objects",
            json={
                "bucket": "bkt",
                "continuation_token": "next-page",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert dict(route.calls[0].request.url.params)["continuation_token"] == "next-page"


# ---------------------------------------------------------------------------
# object-meta
# ---------------------------------------------------------------------------


def test_object_meta_forwards_bucket_and_key(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(_upstream(app_service_base, "/object/meta")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "bucket": "bkt",
                    "key": "test-key",
                    "size": 1234,
                    "content_type": "image/png",
                    "last_modified": None,
                    "etag": "abc",
                    "storage_class": "STANDARD",
                    "version_id": None,
                    "metadata": {},
                    "s3_uri": "s3://b/k",
                    "object_url": "https://b.s3.amazonaws.com/k",
                },
            ),
        )
        resp = client.post(
            "/api/asset/object-meta",
            json={
                "bucket": "bkt",
                "key": "test-key",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["size"] == 1234
    params = dict(route.calls[0].request.url.params)
    assert params == {"bucket": "bkt", "key": "test-key"}


# ---------------------------------------------------------------------------
# download-url
# ---------------------------------------------------------------------------


def test_download_url_forwards_download_flag(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(_upstream(app_service_base, "/download-url")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "url": "https://b.s3.../k?sig=...",
                    "bucket": "bkt",
                    "key": "test-key",
                    "expires_at": 1700000000,
                },
            ),
        )
        resp = client.post(
            "/api/asset/download-url",
            json={
                "bucket": "bkt",
                "key": "test-key",
                "download": True,
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    body = _body(route.calls[0])
    assert body["download"] is True
    assert body["bucket"] == "bkt"
    assert body["key"] == "test-key"


# ---------------------------------------------------------------------------
# transport-level failures
# ---------------------------------------------------------------------------


def test_upstream_unreachable_returns_502(client, app_service_base):
    with respx.mock() as mock:
        mock.post(_upstream(app_service_base, "/delete")).mock(
            side_effect=httpx.ConnectError("boom"),
        )
        resp = client.post(
            "/api/asset/delete",
            json={
                "bucket": "bkt",
                "key": "test-key",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 502
    assert "Failed to reach app-service" in resp.text


def test_upstream_html_error_is_summarized(client, app_service_base):
    """HTML error pages from upstream proxies should be tagged, not dumped raw."""
    with respx.mock() as mock:
        mock.get(_upstream(app_service_base, "/buckets")).mock(
            return_value=httpx.Response(502, text="<html><body>Bad Gateway</body></html>"),
        )
        resp = client.post("/api/asset/buckets", json={"bearer_token": "tok"})
    assert resp.status_code == 502
    assert "HTML" in resp.text
