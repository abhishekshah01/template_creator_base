"""Structured logging + event emission for template-creator.

Two streams, same envelope:

- emit_event(...)  -> writes to stdout (json) + audit_events (if auditable)
                      + app_logs (every event is also an ops-log entry)
- emit_log(...)    -> writes to stdout (json) + app_logs only

Plus:
- RequestContextMiddleware: assigns request_id, captures X-Flow-Id header,
  logs http.access on every response, captures unhandled exceptions.
- httpx_event_hooks(): attach to AsyncClient to log every outbound call.
- redact(): scrubs secrets (bearer tokens, passwords) from arbitrary JSON.

Design rules:
- Never let a logging failure break a request. All Mongo writes are
  fire-and-forget via asyncio.create_task and catch all exceptions.
- Never log raw bearer tokens, passwords, or connection strings.
- Envelope is stable; put event-specific data under `data`.
"""

from __future__ import annotations

import asyncio
import contextvars
import hashlib
import json
import logging
import os
import re
import sys
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

import config as app_config
import db
import events as event_registry

# ---------------------------------------------------------------------------
# Context vars (request-scoped; propagate automatically through async code)
# ---------------------------------------------------------------------------

_request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)
_flow_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("flow_id", default=None)
_user_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_id", default=None)
_template_run_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("template_run_id", default=None)


def current_request_id() -> str | None:
    return _request_id_var.get()


def current_flow_id() -> str | None:
    return _flow_id_var.get()


def set_user_id(user_id: str | None) -> None:
    _user_id_var.set(user_id)


def set_template_run_id(run_id: str | None) -> None:
    _template_run_id_var.set(run_id)


def _service_name() -> str:
    return os.environ.get("SERVICE_NAME", "template-creator-backend")


# ---------------------------------------------------------------------------
# Redaction — scrub secrets before persisting / printing
# ---------------------------------------------------------------------------

_SECRET_KEY_PATTERN = re.compile(
    r"(?i)(bearer_token|authorization|password|restic_password|"
    r"api_key|secret|private_key|key_file|sa_key|credentials?)"
)
_BEARER_PATTERN = re.compile(r"(Bearer\s+)[A-Za-z0-9._\-]+", re.IGNORECASE)
_MONGO_DSN_PATTERN = re.compile(r"mongodb(?:\+srv)?://[^@\s]+:[^@\s]+@")
_PG_DSN_PATTERN = re.compile(r"password=[^\s;&]+", re.IGNORECASE)


