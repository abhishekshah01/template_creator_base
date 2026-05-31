"""Tests for /api/deploy-app, /api/deploy-status, /api/deploy-history.

All three are thin proxies to app-service /jobs/v0/deploy*. No pod exec needed.
"""

import httpx
import respx

# ---------------------------------------------------------------------------
# /api/deploy-app
# ---------------------------------------------------------------------------


def test_deploy_app_forwards_run_id_and_url(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        mock.post(f"{app_service_base}/jobs/v0/deploy").mock(
            return_value=httpx.Response(200, json={"run_id": "run-1", "deploy_url": "https://x.app"}),
        )
        resp = client.post("/api/deploy-app", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["run_id"] == "run-1"
    assert body["deploy_url"] == "https://x.app"


def test_deploy_app_401_is_relabeled_unauthorized(client, app_service_base):
    with respx.mock() as mock:
        mock.post(f"{app_service_base}/jobs/v0/deploy").mock(
            return_value=httpx.Response(401, text="nope"),
        )
        resp = client.post("/api/deploy-app", json={"job_id": "j-1", "bearer_token": "bad"})
    assert resp.status_code == 401
    assert "Unauthorized" in resp.text


# ---------------------------------------------------------------------------
# /api/deploy-status
# ---------------------------------------------------------------------------


def test_deploy_status_extracts_latest_run(client, app_service_base):
    payload = {
        "latest_run": {
            "status": "success",
            "steps": [{"name": "build", "status": "success"}],
            "deploy_url": "https://x.app",
        },
    }
    with respx.mock(assert_all_called=True) as mock:
        mock.get(f"{app_service_base}/jobs/v0/deploy/j-1/latest").mock(
            return_value=httpx.Response(200, json=payload),
        )
        resp = client.post("/api/deploy-status", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["deploy_url"] == "https://x.app"
    assert len(body["steps"]) == 1


def test_deploy_status_404_returns_no_deployment(client, app_service_base):
    with respx.mock() as mock:
        mock.get(f"{app_service_base}/jobs/v0/deploy/j-1/latest").mock(
            return_value=httpx.Response(404, text="nope"),
        )
        resp = client.post("/api/deploy-status", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "no_deployment"


# ---------------------------------------------------------------------------
# /api/deploy-history
# ---------------------------------------------------------------------------


def test_deploy_history_handles_list_payload(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        mock.get(f"{app_service_base}/jobs/v0/deploy/j-1/history").mock(
            return_value=httpx.Response(200, json=[{"run_id": "r1"}, {"run_id": "r2"}]),
        )
        resp = client.post("/api/deploy-history", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["deployments"]) == 2
    assert body["deployed_run_id"] is None


def test_deploy_history_handles_dict_payload(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        mock.get(f"{app_service_base}/jobs/v0/deploy/j-1/history").mock(
            return_value=httpx.Response(
                200,
                json={"runs": [{"run_id": "r1"}], "deployed_run_id": "r1"},
            ),
        )
        resp = client.post("/api/deploy-history", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["deployments"][0]["run_id"] == "r1"
    assert body["deployed_run_id"] == "r1"


def test_deploy_history_404_returns_empty_list(client, app_service_base):
    with respx.mock() as mock:
        mock.get(f"{app_service_base}/jobs/v0/deploy/j-1/history").mock(
            return_value=httpx.Response(404, text="nope"),
        )
        resp = client.post("/api/deploy-history", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    assert resp.json()["deployments"] == []
