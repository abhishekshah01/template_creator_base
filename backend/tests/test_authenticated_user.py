"""require_permission honours the enforce flag; require_owner gates by type."""

import pytest

import config
from authentication.authenticated_user import AuthenticatedUser
from exceptions import ForbiddenError, PermissionDeniedError
from schemas.policy import AccessDecision
from services.access_control import access_audit_service, access_evaluator


def _build_user(user_type="user"):
    return AuthenticatedUser(
        user_id="u1",
        user_type=user_type,
        username="tester",
        account_id="000000000000",
        email="t@emergent.sh",
        token="tok",
        attached_roles=[],
        inline_policy=[],
        request=None,
    )


@pytest.fixture
def deny_and_capture(monkeypatch):
    recorded = []

    async def fake_evaluate(user, action, resource):
        return AccessDecision(effect="deny", reason="default deny")

    async def fake_record(**kwargs):
        recorded.append(kwargs)

    monkeypatch.setattr(access_evaluator, "evaluate_access", fake_evaluate)
    monkeypatch.setattr(access_audit_service, "record_access_decision", fake_record)
    return recorded


async def test_dry_run_does_not_raise_but_audits(deny_and_capture, monkeypatch):
    monkeypatch.setattr(config, "PERMISSIONS_ENFORCE", False)
    await _build_user().require_permission("tc:s3:GetObject", "s3://b/x")
    assert len(deny_and_capture) == 1


async def test_enforce_raises_and_audits(deny_and_capture, monkeypatch):
    monkeypatch.setattr(config, "PERMISSIONS_ENFORCE", True)
    with pytest.raises(PermissionDeniedError):
        await _build_user().require_permission("tc:s3:GetObject", "s3://b/x")
    assert len(deny_and_capture) == 1


def test_require_owner_rejects_non_owner():
    with pytest.raises(ForbiddenError):
        _build_user("admin").require_owner()


def test_require_owner_allows_owner():
    _build_user("owner").require_owner()
