"""Decision logic: owner short-circuit, role/inline union, deny precedence."""

import pytest

from dal import role_repository
from services.access_control import access_evaluator
from services.access_control.permission_catalog import S3Action

GET = str(S3Action.GET_OBJECT)
PUT = str(S3Action.PUT_OBJECT)


@pytest.fixture
def stub_roles(monkeypatch):
    catalog = {
        "S3ReadOnlyAccess": {"policy": [{"effect": "allow", "actions": [GET], "resources": ["s3://*"]}]},
        "deny-deletes": {
            "policy": [{"effect": "deny", "actions": ["tc:s3:DeleteObject"], "resources": ["s3://*"]}]
        },
    }

    async def fake_find(names):
        return [catalog[name] for name in names if name in catalog]

    monkeypatch.setattr(role_repository, "find_roles_by_names", fake_find)
    return catalog


async def test_owner_is_always_allowed(stub_roles):
    decision = await access_evaluator.evaluate_access({"type": "owner"}, PUT, "s3://b/x")
    assert decision.is_allowed
    assert decision.reason == access_evaluator.REASON_OWNER


async def test_missing_user_is_denied(stub_roles):
    decision = await access_evaluator.evaluate_access(None, GET, "s3://b/x")
    assert not decision.is_allowed


async def test_attached_role_grants_action(stub_roles):
    user = {"type": "user", "attached_roles": ["S3ReadOnlyAccess"]}
    allowed = await access_evaluator.evaluate_access(user, GET, "s3://b/x")
    denied = await access_evaluator.evaluate_access(user, PUT, "s3://b/x")
    assert allowed.is_allowed
    assert not denied.is_allowed
    assert denied.reason == access_evaluator.REASON_DEFAULT_DENY


async def test_inline_policy_grants_action(stub_roles):
    user = {
        "type": "user",
        "inline_policy": [{"effect": "allow", "actions": [PUT], "resources": ["s3://b/*"]}],
    }
    decision = await access_evaluator.evaluate_access(user, PUT, "s3://b/x")
    assert decision.is_allowed


async def test_explicit_deny_beats_allow(stub_roles):
    user = {
        "type": "user",
        "attached_roles": ["deny-deletes"],
        "inline_policy": [{"effect": "allow", "actions": ["tc:s3:DeleteObject"], "resources": ["s3://*"]}],
    }
    decision = await access_evaluator.evaluate_access(user, "tc:s3:DeleteObject", "s3://b/x")
    assert not decision.is_allowed
    assert decision.reason == access_evaluator.REASON_EXPLICIT_DENY
