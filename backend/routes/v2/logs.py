"""v2 endpoints for the logging/observability UI.

- GET  /api/v2/events         Paginated audit events (domain actions)
- GET  /api/v2/events/{id}    Single event by _id
- GET  /api/v2/logs           Paginated ops logs (debug stream)
- POST /api/v2/client-logs    Frontend error ingest
- GET  /api/v2/logs/summary   Tiny counters for the Logs page header

All endpoints are additive — do not replace any v1 behavior.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

import db
import logging_lib

router = APIRouter(prefix="/api/v2", tags=["logs"])


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def _serialize(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    out = dict(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    # ISO strings for any datetime value
    for k, v in list(out.items()):
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


def _parse_since(since: str | None) -> datetime | None:
    if not since:
        return None
    # Accept shorthand (5m, 1h, 24h, 7d) or ISO-8601
    s = since.strip().lower()
    try:
        if s.endswith("m") and s[:-1].isdigit():
            return datetime.now(timezone.utc) - timedelta(minutes=int(s[:-1]))
        if s.endswith("h") and s[:-1].isdigit():
            return datetime.now(timezone.utc) - timedelta(hours=int(s[:-1]))
        if s.endswith("d") and s[:-1].isdigit():
            return datetime.now(timezone.utc) - timedelta(days=int(s[:-1]))
        # ISO
        return datetime.fromisoformat(s.replace("z", "+00:00"))
    except Exception:
        return None


def _apply_since(query: dict, since_dt: datetime | None) -> dict:
    if since_dt is None:
        return query
    # `ts` is stored as an ISO string in the envelope. Compare as string
    # since ISO-8601 is lexicographically ordered when timezone is fixed.
    iso = since_dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    query["ts"] = {"$gte": iso}
    return query


# ---------------------------------------------------------------------------
# GET /api/v2/events  — audit events (domain actions)
# ---------------------------------------------------------------------------

@router.get("/events")
async def list_events(
    limit: int = Query(50, ge=1, le=500),
    cursor: str | None = Query(None, description="Opaque pagination cursor (_id)"),
    event: str | None = Query(None, description="Exact event name or prefix with trailing * e.g. template.*"),
    flow_id: str | None = None,
    request_id: str | None = None,
    user_id: str | None = None,
    env: str | None = None,
    outcome: str | None = None,
    since: str | None = Query(None, description="Shorthand (5m/1h/24h/7d) or ISO-8601"),
):
    q: dict[str, Any] = {}
    if event:
        if event.endswith("*"):
            q["event"] = {"$regex": f"^{event[:-1]}"}
        else:
            q["event"] = event
    if flow_id:
        q["flow_id"] = flow_id
    if request_id:
        q["request_id"] = request_id
    if user_id:
        q["user_id"] = user_id
    if env:
        q["env"] = env
    if outcome:
        q["outcome"] = outcome
    _apply_since(q, _parse_since(since))

    if cursor:
        try:
            q["_id"] = {"$lt": ObjectId(cursor)}
        except InvalidId:
            raise HTTPException(400, "invalid cursor")

    docs = (
        await db.audit_events()
        .find(q)
        .sort("_id", -1)
        .limit(limit + 1)
        .to_list(length=limit + 1)
    )

    has_more = len(docs) > limit
    docs = docs[:limit]
    next_cursor = str(docs[-1]["_id"]) if has_more and docs else None

    return {
        "items": [_serialize(d) for d in docs],
        "next_cursor": next_cursor,
        "has_more": has_more,
        "count": len(docs),
    }


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    try:
        oid = ObjectId(event_id)
    except InvalidId:
        raise HTTPException(400, "invalid event id")
    doc = await db.audit_events().find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "event not found")
    return _serialize(doc)


# ---------------------------------------------------------------------------
# GET /api/v2/logs  — ops logs (debug stream, capped collection)
# ---------------------------------------------------------------------------

@router.get("/logs")
async def list_logs(
    limit: int = Query(100, ge=1, le=1000),
    cursor: str | None = None,
    level: str | None = Query(None, description="debug | info | warn | error"),
    min_level: str | None = Query(None, description="inclusive floor — e.g. 'warn' returns warn+error"),
    flow_id: str | None = None,
    request_id: str | None = None,
    env: str | None = None,
    kind: str | None = Query(None, description="log | event"),
    q: str | None = Query(None, description="substring match in message/source"),
    since: str | None = Query(None, description="5m/1h/24h/7d or ISO-8601"),
):
    query: dict[str, Any] = {}
    if level:
        query["level"] = level
    elif min_level:
        order = ["debug", "info", "warn", "error"]
        if min_level in order:
            query["level"] = {"$in": order[order.index(min_level):]}
    if flow_id:
        query["flow_id"] = flow_id
    if request_id:
        query["request_id"] = request_id
    if env:
        query["env"] = env
    if kind:
        query["kind"] = kind
    if q:
        query["$or"] = [
            {"message": {"$regex": q, "$options": "i"}},
            {"source": {"$regex": q, "$options": "i"}},
            {"event": {"$regex": q, "$options": "i"}},
        ]
    _apply_since(query, _parse_since(since))

    if cursor:
        try:
            query["_id"] = {"$lt": ObjectId(cursor)}
        except InvalidId:
            raise HTTPException(400, "invalid cursor")

    docs = (
        await db.app_logs()
        .find(query)
        .sort("_id", -1)
        .limit(limit + 1)
        .to_list(length=limit + 1)
    )

    has_more = len(docs) > limit
    docs = docs[:limit]
    next_cursor = str(docs[-1]["_id"]) if has_more and docs else None

    return {
        "items": [_serialize(d) for d in docs],
        "next_cursor": next_cursor,
        "has_more": has_more,
        "count": len(docs),
    }


# ---------------------------------------------------------------------------
# GET /api/v2/logs/summary  — counters for the Logs page header
# ---------------------------------------------------------------------------

@router.get("/logs/summary")
async def logs_summary(window: str = Query("1h", description="5m/1h/24h/7d")):
    since_dt = _parse_since(window) or datetime.now(timezone.utc) - timedelta(hours=1)
    iso = since_dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    # Counters by level
    level_pipeline = [
        {"$match": {"ts": {"$gte": iso}}},
        {"$group": {"_id": "$level", "n": {"$sum": 1}}},
    ]
    level_counts = {
        d["_id"]: d["n"]
        async for d in db.app_logs().aggregate(level_pipeline)
    }

    # Counters by event (top 8)
    event_pipeline = [
        {"$match": {"ts": {"$gte": iso}}},
        {"$group": {"_id": "$event", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 8},
    ]
    top_events = [
        {"event": d["_id"], "count": d["n"]}
        async for d in db.audit_events().aggregate(event_pipeline)
    ]

    total_events = await db.audit_events().count_documents({"ts": {"$gte": iso}})

    return {
        "window": window,
        "since": iso,
        "log_level_counts": level_counts,
        "top_events": top_events,
        "total_events": total_events,
    }


# ---------------------------------------------------------------------------
# POST /api/v2/client-logs  — frontend error / event ingest
# ---------------------------------------------------------------------------

class ClientLogPayload(BaseModel):
    level: str = Field(default="error")
    message: str
    source: str | None = None
    url: str | None = None
    user_agent: str | None = None
    stack: str | None = None
    flow_id: str | None = None
    event: str | None = None          # optional — lets frontend emit flow.started etc.
    data: dict | None = None
    context: dict | None = None


@router.post("/client-logs")
async def client_log(payload: ClientLogPayload, request: Request):
    # Prefer the header, fall back to the body
    flow_id = request.headers.get("x-flow-id") or payload.flow_id
    if flow_id:
        # Override the context var so emission below carries this flow_id
        logging_lib._flow_id_var.set(flow_id)

    ctx = dict(payload.context or {})
    ctx.update({
        "client_url": payload.url,
        "client_user_agent": payload.user_agent or request.headers.get("user-agent"),
        "origin": "frontend",
    })

    if payload.event:
        # Frontend-originated domain event (e.g. template.flow.started)
        logging_lib.emit_event(
            payload.event,
            data=payload.data,
            outcome=(payload.data or {}).get("outcome"),
        )
        return {"status": "ok", "kind": "event"}

    error = None
    if payload.stack:
        error = {"type": "ClientError", "message": payload.message, "stack_tail": payload.stack[-2000:]}

    logging_lib.emit_log(
        payload.message,
        level=payload.level if payload.level in ("debug", "info", "warn", "error") else "error",
        source=payload.source or "frontend",
        error=error,
        context=ctx,
    )
    return {"status": "ok", "kind": "log"}


# ---------------------------------------------------------------------------
# GET /api/v2/events/by-flow/{flow_id}  — full narrative for a flow
# ---------------------------------------------------------------------------

@router.get("/events/by-flow/{flow_id}")
async def events_by_flow(flow_id: str):
    """All audit events + ops logs for a single flow, chronological.
    Powers the 'expand flow' drawer in the UI.
    """
    events = await (
        db.audit_events()
        .find({"flow_id": flow_id})
        .sort("_id", 1)
        .to_list(length=500)
    )
    logs = await (
        db.app_logs()
        .find({"flow_id": flow_id})
        .sort("_id", 1)
        .to_list(length=2000)
    )
    return {
        "flow_id": flow_id,
        "events": [_serialize(d) for d in events],
        "logs": [_serialize(d) for d in logs],
    }
