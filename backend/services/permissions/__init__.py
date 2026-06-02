"""RBAC permission system.

This package implements AWS-IAM-style permission evaluation for the
template-creator app. Action codes look like `tc:s3:GetObject`; resource
URIs look like `s3://bucket/prefix/*`. The evaluator returns Allow or Deny
using the AWS-faithful precedence: explicit deny > explicit allow > default
deny.

These actions are *internal* to this app — they do NOT call AWS IAM, and
the `tc:` prefix is the deliberate signal that ownership of these strings
sits with us, not AWS.
"""

from services.permissions import actions, matchers

__all__ = ["actions", "matchers"]
