"""Action catalog: membership and the read/write/full hierarchy."""

from services.access_control import permission_catalog as catalog
from services.access_control.permission_catalog import S3Action


def test_all_actions_contains_every_enum_member():
    assert frozenset(action.value for action in S3Action) == catalog.ALL_S3_ACTIONS


def test_action_groups_are_strictly_nested():
    assert catalog.READ_ACTIONS < catalog.READ_WRITE_ACTIONS < catalog.FULL_ACTIONS


def test_read_group_excludes_mutations():
    assert S3Action.PUT_OBJECT not in catalog.READ_ACTIONS
    assert S3Action.DELETE_OBJECT not in catalog.READ_ACTIONS


def test_read_write_excludes_delete_and_invalidate():
    assert S3Action.DELETE_OBJECT not in catalog.READ_WRITE_ACTIONS
    assert S3Action.INVALIDATE_CACHE not in catalog.READ_WRITE_ACTIONS


def test_is_known_action():
    assert catalog.is_known_action("tc:s3:GetObject")
    assert not catalog.is_known_action("tc:s3:Nonsense")
