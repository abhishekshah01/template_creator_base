"""Tests for /api/environments and /api/switch-environment."""

import config


def test_environments_returns_active_config(client):
    resp = client.get("/api/environments")
    assert resp.status_code == 200
    body = resp.json()
    assert body["deployment_scope"] == "dev"
    assert "active_config" in body
    assert body["active_config"]["api_url"] == config.API_URL


def test_switch_environment_to_known_env(client):
    resp = client.post("/api/switch-environment", json={"env_name": "dev"})
    assert resp.status_code == 200
    assert resp.json()["env"] == "dev"


def test_switch_environment_rejects_empty(client):
    resp = client.post("/api/switch-environment", json={"env_name": ""})
    assert resp.status_code == 400


def test_switch_environment_rejects_disallowed(client, monkeypatch):
    monkeypatch.setattr(config, "DEPLOYMENT_SCOPE", "prod")
    monkeypatch.setattr(config, "EPHEMERAL_ENABLED", False)
    monkeypatch.setattr(config, "STANDARD_ENVS", {"prod": config._ALL_STANDARD_ENVS["prod"]})
    resp = client.post("/api/switch-environment", json={"env_name": "eph-something"})
    assert resp.status_code == 403
