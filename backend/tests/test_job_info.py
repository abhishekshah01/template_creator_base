"""Tests for /api/job-info and /api/env-variables.

Both endpoints resolve env_id via app-service /internal/verify-ownership and
then talk to envcore. respx mocks both upstreams.
"""

import httpx
import respx


def _mock_env_id(mock, app_service_base, pod_id="pod-uuid-xyz"):
    """Make /internal/verify-ownership return a valid pod_id."""
    mock.get(f"{app_service_base}/internal/verify-ownership").mock(
        return_value=httpx.Response(200, json={"pod_id": pod_id}),
    )


# ---------------------------------------------------------------------------
# /api/job-info
# ---------------------------------------------------------------------------


def test_job_info_returns_pod_metadata(client, app_service_base, envcore_base):
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base, pod_id="pod-123")
        mock.get(f"{app_service_base}/jobs/v0/j-1/").mock(
            return_value=httpx.Response(200, json={"created_by": "user-42"}),
        )
        mock.get(f"{envcore_base}/api/v1/env/info").mock(
            return_value=httpx.Response(200, json={"pod_name": "agent-env-pod-123"}),
        )
        resp = client.post("/api/job-info", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["env_id"] == "pod-123"
    assert body["user_id"] == "user-42"
    assert body["is_running"] is True
    assert body["is_paused"] is False


def test_job_info_404_when_pod_id_matches_job_id(client, app_service_base):
    """API returning pod_id == job_id means 'not found in this env'."""
    with respx.mock() as mock:
        mock.get(f"{app_service_base}/internal/verify-ownership").mock(
            return_value=httpx.Response(200, json={"pod_id": "j-missing"}),
        )
        resp = client.post("/api/job-info", json={"job_id": "j-missing", "bearer_token": "tok"})
    assert resp.status_code == 404


def test_job_info_handles_envcore_error_as_paused(client, app_service_base, envcore_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        mock.get(f"{app_service_base}/jobs/v0/j-1/").mock(
            return_value=httpx.Response(200, json={"created_by": "u"}),
        )
        mock.get(f"{envcore_base}/api/v1/env/info").mock(
            return_value=httpx.Response(500, json={"detail": "down"}),
        )
        resp = client.post("/api/job-info", json={"job_id": "j-1", "bearer_token": "tok"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_running"] is False
    assert body["is_paused"] is True
    assert "error" in body["pod_info"]


# ---------------------------------------------------------------------------
# /api/env-variables
# ---------------------------------------------------------------------------


def test_env_variables_parses_env_file(client, app_service_base, envcore_base):
    """Non-sensitive keys come through; secret-looking keys are redacted."""
    env_file = (
        "MONGO_URL=mongodb://localhost:27017/mydb\n"
        "DB_NAME=mydb\n"
        "NODE_ENV=production\n"
        "# a comment\n"
        "API_KEY='abc123'\n"
        "DB_PASSWORD=hunter2\n"
        "GITHUB_TOKEN=ghp_zzz\n"
    )
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            return_value=httpx.Response(200, json={"stdout": env_file, "stderr": "", "return_code": 0}),
        )
        resp = client.post("/api/env-variables", json={"job_id": "j-1"})
    assert resp.status_code == 200
    env_vars = resp.json()["env_variables"]
    # Non-sensitive keys pass through
    assert env_vars["MONGO_URL"] == "mongodb://localhost:27017/mydb"
    assert env_vars["DB_NAME"] == "mydb"
    assert env_vars["NODE_ENV"] == "production"
    # Sensitive keys are redacted
    assert env_vars["API_KEY"] == "REDACTED"
    assert env_vars["DB_PASSWORD"] == "REDACTED"
    assert env_vars["GITHUB_TOKEN"] == "REDACTED"
    assert "# a comment" not in env_vars


def test_env_variables_404_for_unknown_job(client, app_service_base):
    with respx.mock() as mock:
        mock.get(f"{app_service_base}/internal/verify-ownership").mock(
            return_value=httpx.Response(200, json={"pod_id": "j-missing"}),
        )
        resp = client.post("/api/env-variables", json={"job_id": "j-missing"})
    assert resp.status_code == 404
