"""Tests for /api/category-config CRUD + template summary proxies."""

import json

import httpx
import respx

UPSTREAM = "/internal/category-config"


def _body(call):
    return json.loads(call.request.content)


def test_list_unwraps_array_envelope(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        mock.get(f"{app_service_base}{UPSTREAM}").mock(
            return_value=httpx.Response(200, json={"configs": [{"id": 1, "template_name": "x"}]}),
        )
        resp = client.post("/api/list-category-configs", json={"bearer_token": "tok"})
    assert resp.status_code == 200
    assert resp.json() == [{"id": 1, "template_name": "x"}]


def test_list_passes_through_plain_array(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        mock.get(f"{app_service_base}{UPSTREAM}").mock(
            return_value=httpx.Response(200, json=[{"id": 1}, {"id": 2}]),
        )
        resp = client.post("/api/list-category-configs", json={"bearer_token": "tok"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_create_forwards_full_payload(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(f"{app_service_base}{UPSTREAM}").mock(
            return_value=httpx.Response(200, json={"id": 42}),
        )
        resp = client.post(
            "/api/category-config",
            json={
                "template_name": "abc",
                "config": {"foo": "bar"},
                "default_env_config": {"baz": "qux"},
                "summary_source_job_id": "job-1",
                "internal": True,
                "public": False,
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    body = _body(route.calls[0])
    assert body["template_name"] == "abc"
    assert body["config"] == {"foo": "bar"}
    assert "bearer_token" not in body


def test_get_by_id_uses_path_param(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.get(f"{app_service_base}{UPSTREAM}/42").mock(
            return_value=httpx.Response(200, json={"id": 42, "template_name": "x"}),
        )
        resp = client.post(
            "/api/get-category-config",
            json={
                "config_id": "42",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert route.calls[0].request.url.path.endswith("/42")


def test_update_uses_put(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.put(f"{app_service_base}{UPSTREAM}/42").mock(
            return_value=httpx.Response(200, json={"id": 42}),
        )
        resp = client.post(
            "/api/update-category-config",
            json={
                "config_id": "42",
                "template_name": "abc",
                "config": {},
                "default_env_config": {},
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert route.calls[0].request.method == "PUT"


def test_template_summary_forwards(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(f"{app_service_base}{UPSTREAM}/template-app-summary").mock(
            return_value=httpx.Response(200, json={"summary": "ok"}),
        )
        resp = client.post(
            "/api/template-summary",
            json={
                "template_name": "lumina",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 200
    assert _body(route.calls[0]) == {"template_name": "lumina"}


def test_upstream_404_propagates(client, app_service_base):
    with respx.mock() as mock:
        mock.get(f"{app_service_base}{UPSTREAM}/99").mock(
            return_value=httpx.Response(404, json={"detail": "not found"}),
        )
        resp = client.post(
            "/api/get-category-config",
            json={
                "config_id": "99",
                "bearer_token": "tok",
            },
        )
    assert resp.status_code == 404
