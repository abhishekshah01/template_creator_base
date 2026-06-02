"""Glob-matching tests for actions and resources.

The matcher is the kernel of the evaluator — every permission decision
runs through it at least once. We cover wildcards, case sensitivity, and
the edge cases (empty strings, trailing slashes) that have historically
been the source of IAM policy bugs at AWS.
"""

import pytest

from services.permissions import actions, matchers


# ----- action matching --------------------------------------------------


@pytest.mark.parametrize(
    "pattern,action,expected",
    [
        # exact matches
        ("tc:s3:GetObject", "tc:s3:GetObject", True),
        ("tc:s3:GetObject", "tc:s3:PutObject", False),
        # full wildcard
        ("*", "tc:s3:GetObject", True),
        ("*", "anything", True),
        # service wildcard
        ("tc:s3:*", "tc:s3:GetObject", True),
        ("tc:s3:*", "tc:s3:DeleteObject", True),
        ("tc:s3:*", "tc:iam:ListUsers", False),
        # verb prefix wildcard
        ("tc:s3:Get*", "tc:s3:GetObject", True),
        ("tc:s3:Get*", "tc:s3:GetBucketLocation", True),
        ("tc:s3:Get*", "tc:s3:PutObject", False),
        # whole-tree wildcard
        ("tc:*", "tc:s3:GetObject", True),
        ("tc:*", "aws:s3:GetObject", False),
    ],
)
def test_action_matches(pattern, action, expected):
    assert matchers.action_matches(pattern, action) is expected


def test_action_matching_is_case_sensitive():
    # AWS IAM is case-sensitive — `s3:GetObject` ≠ `s3:getobject`. Pin that.
    assert not matchers.action_matches("tc:s3:GetObject", "tc:s3:getobject")
    assert not matchers.action_matches("tc:s3:getobject", "tc:s3:GetObject")


def test_action_matches_empty_inputs_are_false():
    assert not matchers.action_matches("", "tc:s3:GetObject")
    assert not matchers.action_matches("tc:s3:GetObject", "")
    assert not matchers.action_matches("", "")


def test_action_matches_any_against_known_set():
    # Wildcard must match at least one known action — the validation
    # check used by schema validators.
    assert matchers.action_matches_any("tc:s3:*", actions.ALL_ACTIONS)
    assert matchers.action_matches_any("tc:s3:Get*", actions.ALL_ACTIONS)
    assert matchers.action_matches_any("*", actions.ALL_ACTIONS)
    # No-op wildcards should be rejected.
    assert not matchers.action_matches_any("tc:iam:*", actions.ALL_ACTIONS)
    assert not matchers.action_matches_any("tc:s3:Hadouken*", actions.ALL_ACTIONS)


# ----- resource matching ------------------------------------------------


@pytest.mark.parametrize(
    "pattern,resource,expected",
    [
        # exact
        ("s3://bucket/file.png", "s3://bucket/file.png", True),
        ("s3://bucket/file.png", "s3://bucket/other.png", False),
        # bucket-wide
        ("s3://bucket/*", "s3://bucket/file.png", True),
        ("s3://bucket/*", "s3://bucket/folder/sub/file.png", True),
        ("s3://bucket/*", "s3://other/file.png", False),
        # prefix-scoped
        ("s3://bucket/templates/*", "s3://bucket/templates/x.png", True),
        ("s3://bucket/templates/*", "s3://bucket/templates/sub/x.png", True),
        ("s3://bucket/templates/*", "s3://bucket/other/x.png", False),
        # global s3
        ("s3://*", "s3://anything/whatever", True),
        ("s3://*", "iam://users/123", False),
        # match-all
        ("*", "anything-at-all", True),
    ],
)
def test_resource_matches(pattern, resource, expected):
    assert matchers.resource_matches(pattern, resource) is expected


def test_resource_matches_empty_inputs_are_false():
    assert not matchers.resource_matches("", "s3://bucket/key")
    assert not matchers.resource_matches("s3://*", "")


# ----- statement_matches (kernel the evaluator runs) --------------------


def test_statement_matches_requires_both_action_and_resource():
    a_patterns = ["tc:s3:GetObject"]
    r_patterns = ["s3://bucket/*"]
    # both match -> true
    assert matchers.statement_matches(a_patterns, r_patterns, "tc:s3:GetObject", "s3://bucket/key")
    # action matches, resource doesn't -> false
    assert not matchers.statement_matches(a_patterns, r_patterns, "tc:s3:GetObject", "s3://other/key")
    # resource matches, action doesn't -> false
    assert not matchers.statement_matches(a_patterns, r_patterns, "tc:s3:PutObject", "s3://bucket/key")


def test_statement_matches_with_multiple_patterns():
    a_patterns = ["tc:s3:GetObject", "tc:s3:PutObject"]
    r_patterns = ["s3://a/*", "s3://b/*"]
    assert matchers.statement_matches(a_patterns, r_patterns, "tc:s3:GetObject", "s3://a/key")
    assert matchers.statement_matches(a_patterns, r_patterns, "tc:s3:PutObject", "s3://b/key")
    assert not matchers.statement_matches(a_patterns, r_patterns, "tc:s3:DeleteObject", "s3://a/key")
    assert not matchers.statement_matches(a_patterns, r_patterns, "tc:s3:GetObject", "s3://c/key")


def test_statement_matches_with_wildcards():
    a_patterns = ["tc:s3:*"]
    r_patterns = ["*"]
    assert matchers.statement_matches(a_patterns, r_patterns, "tc:s3:GetObject", "s3://x/y")
    assert matchers.statement_matches(a_patterns, r_patterns, "tc:s3:DeleteObject", "iam://users/1")
    # Outside the action service -> still false.
    assert not matchers.statement_matches(a_patterns, r_patterns, "tc:iam:ListUsers", "*")
