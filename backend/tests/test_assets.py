"""Tests for /api/asset/* proxies.

Mocks the upstream app-service /internal/s3-templates/* with respx so no real
HTTP traffic leaves the test process.
"""

import json

import httpx
import respx

UPSTREAM_BASE = "/internal/s3-templates"


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


def test_upload_url_surfaces_upstream_400(client, app_service_base):
    with respx.mock() as mock:
        mock.post(_upstream(app_service_base, "/upload-url")).mock(
            return_value=httpx.Response(400, json={"detail": "Invalid key"}),
        )
        resp = client.post(
            "/api/asset/upload-url",
            json={
                "bucket": "b",
                "key": "../bad",
                "bearer_token": "t",
            },
        )
    assert resp.status_code == 400
    assert "Invalid key" in resp.text


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------


def test_delete_forwards_payload(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(_upstream(app_service_base, "/delete")).mock(
            return_value=httpx.Response(200, json={"deleted": True, "bucket": "b", "key": "k"}),
        )
        resp = client.post(
            "/api/asset/delete",
            json={
                "bucket": "b",
                "key": "k",
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
                "bucket": "b",
                "key": "missing",
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
                    "bucket": "b",
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
                "bucket": "b",
                "prefix": "assets/",
                "page_size": 50,
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    sent_params = dict(route.calls[0].request.url.params)
    assert sent_params["bucket"] == "b"
    assert sent_params["prefix"] == "assets/"
    assert sent_params["page_size"] == "50"


def test_list_objects_includes_continuation_when_provided(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(_upstream(app_service_base, "/objects")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "bucket": "b",
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
                "bucket": "b",
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
                    "bucket": "b",
                    "key": "k",
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
                "bucket": "b",
                "key": "k",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["size"] == 1234
    params = dict(route.calls[0].request.url.params)
    assert params == {"bucket": "b", "key": "k"}


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
                    "bucket": "b",
                    "key": "k",
                    "expires_at": 1700000000,
                },
            ),
        )
        resp = client.post(
            "/api/asset/download-url",
            json={
                "bucket": "b",
                "key": "k",
                "download": True,
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    body = _body(route.calls[0])
    assert body["download"] is True
    assert body["bucket"] == "b"
    assert body["key"] == "k"


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
                "bucket": "b",
                "key": "k",
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
