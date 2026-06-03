"""The closed set of permissionable actions.

Routers reference these enum members so a typo fails at import rather than at
request time, and `ALL_S3_ACTIONS` is the set policy validation rejects unknown
statements against.
"""

from __future__ import annotations

from enum import StrEnum


class S3Action(StrEnum):
    LIST_BUCKETS = "tc:s3:ListBuckets"
    GET_BUCKET_LOCATION = "tc:s3:GetBucketLocation"
    LIST_BUCKET = "tc:s3:ListBucket"
    GET_OBJECT = "tc:s3:GetObject"
    PUT_OBJECT = "tc:s3:PutObject"
    DELETE_OBJECT = "tc:s3:DeleteObject"
    CREATE_FOLDER = "tc:s3:CreateFolder"
    INVALIDATE_CACHE = "tc:s3:InvalidateCache"


ALL_S3_ACTIONS: frozenset[str] = frozenset(action.value for action in S3Action)

READ_ACTIONS: frozenset[str] = frozenset(
    {
        S3Action.LIST_BUCKETS,
        S3Action.GET_BUCKET_LOCATION,
        S3Action.LIST_BUCKET,
        S3Action.GET_OBJECT,
    }
)

READ_WRITE_ACTIONS: frozenset[str] = READ_ACTIONS | {
    S3Action.PUT_OBJECT,
    S3Action.CREATE_FOLDER,
}

FULL_ACTIONS: frozenset[str] = READ_WRITE_ACTIONS | {
    S3Action.DELETE_OBJECT,
    S3Action.INVALIDATE_CACHE,
}


def is_known_action(action: str) -> bool:
    return action in ALL_S3_ACTIONS
