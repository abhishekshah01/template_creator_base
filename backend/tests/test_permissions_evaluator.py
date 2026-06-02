"""evaluate() precedence + edge cases.

The evaluator is the kernel every gated request runs through. We pin:
- owner short-circuit
- legacy is_admin short-circuit (pre-RBAC accounts)
- empty inputs default deny
- explicit deny beats explicit allow regardless of order
- union of role + inline policies
- glob matching against the wildcard patterns the seed file emits
- silently skipping a persisted statement that no longer validates
"""

from types import SimpleNamespace

import pytest

from services.permissions import actions, evaluator
from services.permissions.evaluator import (
    REASON_DEFAULT_DENY,
    REASON_EXPLICIT_ALLOW,
    REASON_EXPLICIT_DENY,
    REASON_OWNER_SHORTCIRCUIT,
)


@pytest.fixture
def fake_roles():
    class FakeRoles:
        def __init__(self):
            self.docs: dict[str, dict] = {}

        def find(self, filter_):
            names = filter_["name"]["$in"]
            results = [dict(self.docs[n]) for n in names if n in self.docs]

            class Cursor:
                def __init__(self, rows): self.rows = rows
                async def to_list(self, length): return list(self.rows)[:length]

            return Cursor(results)

    return FakeRoles()


@pytest.fixture(autouse=True)
def patch_roles(monkeypatch, fake_roles):
    monkeypatch.setattr("clients.mongo_client.roles", fake_roles)
    monkeypatch.setattr("services.permissions.evaluator.roles_coll", fake_roles)
    return fake_roles


def _user(*, user_type="user", attached_roles=None, inline_policy=None, is_admin=False):
    return {
        "_id": "u1",
        "type": user_type,
        "attached_roles": attached_roles or [],
        "inline_policy": inline_policy or [],
        "is_admin": is_admin,
    }


def _stmt(effect, action_list, resource_list):
    return {"effect": effect, "actions": list(action_list), "resources": list(resource_list)}


# ----- short-circuits ---------------------------------------------------


@pytest.mark.asyncio
async def test_owner_short_circuits_to_allow(fake_roles):
    user = _user(user_type="owner")
    d = await evaluator.evaluate(user, "tc:s3:DeleteObject", "s3://anything/key")
    assert d.allowed
    assert d.reason == REASON_OWNER_SHORTCIRCUIT


@pytest.mark.asyncio
async def test_legacy_is_admin_short_circuits_to_allow(fake_roles):
    user = _user(user_type="admin", is_admin=True)
    d = await evaluator.evaluate(user, "tc:s3:DeleteObject", "s3://anything/key")
    assert d.allowed
    assert d.reason == REASON_OWNER_SHORTCIRCUIT


@pytest.mark.asyncio
async def test_no_user_is_default_deny(fake_roles):
    d = await evaluator.evaluate(None, actions.S3_GET_OBJECT, "s3://b/k")
    assert not d.allowed
    assert d.reason == REASON_DEFAULT_DENY


# ----- empty policy -----------------------------------------------------


@pytest.mark.asyncio
async def test_empty_policy_is_default_deny(fake_roles):
    user = _user(user_type="user")
    d = await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://b/k")
    assert not d.allowed
    assert d.reason == REASON_DEFAULT_DENY


@pytest.mark.asyncio
async def test_unknown_role_name_is_skipped(fake_roles):
    # Attached role doesn't exist in the roles collection — treated as no policy.
    user = _user(user_type="user", attached_roles=["DoesNotExist"])
    d = await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://b/k")
    assert not d.allowed
    assert d.reason == REASON_DEFAULT_DENY


# ----- role-driven allow ------------------------------------------------


@pytest.mark.asyncio
async def test_role_allow_matches(fake_roles):
    fake_roles.docs["S3ReadOnlyAccess"] = {
        "name": "S3ReadOnlyAccess",
        "policy": [_stmt("allow", sorted(actions.S3_READ_ACTIONS), ["s3://*"])],
    }
    user = _user(user_type="user", attached_roles=["S3ReadOnlyAccess"])

    d = await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://bucket/key")
    assert d.allowed
    assert d.reason == REASON_EXPLICIT_ALLOW

    d2 = await evaluator.evaluate(user, actions.S3_DELETE_OBJECT, "s3://bucket/key")
    assert not d2.allowed
    assert d2.reason == REASON_DEFAULT_DENY


# ----- inline policy + layering -----------------------------------------


@pytest.mark.asyncio
async def test_inline_allow_layers_on_top_of_role(fake_roles):
    """The canonical 'admin has S3ReadWriteAccess but also needs
    InvalidateCache' case."""
    fake_roles.docs["S3ReadWriteAccess"] = {
        "name": "S3ReadWriteAccess",
        "policy": [_stmt("allow", sorted(actions.S3_WRITE_ACTIONS), ["s3://*"])],
    }
    user = _user(
        user_type="admin",
        attached_roles=["S3ReadWriteAccess"],
        inline_policy=[_stmt("allow", [actions.S3_INVALIDATE_CACHE], ["*"])],
    )

    d = await evaluator.evaluate(user, actions.S3_INVALIDATE_CACHE, "s3://bucket/key")
    assert d.allowed
    assert d.reason == REASON_EXPLICIT_ALLOW


