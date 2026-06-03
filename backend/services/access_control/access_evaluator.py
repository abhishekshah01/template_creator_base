"""The single source of truth for "is this user allowed to do this?".

An owner is unconditionally allowed. For everyone else the effective policy is
the union of every attached role's statements plus the user's inline policy,
evaluated with AWS-faithful precedence: explicit deny > explicit allow >
default deny.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable

from dal import role_repository
from schemas.policy import AccessDecision, PolicyStatement
from services.access_control.policy_matcher import statement_covers_request

log = logging.getLogger(__name__)

REASON_OWNER = "owner has unrestricted access"
REASON_EXPLICIT_DENY = "explicit deny in policy"
REASON_EXPLICIT_ALLOW = "explicit allow in policy"
REASON_DEFAULT_DENY = "no matching allow statement"


def _parse_statements(raw_statements: Iterable) -> list[PolicyStatement]:
    parsed: list[PolicyStatement] = []
    for entry in raw_statements or []:
        if isinstance(entry, PolicyStatement):
            parsed.append(entry)
            continue
        try:
            parsed.append(PolicyStatement(**entry))
        except Exception:
            # A persisted statement that no longer validates (e.g. an action was
            # removed) is skipped, never crashed on — the request just falls
            # through to default deny.
            log.warning("access_evaluator: skipping invalid statement %r", entry)
    return parsed


async def _load_role_statements(role_names: Iterable[str]) -> list[PolicyStatement]:
    names = [name for name in role_names or [] if name]
    role_docs = await role_repository.find_roles_by_names(names)
    statements: list[PolicyStatement] = []
    for doc in role_docs:
        statements.extend(_parse_statements(doc.get("policy", [])))
    return statements


async def collect_effective_statements(user: dict) -> list[PolicyStatement]:
    role_statements = await _load_role_statements(user.get("attached_roles", []))
    inline_statements = _parse_statements(user.get("inline_policy", []))
    return role_statements + inline_statements


def is_owner(user: dict) -> bool:
    return bool(user) and user.get("type") == "owner"


async def evaluate_access(user: dict, action: str, resource: str) -> AccessDecision:
    if not user:
        return AccessDecision(effect="deny", reason=REASON_DEFAULT_DENY)
    if is_owner(user):
        return AccessDecision(effect="allow", reason=REASON_OWNER)

    statements = await collect_effective_statements(user)
    requested_action = str(action)

    for statement in statements:
        if statement.effect == "deny" and statement_covers_request(
            statement.actions, statement.resources, requested_action, resource
        ):
            return AccessDecision(effect="deny", reason=REASON_EXPLICIT_DENY)

    for statement in statements:
        if statement.effect == "allow" and statement_covers_request(
            statement.actions, statement.resources, requested_action, resource
        ):
            return AccessDecision(effect="allow", reason=REASON_EXPLICIT_ALLOW)

    return AccessDecision(effect="deny", reason=REASON_DEFAULT_DENY)


async def describe_effective_policy(user: dict) -> list[dict]:
    if not user:
        return []
    if is_owner(user):
        return [{"effect": "allow", "actions": ["*"], "resources": ["*"]}]
    statements = await collect_effective_statements(user)
    return [statement.model_dump() for statement in statements]
