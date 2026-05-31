"""Template creation — triggers the Composer DAG and tracks the run in MongoDB.

Replaces the old gcloud-SSH-to-VM flow. `/api/create-template` returns
immediately with a `dag_run_id`; status is persisted in Mongo and the frontend
polls `/api/template-job/{dag_run_id}` until terminal.
"""

from __future__ import annotations

import asyncio
import re
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import BackgroundTasks, HTTPException

import config
from clients import composer_client
from clients.mongo_client import template_jobs

TERMINAL_DAG_STATES = {"success", "failed"}
POLL_INTERVAL_SECONDS = 5
POLL_MAX_DURATION_SECONDS = 30 * 60
_SAFE_SLUG = re.compile(r"^[a-zA-Z0-9_-]+$")
# How many consecutive 401/403s during polling before we mark the run failed.
_OIDC_FAILURE_BUDGET = 3


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_slugs(**fields: str) -> None:
    """Reject anything that isn't a plain slug. Catches injection-vector ids early."""
    for label, value in fields.items():
        if not _SAFE_SLUG.match(value or ""):
            raise HTTPException(400, f"Invalid {label}: only letters, digits, '-', '_' allowed")


async def _poll_dag_run(dag_run_id: str) -> None:
    """Background task: poll Composer until terminal, updating Mongo each tick.

    `dag_run_id` is our stable Mongo key. The Composer-side run id (if it
    differs) is read from the record's `composer_dag_run_id` each tick.
    """
    loop = asyncio.get_event_loop()
    deadline = loop.time() + POLL_MAX_DURATION_SECONDS
    oidc_failures = 0

    while True:
        if loop.time() > deadline:
            await template_jobs.update_one(
                {"dag_run_id": dag_run_id},
                {
                    "$set": {
                        "status": "timeout",
                        "error": f"Polling exceeded {POLL_MAX_DURATION_SECONDS}s without terminal state",
                        "updated_at": _utcnow(),
                        "finished_at": _utcnow(),
                    }
                },
            )
            return

        await asyncio.sleep(POLL_INTERVAL_SECONDS)

        # Re-fetch each tick: composer_dag_run_id may have been set when
        # Composer first responded; webhook callbacks may also have arrived.
        doc = await template_jobs.find_one({"dag_run_id": dag_run_id})
        if doc is None:
            return
        # In `both` mode a webhook may have already terminal-fed the record.
        # Stop polling so we don't write an older Composer state back over it.
        if doc.get("status") in TERMINAL_DAG_STATES or doc.get("status") == "timeout":
            return
        composer_id = doc.get("composer_dag_run_id") or dag_run_id

        try:
            resp = await composer_client.get_dag_run(composer_id)
        except Exception as exc:
            print(f"[poll {dag_run_id}] transient error: {exc}")
            continue

        if resp.status_code >= 400:
            print(f"[poll {dag_run_id}] {resp.status_code}: {resp.text[:200]}")
            if resp.status_code in (401, 403):
                # Clear the cached token + retry on the next tick. Only give
                # up after _OIDC_FAILURE_BUDGET consecutive auth failures so
                # a transient bad token doesn't terminal-fail the run.
                composer_client.clear_oidc_cache()
                oidc_failures += 1
                if oidc_failures >= _OIDC_FAILURE_BUDGET:
                    await template_jobs.update_one(
                        {"dag_run_id": dag_run_id},
                        {
                            "$set": {
                                "status": "failed",
                                "error": (
                                    f"OIDC token rejected by Composer "
                                    f"{_OIDC_FAILURE_BUDGET} consecutive times while polling"
                                ),
                                "updated_at": _utcnow(),
                                "finished_at": _utcnow(),
                            }
                        },
                    )
                    return
                continue
            continue
        else:
            oidc_failures = 0

        try:
            data = resp.json()
        except Exception:
            continue

        state = (data.get("state") or "").lower()
        update = {"status": state or "running", "updated_at": _utcnow()}

        if state in TERMINAL_DAG_STATES:
            update["finished_at"] = _utcnow()
            if state == "success":
                # In poll mode the DAG doesn't tell us where it wrote; derive
                # the canonical destination. Webhook mode overrides this.
                doc = await template_jobs.find_one({"dag_run_id": dag_run_id})
                if doc and not doc.get("gcs_path"):
                    update["gcs_path"] = f"gs://{config.DEST_BUCKET}/{doc.get('template_name', '')}"

        await template_jobs.update_one({"dag_run_id": dag_run_id}, {"$set": update})

        if state in TERMINAL_DAG_STATES:
            return


