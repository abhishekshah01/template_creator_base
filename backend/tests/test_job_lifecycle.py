"""Tests for /api/restart-job and /api/pause-job."""

import httpx
import respx

# ---------------------------------------------------------------------------
# /api/restart-job
# ---------------------------------------------------------------------------


def test_restart_job_success_forwards_status(client, app_service_base):
    with respx.mock(assert_all_called=True) as mock:
        mock.post(f"{app_service_base}/jobs/v0/j-1/restart-environment").mock(
            return_value=httpx.Response(200, json={"status": "ok", "message": "restarted"}),
        )
        resp = client.post("/api/restart-job", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["message"] == "restarted"


def test_restart_job_read_timeout_treated_as_accepted(client, app_service_base):
    """Restart can take longer than our HTTP timeout; we still report 'accepted'."""
    with respx.mock() as mock:
        mock.post(f"{app_service_base}/jobs/v0/j-1/restart-environment").mock(
            side_effect=httpx.ReadTimeout("idle"),
        )
        resp = client.post("/api/restart-job", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"


def test_restart_job_401_is_relabeled_unauthorized(client, app_service_base):
    with respx.mock() as mock:
        mock.post(f"{app_service_base}/jobs/v0/j-1/restart-environment").mock(
            return_value=httpx.Response(401, text="nope"),
        )
        resp = client.post("/api/restart-job", json={"job_id": "j-1", "bearer_token": "bad"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /api/pause-job
# ---------------------------------------------------------------------------


def test_pause_job_forwards_status_and_message(client, pause_base):
    with respx.mock(assert_all_called=True) as mock:
        mock.post(f"{pause_base}/v0/pause-environment/j-1").mock(
            return_value=httpx.Response(200, json={"status": "success", "message": "paused"}),
        )
        resp = client.post("/api/pause-job", json={"job_id": "j-1"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["message"] == "paused"


def test_pause_job_upstream_error_propagates(client, pause_base):
    with respx.mock() as mock:
        mock.post(f"{pause_base}/v0/pause-environment/j-1").mock(
            return_value=httpx.Response(500, text="snapshot failed"),
        )
        resp = client.post("/api/pause-job", json={"job_id": "j-1"})
    assert resp.status_code == 500
    assert "snapshot failed" in resp.text
