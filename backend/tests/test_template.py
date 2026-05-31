"""Tests for /api/create-template (gcloud SSH flow).

Patches subprocess.run + FileNotFoundError so no real gcloud invocation happens.
"""

import subprocess
from types import SimpleNamespace


def test_rejects_invalid_template_name(client):
    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "bad name!"},
    )
    assert resp.status_code == 400


def test_success_returns_gcs_path(client, monkeypatch):
    captured = {}

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        return SimpleNamespace(returncode=0, stdout="created ok", stderr="")

    monkeypatch.setattr("services.template_service.subprocess.run", fake_run)

    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["gcs_path"].endswith("/lumina")
    assert "lumina" in " ".join(captured["cmd"])


def test_nonzero_exit_reports_failed_status(client, monkeypatch):
    monkeypatch.setattr(
        "services.template_service.subprocess.run",
        lambda cmd, **kwargs: SimpleNamespace(returncode=1, stdout="", stderr="boom"),
    )
    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "failed"
    assert "boom" in body["error"]


def test_gcloud_missing_returns_500(client, monkeypatch):
    def fake_run(cmd, **kwargs):
        raise FileNotFoundError()

    monkeypatch.setattr("services.template_service.subprocess.run", fake_run)
    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 500
    assert "gcloud CLI not found" in resp.json()["detail"]


def test_timeout_returns_504(client, monkeypatch):
    def fake_run(cmd, **kwargs):
        raise subprocess.TimeoutExpired(cmd=cmd, timeout=300)

    monkeypatch.setattr("services.template_service.subprocess.run", fake_run)
    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 504
