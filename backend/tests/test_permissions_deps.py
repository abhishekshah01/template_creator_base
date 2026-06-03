"""require() FastAPI dep behavior — audits on every call; only raises
403 when PERMISSIONS_ENFORCE is true; resolves string / sync / async
resource builders."""

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

import config
from schemas.permissions import Decision


@pytest.fixture
def fake_audit_collector():
    rows: list[dict] = []
    return rows


@pytest.fixture(autouse=True)
def patch_environment(monkeypatch, fake_audit_collector):
    """Stub audit + evaluator + admin auth so the dep can be exercised
    in isolation. Each test sets allowed_decision before calling."""
    from services.permissions import audit as audit_mod
    from services.permissions import deps as deps_mod

    state = {"decision": Decision(effect="allow", reason="explicit allow")}

    async def fake_evaluate(user, action, resource):
        return state["decision"]

    async def fake_record(**kwargs):
        fake_audit_collector.append(kwargs)

    async def fake_admin():
        return {
            "user_id": "u-1",
            "username": "tester",
            "type": "admin",
            "is_admin": False,
        }

    async def passthrough(session):
        return session
    monkeypatch.setattr("services.permissions.deps.resolve_user", passthrough)
    monkeypatch.setattr("services.permissions.deps.evaluator.evaluate", fake_evaluate)
    monkeypatch.setattr("services.permissions.deps.audit.record", fake_record)
    monkeypatch.setattr("services.permissions.deps.get_current_admin", fake_admin)
    return state


def _build_app():
    from services.permissions.deps import require

    app = FastAPI()

    @app.get("/sync", dependencies=[
        # noqa: B008
    ])
    async def _sync_unused():  # pragma: no cover — placeholder
        return {"ok": True}

    @app.get("/sync-resource")
    async def sync_resource(_=__import__("fastapi").Depends(require("tc:s3:GetObject", lambda r: "s3://b/k"))):
        return {"ok": True}

    @app.get("/async-resource")
    async def async_resource(_=__import__("fastapi").Depends(
        require("tc:s3:GetObject", lambda r: _async_str("s3://b/async"))
    )):
        return {"ok": True}

    @app.get("/literal-resource")
    async def literal_resource(_=__import__("fastapi").Depends(require("tc:s3:GetObject", "s3://const"))):
        return {"ok": True}

    return app


async def _async_str(s: str) -> str:
    return s


@pytest.fixture
def client():
    return TestClient(_build_app())


def test_allow_lets_request_through(client, fake_audit_collector, patch_environment):
    patch_environment["decision"] = Decision(effect="allow", reason="explicit allow")

    r = client.get("/sync-resource")

    assert r.status_code == 200
    assert len(fake_audit_collector) == 1
    row = fake_audit_collector[0]
    assert row["action"] == "tc:s3:GetObject"
    assert row["resource"] == "s3://b/k"
    assert row["decision"].effect == "allow"
    assert row["route"] == "/sync-resource"


def test_deny_with_enforce_off_lets_request_through(client, fake_audit_collector, patch_environment, monkeypatch):
    monkeypatch.setattr(config, "PERMISSIONS_ENFORCE", False)
    patch_environment["decision"] = Decision(effect="deny", reason="default deny")

    r = client.get("/sync-resource")

    assert r.status_code == 200  # dry-run
    assert fake_audit_collector[0]["decision"].effect == "deny"


def test_deny_with_enforce_on_returns_403(client, fake_audit_collector, patch_environment, monkeypatch):
    monkeypatch.setattr(config, "PERMISSIONS_ENFORCE", True)
    patch_environment["decision"] = Decision(effect="deny", reason="default deny")

    r = client.get("/sync-resource")

    assert r.status_code == 403
    body = r.json()
    assert body["detail"]["error"] == "permission_denied"
    assert body["detail"]["action"] == "tc:s3:GetObject"
    assert body["detail"]["resource"] == "s3://b/k"
    assert body["detail"]["reason"] == "default deny"
    # Audit still written even though the request is rejected.
    assert fake_audit_collector[0]["decision"].effect == "deny"


def test_async_resource_builder_is_awaited(client, fake_audit_collector, patch_environment):
    r = client.get("/async-resource")
    assert r.status_code == 200
    assert fake_audit_collector[0]["resource"] == "s3://b/async"


def test_literal_resource_string_is_used_verbatim(client, fake_audit_collector, patch_environment):
    r = client.get("/literal-resource")
    assert r.status_code == 200
    assert fake_audit_collector[0]["resource"] == "s3://const"


def test_request_id_falls_back_to_uuid(client, fake_audit_collector, patch_environment):
    r = client.get("/sync-resource")
    assert r.status_code == 200
    assert fake_audit_collector[0]["request_id"]  # non-empty


def test_request_id_uses_x_request_id_header_when_present(client, fake_audit_collector, patch_environment):
    r = client.get("/sync-resource", headers={"X-Request-Id": "abc-123"})
    assert r.status_code == 200
    assert fake_audit_collector[0]["request_id"] == "abc-123"


# ----- effective_policy -------------------------------------------------


@pytest.mark.asyncio
async def test_effective_policy_owner_returns_wildcard():
    from services.permissions.deps import get_effective_policy

    out = await get_effective_policy({"type": "owner"})
    assert out == [{"effect": "allow", "actions": ["*"], "resources": ["*"]}]


@pytest.mark.asyncio
async def test_effective_policy_legacy_is_admin_returns_wildcard():
    from services.permissions.deps import get_effective_policy

    out = await get_effective_policy({"type": "admin", "is_admin": True})
    assert out == [{"effect": "allow", "actions": ["*"], "resources": ["*"]}]


@pytest.mark.asyncio
async def test_effective_policy_no_user_returns_empty():
    from services.permissions.deps import get_effective_policy

    assert await get_effective_policy(None) == []
