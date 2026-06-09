"""Template creation — triggers the Composer DAG (via app-service) and tracks
the run in MongoDB.

`/api/create-template` returns immediately with a `dag_run_id`. The frontend
polls `/api/template-job/{dag_run_id}` (forwarding its bearer token); each poll
does a live status fetch through app-service and folds the result into Mongo.
app-service holds the GCP creds and mints the Composer OIDC token — we never do.
"""

from __future__ import annotations

import re
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

import config
from clients import composer_client
from clients.mongo_client import template_jobs

TERMINAL_DAG_STATES = {"success", "failed"}
_SAFE_SLUG = re.compile(r"^[a-zA-Z0-9_-]+$")
_STRIP_FIELDS = ("_id", "webhook_secret")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _strip(doc: dict) -> dict:
    out = dict(doc)
    for field in _STRIP_FIELDS:
        out.pop(field, None)
    return out


def _validate_slugs(**fields: str) -> None:
    """Reject anything that isn't a plain slug. Catches injection-vector ids early."""
    for label, value in fields.items():
        if not _SAFE_SLUG.match(value or ""):
            raise HTTPException(400, f"Invalid {label}: only letters, digits, '-', '_' allowed")


async def create_template(
    *,
    job_id: str,
    user_id: str,
    template_name: str,
    bearer_token: str,
) -> dict:
    """Insert a Mongo record and trigger the Composer DAG via app-service."""
    _validate_slugs(template_name=template_name, job_id=job_id, user_id=user_id)

    # Client-generated dag_run_id is our stable Mongo key + the value we embed
    # in webhook URLs. If Composer renames the run we store its id separately
    # (composer_dag_run_id) and poll with that, never overwriting the original.
    dag_run_id = f"tc-{uuid.uuid4().hex[:12]}"
    # Per-job secret Composer echoes back as X-Callback-Secret on the webhook,
    # so an unauthenticated POST can't forge a terminal job state.
    webhook_secret = secrets.token_urlsafe(24)

    webhook_url = ""
    if config.TEMPLATE_JOB_NOTIFY_MODE in ("webhook", "both") and config.TEMPLATE_JOB_WEBHOOK_BASE_URL:
        webhook_url = (
            f"{config.TEMPLATE_JOB_WEBHOOK_BASE_URL.rstrip('/')}/api/template-job/{dag_run_id}/callback"
        )

    conf = {
        "job_id": job_id,
        "user_id": user_id,
        "template_name": template_name,
        "webhook_url": webhook_url,
        "webhook_secret": webhook_secret,
        "source_bucket": config.SOURCE_BUCKET,
        "dest_bucket": config.DEST_BUCKET,
    }

    record = {
        "dag_run_id": dag_run_id,
        "composer_dag_run_id": dag_run_id,  # updated below if Composer renames
        "webhook_secret": webhook_secret,
        "job_id": job_id,
        "user_id": user_id,
        "template_name": template_name,
        "status": "queued",
        "gcs_path": "",
        "error": "",
        "started_at": _utcnow(),
        "updated_at": _utcnow(),
        "finished_at": None,
    }
    await template_jobs.insert_one(record)

    try:
        result = await composer_client.trigger_dag(
            dag_run_id=dag_run_id, conf=conf, bearer_token=bearer_token
        )
    except HTTPException as exc:
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"status": "failed", "error": str(exc.detail)[:500], "finished_at": _utcnow()}},
        )
        raise

    status_code = result.get("status_code", 0)
    body = result.get("body")
    if status_code >= 400:
        detail = body if isinstance(body, str) else str(body)
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"status": "failed", "error": detail[:500], "finished_at": _utcnow()}},
        )
        raise HTTPException(status_code, f"Composer rejected the DAG trigger: {detail[:500]}")

    composer_id = body.get("dag_run_id", "") if isinstance(body, dict) else ""
    if composer_id and composer_id != dag_run_id:
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"composer_dag_run_id": composer_id, "updated_at": _utcnow()}},
        )
        record["composer_dag_run_id"] = composer_id

    return _strip(record)


async def get_template_job(*, dag_run_id: str, bearer_token: str) -> dict:
    """Return a DAG run's status, doing a live Composer fetch when non-terminal.

    Terminal records (including webhook-fed ones) are returned as-is. Transient
    fetch failures fall back to the last stored status so a poll never flaps the
    job to failed; only auth failures (401/403) propagate to prompt re-auth.
    """
    doc = await template_jobs.find_one({"dag_run_id": dag_run_id})
    if not doc:
        raise HTTPException(404, f"No template job found for dag_run_id={dag_run_id}")

    if doc.get("status") in TERMINAL_DAG_STATES or doc.get("status") == "timeout":
        return _strip(doc)

    composer_id = doc.get("composer_dag_run_id") or dag_run_id
    try:
        result = await composer_client.get_dag_run(dag_run_id=composer_id, bearer_token=bearer_token)
    except HTTPException as exc:
        if exc.status_code in (401, 403):
            raise
        return _strip(doc)

    status_code = result.get("status_code", 0)
    body = result.get("body")
    # 404 = Composer hasn't registered the run yet (still queued); any other
    # 4xx/5xx is a transient blip — keep the last known status either way.
    if status_code >= 400 or not isinstance(body, dict):
        return _strip(doc)

    state = (body.get("state") or "").lower()
    update: dict[str, Any] = {"status": state or "running", "updated_at": _utcnow()}
    if state in TERMINAL_DAG_STATES:
        update["finished_at"] = _utcnow()
        if state == "success" and not doc.get("gcs_path"):
            update["gcs_path"] = f"gs://{config.DEST_BUCKET}/{doc.get('template_name', '')}"

    await template_jobs.update_one({"dag_run_id": dag_run_id}, {"$set": update})
    doc.update(update)
    return _strip(doc)


async def apply_callback(
    *,
    dag_run_id: str,
    secret: str,
    state: str,
    gcs_path: str,
    error: str,
) -> None:
    """Apply a webhook callback from Composer to the Mongo record.

    Verifies the per-job secret before applying; rejects unauthenticated calls.
    An empty/unknown `state` is treated as `failed` — never silently `success`.
    """
    doc = await template_jobs.find_one({"dag_run_id": dag_run_id})
    if doc is None:
        raise HTTPException(404, f"No template job found for dag_run_id={dag_run_id}")

    stored_secret = doc.get("webhook_secret") or ""
    if not stored_secret or not secrets.compare_digest(stored_secret, secret or ""):
        raise HTTPException(403, "Invalid callback secret")

    # Empty/missing state is treated as failure, never silently success.
    state_lower = (state or "").lower()
    if state_lower:
        update_status = state_lower
    else:
        update_status = "failed"
        if not error:
            error = "Callback received without a state — defaulted to failed"

    update: dict = {"status": update_status, "updated_at": _utcnow()}
    if update_status in TERMINAL_DAG_STATES:
        update["finished_at"] = _utcnow()
    if gcs_path:
        update["gcs_path"] = gcs_path
    if error:
        update["error"] = error

    await template_jobs.update_one({"dag_run_id": dag_run_id}, {"$set": update})
