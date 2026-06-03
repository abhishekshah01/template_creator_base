"""PolicyStatement validation — the security boundary for persisted policies."""

import pytest
from pydantic import ValidationError

from schemas.policy import AccessDecision, PolicyStatement


def test_valid_statement():
    statement = PolicyStatement(effect="allow", actions=["tc:s3:GetObject"], resources=["s3://b/*"])
    assert statement.effect == "allow"


def test_known_wildcard_action_is_accepted():
    PolicyStatement(effect="allow", actions=["tc:s3:*"], resources=["s3://*"])
    PolicyStatement(effect="allow", actions=["*"], resources=["*"])


def test_unknown_action_is_rejected():
    with pytest.raises(ValidationError):
        PolicyStatement(effect="allow", actions=["tc:s3:Teleport"], resources=["s3://*"])


def test_dead_wildcard_action_is_rejected():
    with pytest.raises(ValidationError):
        PolicyStatement(effect="allow", actions=["tc:iam:*"], resources=["s3://*"])


def test_empty_actions_or_resources_rejected():
    with pytest.raises(ValidationError):
        PolicyStatement(effect="allow", actions=[], resources=["s3://*"])
    with pytest.raises(ValidationError):
        PolicyStatement(effect="allow", actions=["tc:s3:GetObject"], resources=[])


def test_access_decision_is_allowed():
    assert AccessDecision(effect="allow", reason="x").is_allowed
    assert not AccessDecision(effect="deny", reason="x").is_allowed
