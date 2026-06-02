"""RBAC permission system. Action codes use the `tc:` prefix to signal
they're app-internal and never reach AWS IAM."""

from services.permissions import actions, matchers

__all__ = ["actions", "matchers"]
