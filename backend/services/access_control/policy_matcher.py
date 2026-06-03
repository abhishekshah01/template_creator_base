"""Glob matching for action codes and resource URIs.

Wildcards mirror AWS IAM: `*` spans any characters including `/`, so
`s3://bucket/*` matches keys at every depth.
"""

from __future__ import annotations

import fnmatch
from collections.abc import Iterable


def action_matches_pattern(pattern: str, action: str) -> bool:
    if not pattern or not action:
        return False
    # IAM action codes are case-sensitive (s3:GetObject != s3:getobject).
    return fnmatch.fnmatchcase(action, pattern)


def wildcard_matches_any_action(pattern: str, candidate_actions: Iterable[str]) -> bool:
    return any(action_matches_pattern(pattern, action) for action in candidate_actions)


def resource_matches_pattern(pattern: str, resource: str) -> bool:
    if not pattern or not resource:
        return False
    return fnmatch.fnmatchcase(resource, pattern)


def statement_covers_request(
    statement_actions: Iterable[str],
    statement_resources: Iterable[str],
    requested_action: str,
    requested_resource: str,
) -> bool:
    action_covered = any(action_matches_pattern(pattern, requested_action) for pattern in statement_actions)
    if not action_covered:
        return False
    return any(resource_matches_pattern(pattern, requested_resource) for pattern in statement_resources)
