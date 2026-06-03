"""Role-management endpoints are owner-only."""

import pytest
from fastapi.testclient import TestClient

from authentication.authenticated_user import AuthenticatedUser
from exceptions import ForbiddenError
from main import app
from services import role_service


class FakeActor:
    def __init__(self, is_owner):
        self.is_owner = is_owner
        self.user_id = "u1"

    def require_owner(self):
        if not self.is_owner:
            raise ForbiddenError("This action requires owner privileges.")


@pytest.fixture
def use_actor():
    def _set(actor):
        app.dependency_overrides[AuthenticatedUser.require_user] = lambda: actor
        return TestClient(app)

    yield _set
    app.dependency_overrides.clear()


def test_non_owner_cannot_list_roles(use_actor):
    client = use_actor(FakeActor(is_owner=False))
    assert client.get("/api/auth/roles").status_code == 403


def test_owner_can_list_roles(use_actor, monkeypatch):
    async def fake_list_roles():
        return [{"name": "S3FullAccess", "description": "", "policy": [], "is_system": True}]

    monkeypatch.setattr(role_service, "list_roles", fake_list_roles)
    client = use_actor(FakeActor(is_owner=True))
    resp = client.get("/api/auth/roles")
    assert resp.status_code == 200
    assert resp.json()["items"][0]["name"] == "S3FullAccess"
