"""Canonical action codes.

Every action this app gates is declared here as a module-level constant.
Routes import these constants instead of writing the raw string literal so
a typo fails at import time, not at request time.

`ALL_ACTIONS` is the closed set used by schema validation when an admin
adds a statement to a role's policy — anything not in this set is rejected
before it hits the database, which means a policy can never grant or
deny an action the evaluator doesn't know how to evaluate.
"""

from __future__ import annotations

# --- S3 actions ---------------------------------------------------------
# Permission strings mirror the shape AWS uses (`{service}:{Verb}`) so the
# naming convention is familiar at a glance, but the `tc:` prefix makes
# clear these are app-level actions and never reach real IAM.
S3_LIST_BUCKETS = "tc:s3:ListBuckets"
S3_GET_BUCKET_LOCATION = "tc:s3:GetBucketLocation"
S3_LIST_BUCKET = "tc:s3:ListBucket"
S3_GET_OBJECT = "tc:s3:GetObject"
S3_PUT_OBJECT = "tc:s3:PutObject"
S3_DELETE_OBJECT = "tc:s3:DeleteObject"
S3_CREATE_FOLDER = "tc:s3:CreateFolder"
S3_INVALIDATE_CACHE = "tc:s3:InvalidateCache"


ALL_ACTIONS: frozenset[str] = frozenset(
    {
        S3_LIST_BUCKETS,
        S3_GET_BUCKET_LOCATION,
        S3_LIST_BUCKET,
        S3_GET_OBJECT,
        S3_PUT_OBJECT,
        S3_DELETE_OBJECT,
        S3_CREATE_FOLDER,
        S3_INVALIDATE_CACHE,
    }
)


# Convenience groupings used by the seeded system roles. Kept here (next to
# the canonical action set) so that adding a new action and adding it to a
# tier are a single-file change rather than two.
S3_READ_ACTIONS: frozenset[str] = frozenset(
    {
        S3_LIST_BUCKETS,
        S3_GET_BUCKET_LOCATION,
        S3_LIST_BUCKET,
        S3_GET_OBJECT,
    }
)

S3_WRITE_ACTIONS: frozenset[str] = frozenset(
    S3_READ_ACTIONS
    | {
        S3_PUT_OBJECT,
        S3_CREATE_FOLDER,
    }
)

S3_FULL_ACTIONS: frozenset[str] = frozenset(
    S3_WRITE_ACTIONS
    | {
        S3_DELETE_OBJECT,
        S3_INVALIDATE_CACHE,
    }
)


def is_known(action: str) -> bool:
    """Cheap membership test used by schema validators when accepting a
    statement from an admin. Wildcards (e.g. `tc:s3:*`) are NOT considered
    known here — wildcard validation happens at the matcher level, never
    at the action-catalog level.
    """
    return action in ALL_ACTIONS
