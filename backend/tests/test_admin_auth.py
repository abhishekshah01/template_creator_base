"""Tests for /api/admin-auth/* — admin gate for the AWS S3 Navigate UI."""

import importlib
import os

import pytest


@pytest.fixture
def admin_creds(monkeypatch):
    """Set creds + reload the service so the new env values are picked up."""
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "s3cret")
    monkeypatch.setenv("ADMIN_SESSION_TTL_SECONDS", "3600")
    from services import admin_auth_service
    importlib.reload(admin_auth_service)
    # Reset the in-memory store between tests.
    admin_auth_service._sessions.clear()
    return {"username": "admin", "password": "s3cret"}


def test_login_success_returns_token(client, admin_creds):
    resp = client.post("/api/admin-auth/login", json=admin_creds)
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "admin"
    assert body["token"]
    assert body["expires_at"] > 0


def test_login_wrong_password_returns_401(client, admin_creds):
    resp = client.post("/api/admin-auth/login", json={
        "username": "admin", "password": "wrong",
    })
    assert resp.status_code == 401


def test_login_unconfigured_returns_503(client, monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "")
    monkeypatch.setenv("ADMIN_PASSWORD", "")
    from services import admin_auth_service
    importlib.reload(admin_auth_service)
    resp = client.post("/api/admin-auth/login", json={
        "username": "admin", "password": "anything",
    })
    assert resp.status_code == 503


def test_me_requires_token(client, admin_creds):
    resp = client.get("/api/admin-auth/me")
    assert resp.status_code == 401


def test_me_with_valid_token_returns_session(client, admin_creds):
    login = client.post("/api/admin-auth/login", json=admin_creds).json()
    resp = client.get("/api/admin-auth/me", headers={"X-Admin-Token": login["token"]})
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"


def test_me_with_unknown_token_returns_401(client, admin_creds):
    resp = client.get("/api/admin-auth/me", headers={"X-Admin-Token": "totally-fake"})
    assert resp.status_code == 401


def test_me_refreshes_expiry_sliding(client, admin_creds):
    login = client.post("/api/admin-auth/login", json=admin_creds).json()
    first_expiry = login["expires_at"]
    # Small sleep so the refreshed expiry is measurably greater.
    import time as _time
    _time.sleep(1.05)
    resp = client.get("/api/admin-auth/me", headers={"X-Admin-Token": login["token"]})
    assert resp.status_code == 200
    assert resp.json()["expires_at"] > first_expiry


def test_logout_invalidates_token(client, admin_creds):
    login = client.post("/api/admin-auth/login", json=admin_creds).json()
    headers = {"X-Admin-Token": login["token"]}
    logout = client.post("/api/admin-auth/logout", headers=headers)
    assert logout.status_code == 200
    after = client.get("/api/admin-auth/me", headers=headers)
    assert after.status_code == 401
