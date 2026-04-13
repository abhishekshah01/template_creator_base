"""Central registry of domain event names.

Adding a new event:
  1. Add a constant here.
  2. Include it in AUDITABLE_EVENTS if it should be persisted to audit_events.
  3. Emit it via logging_lib.emit_event(EVENT_NAME, data={...}, ...)

Naming: <domain>.<entity>.<action>, snake_case, past tense for completed
actions (e.g. "template.created"), "started"/"blocked"/"rejected" for
special lifecycle states.
"""

from __future__ import annotations

# --- Session / environment ----------------------------------------------------
EVENT_ENV_SWITCHED = "env.switched"
EVENT_AUTH_TOKEN_REJECTED = "auth.token.rejected"

# --- Template creation flow ---------------------------------------------------
EVENT_TEMPLATE_FLOW_STARTED = "template.flow.started"     # frontend marker
EVENT_TEMPLATE_FLOW_COMPLETED = "template.flow.completed"
EVENT_TEMPLATE_FLOW_ABANDONED = "template.flow.abandoned"

EVENT_JOB_INSPECTED = "job.inspected"
EVENT_COLLECTIONS_LISTED = "collections.listed"
EVENT_COLLECTION_DATA_SAMPLED = "collection.data.sampled"
EVENT_COLLECTIONS_DROPPED = "collections.dropped"
EVENT_JOB_PAUSED = "job.paused"
EVENT_TEMPLATE_CREATED = "template.created"
EVENT_TEMPLATE_SUMMARY_GENERATED = "template.summary.generated"

# --- Mongosh (per-job ad-hoc queries in the pod) ------------------------------
EVENT_MONGOSH_EXECUTED = "mongosh.executed"
EVENT_MONGOSH_BLOCKED = "mongosh.blocked"

# --- Category configs ---------------------------------------------------------
EVENT_CATEGORY_CONFIG_LISTED = "category_config.listed"
EVENT_CATEGORY_CONFIG_VIEWED = "category_config.viewed"
EVENT_CATEGORY_CONFIG_CREATED = "category_config.created"
EVENT_CATEGORY_CONFIG_UPDATED = "category_config.updated"

# --- System / upstream --------------------------------------------------------
EVENT_EXTERNAL_API_FAILED = "external_api.failed"


# Events that get persisted to the audit_events collection. Reads/lookups
# are intentionally excluded — they stay in app_logs (debug stream) at
# debug/info level only.
AUDITABLE_EVENTS: frozenset[str] = frozenset({
    EVENT_ENV_SWITCHED,
    EVENT_AUTH_TOKEN_REJECTED,
    EVENT_TEMPLATE_FLOW_STARTED,
    EVENT_TEMPLATE_FLOW_COMPLETED,
    EVENT_TEMPLATE_FLOW_ABANDONED,
    EVENT_COLLECTIONS_DROPPED,
    EVENT_JOB_PAUSED,
    EVENT_TEMPLATE_CREATED,
    EVENT_TEMPLATE_SUMMARY_GENERATED,
    EVENT_MONGOSH_EXECUTED,
    EVENT_MONGOSH_BLOCKED,
    EVENT_CATEGORY_CONFIG_CREATED,
    EVENT_CATEGORY_CONFIG_UPDATED,
    EVENT_EXTERNAL_API_FAILED,
})


# Default level per event — can be overridden at emit time.
EVENT_LEVEL: dict[str, str] = {
    EVENT_COLLECTIONS_DROPPED: "warn",      # destructive
    EVENT_MONGOSH_BLOCKED: "warn",
    EVENT_AUTH_TOKEN_REJECTED: "warn",
    EVENT_EXTERNAL_API_FAILED: "error",
}


def default_level(event: str) -> str:
    return EVENT_LEVEL.get(event, "info")


def is_auditable(event: str) -> bool:
    return event in AUDITABLE_EVENTS