async def create_template(
    *,
    job_id: str,
    user_id: str,
    template_name: str,
    background_tasks: BackgroundTasks,
) -> dict:
    """Insert a Mongo record, trigger the Composer DAG, schedule polling."""
    _validate_slugs(template_name=template_name, job_id=job_id, user_id=user_id)

    # Client-generated dag_run_id is our stable Mongo key + the value we
    # embed in webhook URLs. If Composer renames the run we store its id
    # separately (composer_dag_run_id) and use that for polling — we never
    # overwrite the original so the webhook still finds its record.
    dag_run_id = f"tc-{uuid.uuid4().hex[:12]}"
    # Per-job webhook secret — Composer hits the callback URL with this
    # token embedded, and the callback handler verifies it. Prevents
    # forging terminal job states from an unauthenticated POST.
    webhook_secret = secrets.token_urlsafe(24)

    webhook_url = ""
    if config.TEMPLATE_JOB_NOTIFY_MODE in ("webhook", "both") and config.TEMPLATE_JOB_WEBHOOK_BASE_URL:
        webhook_url = (
            f"{config.TEMPLATE_JOB_WEBHOOK_BASE_URL.rstrip('/')}/api/template-job/{dag_run_id}/callback"
        )

    payload = {
        "dag_run_id": dag_run_id,
        "conf": {
            "job_id": job_id,
            "user_id": user_id,
            "template_name": template_name,
            "webhook_url": webhook_url,
            # Composer's DAG should set this as the `X-Callback-Secret` header
            # when POSTing to webhook_url. Keeping it out of the URL prevents
            # access-log / reverse-proxy leakage.
            "webhook_secret": webhook_secret,
            "source_bucket": config.SOURCE_BUCKET,
            "dest_bucket": config.DEST_BUCKET,
        },
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
        resp = await composer_client.trigger_dag(payload)
    except HTTPException:
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"status": "failed", "error": "Composer trigger failed", "finished_at": _utcnow()}},
        )
        raise

    if resp.status_code >= 400:
        body = resp.text[:500]
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"status": "failed", "error": body, "finished_at": _utcnow()}},
        )
        raise HTTPException(resp.status_code, f"Composer rejected the DAG trigger: {body}")

    # If Composer returned a different id, track it for polling without
    # rewriting our stable key.
    try:
        composer_id = (resp.json() or {}).get("dag_run_id", "")
    except Exception:
        composer_id = ""
    if composer_id and composer_id != dag_run_id:
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"composer_dag_run_id": composer_id, "updated_at": _utcnow()}},
        )
        record["composer_dag_run_id"] = composer_id

    if config.TEMPLATE_JOB_NOTIFY_MODE in ("poll", "both"):
        background_tasks.add_task(_poll_dag_run, dag_run_id)

    # Don't return the webhook_secret to the client; it's only for Composer.
    record.pop("_id", None)
    record.pop("webhook_secret", None)
    return record


async def get_template_job(dag_run_id: str) -> dict:
    """Fetch the current Mongo record for a DAG run. Strips the webhook secret."""
    doc = await template_jobs.find_one(
        {"dag_run_id": dag_run_id},
        {"_id": 0, "webhook_secret": 0},
    )
    if not doc:
        raise HTTPException(404, f"No template job found for dag_run_id={dag_run_id}")
    return doc


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

    state_lower = (state or "").lower()
    if state_lower in TERMINAL_DAG_STATES:
        update_status = state_lower
    elif state_lower:
        # Non-terminal but explicit state — let it through (e.g. "running").
        update_status = state_lower
    else:
        # Empty/missing state: treat as failure, not success.
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
