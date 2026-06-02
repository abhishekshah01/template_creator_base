"""Permission evaluator.

evaluate(user, action, resource) is the single source of truth for "is
this allowed?". The owner type short-circuits to allow. Otherwise the
effective policy is the union of every attached role's policy plus the
user's inline_policy. AWS-faithful precedence: explicit deny > explicit
allow > default deny."""

from __future__ import annotations

import logging
from typing import Iterable, Optional

from clients.mongo_client import roles as roles_coll
from schemas.permissions import Decision, Statement
from services.permissions.matchers import statement_matches

log = logging.getLogger(__name__)


REASON_OWNER_SHORTCIRCUIT = "owner short-circuit"
REASON_EXPLICIT_DENY = "explicit deny"
REASON_EXPLICIT_ALLOW = "explicit allow"
REASON_DEFAULT_DENY = "default deny"


def _coerce_statements(raw: Iterable[dict]) -> list[Statement]:
    out: list[Statement] = []
    for entry in raw or []:
        if isinstance(entry, Statement):
            out.append(entry)
            continue
        try:
            out.append(Statement(**entry))
        except Exception:
            # A persisted statement that no longer validates means the
            # action set has shifted under us (e.g. an action was renamed
            # without a Mongo migration). Skip it — never crash a request
            # because of a stale row. The audit reason will still be
            # 'default deny', not a misleading 'allow'.
            log.warning("permissions.evaluator: skipping invalid statement %r", entry)
    return out


async def _load_role_statements(role_names: Iterable[str]) -> list[Statement]:
    names = [n for n in role_names or [] if n]
    if not names:
        return []
    docs = await roles_coll.find({"name": {"$in": names}}).to_list(length=len(names))
    stmts: list[Statement] = []
    for d in docs:
        stmts.extend(_coerce_statements(d.get("policy", [])))
    return stmts


async def collect_statements(user: dict) -> list[Statement]:
    """Effective policy for a user = role statements ∪ inline statements."""
    role_stmts = await _load_role_statements(user.get("attached_roles", []))
    inline_stmts = _coerce_statements(user.get("inline_policy", []))
    return role_stmts + inline_stmts


def _matches(stmt: Statement, action: str, resource: str) -> bool:
    return statement_matches(stmt.actions, stmt.resources, action, resource)


async def evaluate(user: Optional[dict], action: str, resource: str) -> Decision:
    if not user:
        return Decision(effect="deny", reason=REASON_DEFAULT_DENY)

    if user.get("type") == "owner" or user.get("is_admin") is True:
        # is_admin is the legacy short-circuit; PR3 still emits new admin
        # docs with type='admin' but never with is_admin=True, so this only
        # fires for pre-RBAC accounts that haven't been migrated yet.
        return Decision(effect="allow", reason=REASON_OWNER_SHORTCIRCUIT)

    stmts = await collect_statements(user)

    if any(s.effect == "deny" and _matches(s, action, resource) for s in stmts):
        return Decision(effect="deny", reason=REASON_EXPLICIT_DENY)

    if any(s.effect == "allow" and _matches(s, action, resource) for s in stmts):
        return Decision(effect="allow", reason=REASON_EXPLICIT_ALLOW)

    return Decision(effect="deny", reason=REASON_DEFAULT_DENY)
