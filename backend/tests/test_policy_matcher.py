"""Glob matching for action codes and resource URIs."""

from services.access_control.policy_matcher import (
    action_matches_pattern,
    resource_matches_pattern,
    statement_covers_request,
    wildcard_matches_any_action,
)


def test_exact_action_match():
    assert action_matches_pattern("tc:s3:GetObject", "tc:s3:GetObject")
    assert not action_matches_pattern("tc:s3:GetObject", "tc:s3:PutObject")


def test_action_match_is_case_sensitive():
    assert not action_matches_pattern("tc:s3:getobject", "tc:s3:GetObject")


def test_wildcard_action_matches_namespace():
    assert action_matches_pattern("tc:s3:*", "tc:s3:DeleteObject")
    assert not action_matches_pattern("tc:s3:*", "tc:iam:GetRole")


def test_wildcard_matches_any_action():
    assert wildcard_matches_any_action("*", ["tc:s3:GetObject"])
    assert not wildcard_matches_any_action("tc:iam:*", ["tc:s3:GetObject"])


def test_resource_wildcard_spans_path_depth():
    assert resource_matches_pattern("s3://bucket/*", "s3://bucket/a/b/c.png")
    assert not resource_matches_pattern("s3://bucket/*", "s3://other/a.png")


def test_statement_covers_request_needs_both_action_and_resource():
    assert statement_covers_request(["tc:s3:*"], ["s3://b/*"], "tc:s3:GetObject", "s3://b/x")
    assert not statement_covers_request(["tc:s3:*"], ["s3://b/*"], "tc:s3:GetObject", "s3://other/x")
    assert not statement_covers_request(["tc:s3:GetObject"], ["s3://b/*"], "tc:s3:PutObject", "s3://b/x")
