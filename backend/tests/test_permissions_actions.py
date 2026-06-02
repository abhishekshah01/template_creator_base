"""Sanity tests for the action catalog.

These don't test logic — they pin the action codes so an accidental rename
(which would silently break every audit-log query referencing the old name)
fails CI loudly.
"""

from services.permissions import actions


def test_action_codes_are_stable():
    assert actions.S3_LIST_BUCKETS == "tc:s3:ListBuckets"
    assert actions.S3_GET_BUCKET_LOCATION == "tc:s3:GetBucketLocation"
    assert actions.S3_LIST_BUCKET == "tc:s3:ListBucket"
    assert actions.S3_GET_OBJECT == "tc:s3:GetObject"
    assert actions.S3_PUT_OBJECT == "tc:s3:PutObject"
    assert actions.S3_DELETE_OBJECT == "tc:s3:DeleteObject"
    assert actions.S3_CREATE_FOLDER == "tc:s3:CreateFolder"
    assert actions.S3_INVALIDATE_CACHE == "tc:s3:InvalidateCache"


def test_all_actions_contains_every_constant():
    """Every action constant must appear in ALL_ACTIONS. Catches the
    'add a new constant, forget to register it' bug."""
    declared = {
        v
        for name, v in vars(actions).items()
        if name.startswith("S3_") and isinstance(v, str)
    }
    assert declared == set(actions.ALL_ACTIONS)


def test_read_actions_subset_of_write_subset_of_full():
    assert actions.S3_READ_ACTIONS <= actions.S3_WRITE_ACTIONS
    assert actions.S3_WRITE_ACTIONS <= actions.S3_FULL_ACTIONS
    # Full set is exactly every declared action — no orphans.
    assert actions.S3_FULL_ACTIONS == actions.ALL_ACTIONS


def test_is_known_accepts_canonical_actions():
    for a in actions.ALL_ACTIONS:
        assert actions.is_known(a)


def test_is_known_rejects_unknown():
    assert not actions.is_known("tc:s3:Hadouken")
    assert not actions.is_known("s3:GetObject")  # no tc: prefix
    assert not actions.is_known("")
    assert not actions.is_known("tc:s3:*")  # wildcards aren't 'known'