def _redact_scalar(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    s = value
    s = _BEARER_PATTERN.sub(r"\1[REDACTED]", s)
    s = _MONGO_DSN_PATTERN.sub("mongodb://[REDACTED]@", s)
    s = _PG_DSN_PATTERN.sub("password=[REDACTED]", s)
    return s


def redact(obj: Any) -> Any:
    """Recursively redact secrets from a JSON-serializable structure."""
    if isinstance(obj, dict):
        out: dict[str, Any] = {}
        for k, v in obj.items():
            if isinstance(k, str) and _SECRET_KEY_PATTERN.search(k):
                out[k] = "[REDACTED]" if v else v
            else:
                out[k] = redact(v)
        return out
    if isinstance(obj, list):
        return [redact(x) for x in obj]
    return _redact_scalar(obj)


def hash_token(token: str | None) -> str | None:
    if not token:
        return None
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"sha256:{digest[:16]}"


# ---------------------------------------------------------------------------
# Envelope construction
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _base_envelope(
    *,
    level: str,
    kind: str,
    event: str | None = None,
    data: dict | None = None,
    error: dict | None = None,
    duration_ms: float | None = None,
    outcome: str | None = None,
    source: str | None = None,
    message: str | None = None,
    http: dict | None = None,
    context: dict | None = None,
) -> dict:
    env = {
        "ts": _now_iso(),
        "level": level,
        "kind": kind,  # "event" | "log"
        "service": _service_name(),
        "env": getattr(app_config, "ENV", None),
        "request_id": _request_id_var.get(),
        "flow_id": _flow_id_var.get(),
        "template_run_id": _template_run_id_var.get(),
        "user_id": _user_id_var.get(),
    }
    if event is not None:
        env["event"] = event
    if outcome is not None:
        env["outcome"] = outcome
    if duration_ms is not None:
        env["duration_ms"] = round(float(duration_ms), 2)
    if message is not None:
        env["message"] = message
    if source is not None:
        env["source"] = source
    if http is not None:
        env["http"] = http
    if context is not None:
        env["context"] = redact(context)
    if data is not None:
        env["data"] = redact(data)
    if error is not None:
        env["error"] = redact(error)
    return env


def _print_json(envelope: dict) -> None:
    """Emit to stdout as a single JSON line."""
    try:
        sys.stdout.write(json.dumps(envelope, default=str) + "\n")
        sys.stdout.flush()
    except Exception:
        # Never let logging take down the process.
        pass


def _fire_and_forget(coro) -> None:
    """Schedule an async write without awaiting. Catches all exceptions."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(_wrap_safe(coro))
    # Prevent "Task was destroyed but it is pending" noise
    task.add_done_callback(lambda _t: None)


async def _wrap_safe(coro) -> None:
    try:
        await coro
    except Exception as e:  # pragma: no cover — defensive
        try:
            sys.stderr.write(f"[logging_lib] mongo write failed: {e}\n")
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Public emitters
# ---------------------------------------------------------------------------

def emit_event(
    event: str,
    *,
    outcome: str | None = None,
    data: dict | None = None,
    error: dict | None = None,
    duration_ms: float | None = None,
    level: str | None = None,
) -> None:
    """Emit a domain event.

    Writes to stdout + app_logs always; also to audit_events if the
    event is registered as auditable.
    """
    lvl = level or event_registry.default_level(event)
    envelope = _base_envelope(
        level=lvl,
        kind="event",
        event=event,
        data=data,
        error=error,
        duration_ms=duration_ms,
        outcome=outcome,
    )
    _print_json(envelope)
    # Persist. audit_events gets the full envelope; app_logs gets a
    # slightly trimmed copy (but keeps correlation IDs + summary).
    _fire_and_forget(db.app_logs().insert_one(dict(envelope)))
    if event_registry.is_auditable(event):
        _fire_and_forget(db.audit_events().insert_one(dict(envelope)))


def emit_log(
    message: str,
    *,
    level: str = "info",
    source: str | None = None,
    error: dict | None = None,
    http: dict | None = None,
    context: dict | None = None,
) -> None:
    """Emit an operational log line (debug/info/warn/error)."""
    envelope = _base_envelope(
        level=level,
        kind="log",
        message=message,
        source=source,
        error=error,
        http=http,
        context=context,
    )
    _print_json(envelope)
    _fire_and_forget(db.app_logs().insert_one(dict(envelope)))


def format_exception(exc: BaseException) -> dict:
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    tail = "".join(tb)[-2000:]  # cap stack tail
    return {
        "type": type(exc).__name__,
        "message": str(exc)[:2000],
        "stack_tail": tail,
    }


# ---------------------------------------------------------------------------
# FastAPI middleware — http access + unhandled exception capture
# ---------------------------------------------------------------------------

# Paths we don't want to log at info level (health checks, log list queries
# that would create feedback loops).
_QUIET_PATHS = {"/", "/healthz", "/readyz"}
_NO_LOG_PREFIXES = ("/api/v2/logs", "/api/v2/events")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:16]}"
        flow_id = request.headers.get("x-flow-id")

        req_token = _request_id_var.set(request_id)
        flow_token = _flow_id_var.set(flow_id)
        user_token = _user_id_var.set(None)
        run_token = _template_run_id_var.set(None)

        start = time.perf_counter()
        status_code = 500
        exc_info: dict | None = None
        response: Response | None = None
        try:
            try:
                response = await call_next(request)
                status_code = response.status_code
            except Exception as exc:
                exc_info = format_exception(exc)
                status_code = 500
                response = JSONResponse(
                    {"detail": "Internal server error", "request_id": request_id},
                    status_code=500,
                )
        finally:
            duration_ms = (time.perf_counter() - start) * 1000.0

            path = request.url.path
            should_log = path not in _QUIET_PATHS and not any(
                path.startswith(p) for p in _NO_LOG_PREFIXES
            )

            if should_log or status_code >= 400 or exc_info is not None:
                level = (
                    "error" if exc_info is not None or status_code >= 500
                    else "warn" if status_code >= 400
                    else "info"
                )
                client = request.client
                emit_log(
                    f"{request.method} {path} -> {status_code}",
                    level=level,
                    source="middleware.http_access",
                    http={
                        "method": request.method,
                        "path": path,
                        "query": str(request.url.query) or None,
                        "status": status_code,
                        "duration_ms": round(duration_ms, 2),
                        "client_ip": client.host if client else None,
                        "user_agent": request.headers.get("user-agent"),
                    },
                    error=exc_info,
                )

            # Echo correlation IDs on every response so browser devtools
            # can link UI actions to server logs.
            if response is not None:
                response.headers["x-request-id"] = request_id
                if flow_id:
                    response.headers["x-flow-id"] = flow_id

            _request_id_var.reset(req_token)
            _flow_id_var.reset(flow_token)
            _user_id_var.reset(user_token)
            _template_run_id_var.reset(run_token)

        return response


# ---------------------------------------------------------------------------
# httpx hooks — log every outbound API call
# ---------------------------------------------------------------------------

def httpx_event_hooks() -> dict:
    """Return event_hooks dict for httpx.AsyncClient.

    Usage:
        httpx.AsyncClient(event_hooks=httpx_event_hooks())
    """
    async def on_request(request):
        request.extensions["_start_ns"] = time.perf_counter_ns()

    async def on_response(response):
        start_ns = response.request.extensions.get("_start_ns")
        duration_ms = (
            (time.perf_counter_ns() - start_ns) / 1_000_000 if start_ns else None
        )
        status = response.status_code
        level = "error" if status >= 500 else "warn" if status >= 400 else "debug"
        upstream = _classify_upstream(str(response.request.url))
        body_tail = None
        if status >= 400:
            try:
                body_tail = (await response.aread()).decode(errors="replace")[-1000:]
            except Exception:
                body_tail = None

        emit_log(
            f"{response.request.method} {response.request.url} -> {status}",
            level=level,
            source="httpx.response",
            http={
                "method": response.request.method,
                "url": str(response.request.url),
                "status": status,
                "duration_ms": round(duration_ms, 2) if duration_ms else None,
                "direction": "outbound",
            },
            context={
                "upstream": upstream,
                "response_tail": body_tail,
            },
        )

        if status >= 400:
            emit_event(
                event_registry.EVENT_EXTERNAL_API_FAILED,
                outcome="failure",
                duration_ms=duration_ms,
                data={
                    "upstream": upstream,
                    "url": str(response.request.url),
                    "method": response.request.method,
                    "status": status,
                    "body_tail": body_tail,
                },
            )

    return {"request": [on_request], "response": [on_response]}


def _classify_upstream(url: str) -> str:
    u = url.lower()
    if "envcore" in u or "/api/v1/env" in u:
        return "envcore"
    if "pause" in u:
        return "pause-service"
    if "category-config" in u or "/internal/" in u or "/jobs/" in u:
        return "agent-service"
    return "unknown"
