"""fnmatch-based glob matching for action codes and resource URIs.

Wildcards mirror AWS IAM: `*` matches any segment including `/`, so
`s3://bucket/*` matches keys at every depth (same semantics AWS uses
for `arn:aws:s3:::bucket/*`)."""

from __future__ import annotations

import fnmatch
from collections.abc import Iterable


def action_matches(pattern: str, action: str) -> bool:
    if not pattern or not action:
        return False
    # IAM action codes are case-sensitive (s3:GetObject != s3:getobject).
    return fnmatch.fnmatchcase(action, pattern)


def action_matches_any(pattern: str, actions: Iterable[str]) -> bool:
    return any(action_matches(pattern, a) for a in actions)


def resource_matches(pattern: str, resource: str) -> bool:
    if not pattern or not resource:
        return False
    return fnmatch.fnmatchcase(resource, pattern)


def statement_matches(
    pattern_actions: Iterable[str],
    pattern_resources: Iterable[str],
    action: str,
    resource: str,
) -> bool:
    if not any(action_matches(p, action) for p in pattern_actions):
        return False
    if not any(resource_matches(p, resource) for p in pattern_resources):
        return False
    return True
