"""Glob matching for action codes and resource URIs.

The evaluator asks two questions, each answered here:

  1. Does this statement's action list cover the requested action?
     (`action_matches_any`)
  2. Does this statement's resource list cover the requested resource?
     (`resource_matches_any`)

Wildcards mirror what AWS IAM accepts:

  Action wildcards
    "*"            matches every action
    "tc:*"         matches every tc:* action
    "tc:s3:*"      matches every tc:s3:* action
    "tc:s3:Get*"   matches every tc:s3 action that starts with "Get"

  Resource wildcards
    "*"                                    matches every resource
    "s3://*"                               every s3 URI
    "s3://bucket/*"                        every key under bucket
    "s3://bucket/prefix/*"                 every key under bucket/prefix/
    "s3://bucket/prefix/sub-*/*"           keys under a prefix glob

The implementation is intentionally minimal — fnmatch covers everything
we currently need. If we ever need IAM-style "?" or character classes
we can swap to a regex, but for now `fnmatch.fnmatchcase` is enough.
"""

from __future__ import annotations

import fnmatch
from collections.abc import Iterable


def action_matches(pattern: str, action: str) -> bool:
    """True if a single pattern (which may contain wildcards) matches the action.

    Both sides are compared case-sensitively. AWS IAM action codes are
    case-sensitive (`s3:GetObject` ≠ `s3:getobject`) and we follow suit.
    """
    if not pattern or not action:
        return False
    return fnmatch.fnmatchcase(action, pattern)


def action_matches_any(pattern: str, actions: Iterable[str]) -> bool:
    """True if `pattern` matches at least one entry in `actions`.

    Used by schema validation: a wildcard authored by an admin must cover
    at least one known action, otherwise the statement is a no-op.
    """
    return any(action_matches(pattern, a) for a in actions)


def resource_matches(pattern: str, resource: str) -> bool:
    """True if a single pattern matches the resource URI.

    The matcher does not interpret the URI structure — `s3://bucket/key`
    is treated as an opaque string, and the wildcard semantics follow
    fnmatch (so `*` crosses `/` boundaries the same way AWS resource
    wildcards do — `arn:aws:s3:::bucket/*` matches every key including
    sub-folders).
    """
    if not pattern or not resource:
        return False
    return fnmatch.fnmatchcase(resource, pattern)


def statement_matches(
    pattern_actions: Iterable[str],
    pattern_resources: Iterable[str],
    action: str,
    resource: str,
) -> bool:
    """True if any pattern in `pattern_actions` matches `action` AND any
    pattern in `pattern_resources` matches `resource`.

    This is the kernel the evaluator runs once per statement.
    """
    if not any(action_matches(p, action) for p in pattern_actions):
        return False
    if not any(resource_matches(p, resource) for p in pattern_resources):
        return False
    return True
