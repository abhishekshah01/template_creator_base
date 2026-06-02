"""Action code constants. Routes import these so a typo fails at import,
not at request time. `ALL_ACTIONS` is the closed set schema validation
rejects unknown statements against."""

from __future__ import annotations

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


S3_READ_ACTIONS: frozenset[str] = frozenset(
    {
        S3_LIST_BUCKETS,
        S3_GET_BUCKET_LOCATION,
        S3_LIST_BUCKET,
        S3_GET_OBJECT,
    }
)

S3_WRITE_ACTIONS: frozenset[str] = frozenset(
    S3_READ_ACTIONS | {S3_PUT_OBJECT, S3_CREATE_FOLDER}
)

S3_FULL_ACTIONS: frozenset[str] = frozenset(
    S3_WRITE_ACTIONS | {S3_DELETE_OBJECT, S3_INVALIDATE_CACHE}
)


def is_known(action: str) -> bool:
    return action in ALL_ACTIONS
