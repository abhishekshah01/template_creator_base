"""Schema validation tests for Statement, Role, Decision.

Statement is the security boundary — a malformed statement that slipped
through validation could either grant access nobody intended or silently
no-op. We cover both directions.
"""

import pytest
from pydantic import ValidationError

from schemas.permissions import Decision, Role, Statement
from services.permissions import actions


def test_statement_accepts_canonical_actions_and_resources():
    s = Statement(
        effect="allow",
        actions=[actions.S3_GET_OBJECT, actions.S3_LIST_BUCKET],
        resources=["s3://bucket/*"],
    )
    assert s.effect == "allow"
    assert len(s.actions) == 2


def test_statement_accepts_known_wildcards():
    Statement(effect="allow", actions=["tc:s3:*"], resources=["*"])
    Statement(effect="deny", actions=["tc:s3:Get*"], resources=["s3://b/*"])
    Statement(effect="allow", actions=["*"], resources=["*"])


def test_statement_rejects_unknown_action():
    with pytest.raises(ValidationError) as exc:
        Statement(effect="allow", actions=["tc:s3:Hadouken"], resources=["*"])
    assert "unknown action" in str(exc.value)


def test_statement_rejects_wildcard_that_matches_nothing():
    # The wildcard is syntactically fine but matches no declared action
    # — almost certainly a typo / dead policy.
    with pytest.raises(ValidationError) as exc:
        Statement(effect="allow", actions=["tc:iam:*"], resources=["*"])
    assert "wildcard" in str(exc.value).lower()


def test_statement_rejects_empty_action_list():
    with pytest.raises(ValidationError):
        Statement(effect="allow", actions=[], resources=["*"])


def test_statement_rejects_empty_resource_list():
    with pytest.raises(ValidationError):
        Statement(effect="allow", actions=[actions.S3_GET_OBJECT], resources=[])


def test_statement_rejects_empty_action_entry():
    with pytest.raises(ValidationError):
        Statement(effect="allow", actions=[""], resources=["*"])


def test_statement_rejects_empty_resource_entry():
    with pytest.raises(ValidationError):
        Statement(effect="allow", actions=[actions.S3_GET_OBJECT], resources=[""])


def test_statement_effect_must_be_allow_or_deny():
    with pytest.raises(ValidationError):
        Statement(effect="permit", actions=[actions.S3_GET_OBJECT], resources=["*"])


def test_role_defaults_are_empty():
    r = Role(name="S3ReadOnlyAccess")
    assert r.policy == []
    assert r.is_system is False
    assert r.description == ""


def test_role_carries_statements():
    r = Role(
        name="S3ReadOnlyAccess",
        description="Read access to all S3 paths",
        is_system=True,
        policy=[
            Statement(
                effect="allow",
                actions=sorted(actions.S3_READ_ACTIONS),
                resources=["s3://*"],
            )
        ],
    )
    assert r.policy[0].effect == "allow"
    assert len(r.policy[0].actions) == len(actions.S3_READ_ACTIONS)


def test_decision_allowed_property():
    assert Decision(effect="allow", reason="explicit allow").allowed
    assert not Decision(effect="deny", reason="default deny").allowed