# ----- deny > allow precedence -----------------------------------------


@pytest.mark.asyncio
async def test_inline_deny_overrides_role_allow(fake_roles):
    """Bob has S3ReadOnlyAccess but you want to take away GetObject —
    add an inline deny."""
    fake_roles.docs["S3ReadOnlyAccess"] = {
        "name": "S3ReadOnlyAccess",
        "policy": [_stmt("allow", sorted(actions.S3_READ_ACTIONS), ["s3://*"])],
    }
    user = _user(
        user_type="user",
        attached_roles=["S3ReadOnlyAccess"],
        inline_policy=[_stmt("deny", [actions.S3_GET_OBJECT], ["*"])],
    )

    d = await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://b/k")
    assert not d.allowed
    assert d.reason == REASON_EXPLICIT_DENY

    # Other actions in the read set are still allowed.
    d2 = await evaluator.evaluate(user, actions.S3_LIST_BUCKET, "s3://b/")
    assert d2.allowed


@pytest.mark.asyncio
async def test_deny_wins_regardless_of_statement_order(fake_roles):
    """Permute the union order — deny still beats allow."""
    fake_roles.docs["R"] = {
        "name": "R",
        "policy": [
            _stmt("deny", [actions.S3_GET_OBJECT], ["s3://b/*"]),
            _stmt("allow", [actions.S3_GET_OBJECT], ["s3://b/*"]),
        ],
    }
    user = _user(user_type="user", attached_roles=["R"])
    d = await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://b/k")
    assert not d.allowed
    assert d.reason == REASON_EXPLICIT_DENY


# ----- wildcards (what the seed file actually emits) --------------------


@pytest.mark.asyncio
async def test_wildcard_action_matches(fake_roles):
    fake_roles.docs["Custom"] = {
        "name": "Custom",
        "policy": [_stmt("allow", ["tc:s3:*"], ["s3://*"])],
    }
    user = _user(user_type="user", attached_roles=["Custom"])
    for a in actions.ALL_ACTIONS:
        d = await evaluator.evaluate(user, a, "s3://any/key")
        assert d.allowed, f"wildcard should have matched {a}"


@pytest.mark.asyncio
async def test_resource_prefix_scope_isolates_bucket(fake_roles):
    fake_roles.docs["TemplatesOnly"] = {
        "name": "TemplatesOnly",
        "policy": [_stmt("allow", [actions.S3_GET_OBJECT], ["s3://b/templates/*"])],
    }
    user = _user(user_type="user", attached_roles=["TemplatesOnly"])

    assert (await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://b/templates/x.png")).allowed
    assert not (await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://b/other/x.png")).allowed
    assert not (await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://other/templates/x.png")).allowed


# ----- robustness against stale persisted statements --------------------


@pytest.mark.asyncio
async def test_invalid_persisted_statement_is_skipped_not_crash(fake_roles, caplog):
    """A role doc that holds an obsolete action shouldn't 500 the request."""
    fake_roles.docs["Stale"] = {
        "name": "Stale",
        "policy": [
            {"effect": "allow", "actions": ["tc:s3:RetiredAction"], "resources": ["*"]},
            _stmt("allow", [actions.S3_GET_OBJECT], ["s3://*"]),
        ],
    }
    user = _user(user_type="user", attached_roles=["Stale"])

    d = await evaluator.evaluate(user, actions.S3_GET_OBJECT, "s3://b/k")
    assert d.allowed
    # The valid statement still got us through; the stale one was skipped.


# ----- collect_statements -----------------------------------------------


@pytest.mark.asyncio
async def test_collect_statements_unions_roles_and_inline(fake_roles):
    fake_roles.docs["R1"] = {"name": "R1", "policy": [_stmt("allow", [actions.S3_GET_OBJECT], ["s3://*"])]}
    fake_roles.docs["R2"] = {"name": "R2", "policy": [_stmt("allow", [actions.S3_PUT_OBJECT], ["s3://*"])]}
    user = _user(
        user_type="user",
        attached_roles=["R1", "R2"],
        inline_policy=[_stmt("deny", [actions.S3_DELETE_OBJECT], ["*"])],
    )

    stmts = await evaluator.collect_statements(user)
    assert len(stmts) == 3
    assert {(s.effect, s.actions[0]) for s in stmts} == {
        ("allow", actions.S3_GET_OBJECT),
        ("allow", actions.S3_PUT_OBJECT),
        ("deny", actions.S3_DELETE_OBJECT),
    }
