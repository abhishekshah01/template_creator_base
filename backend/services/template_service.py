"""Template creation — triggers the Composer DAG and tracks the run in MongoDB.

Replaces the old gcloud-SSH-to-VM flow. `/api/create-template` returns
immediately with a `dag_run_id`; status is persisted in Mongo and the frontend
polls `/api/template-job/{dag_run_id}` until terminal.
"""

from __future__ import annotations

import asyncio
import re
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


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_slugs(**fields: str) -> None:
    """Reject anything that isn't a plain slug. Catches injection-vector ids early."""
    for label, value in fields.items():
        if not _SAFE_SLUG.match(value or ""):
            raise HTTPException(400, f"Invalid {label}: only letters, digits, '-', '_' allowed")


async def _poll_dag_run(dag_run_id: str) -> None:
    """Background task: poll Composer until terminal, updating Mongo each tick."""
    loop = asyncio.get_event_loop()
    deadline = loop.time() + POLL_MAX_DURATION_SECONDS

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

        try:
            resp = await composer_client.get_dag_run(dag_run_id)
        except Exception as exc:
            print(f"[poll {dag_run_id}] transient error: {exc}")
            continue

        if resp.status_code >= 400:
            print(f"[poll {dag_run_id}] {resp.status_code}: {resp.text[:200]}")
            if resp.status_code in (401, 403):
                composer_client.clear_oidc_cache()
                await template_jobs.update_one(
                    {"dag_run_id": dag_run_id},
                    {
                        "$set": {
                            "status": "failed",
                            "error": "OIDC token rejected by Composer while polling DAG status",
                            "updated_at": _utcnow(),
                            "finished_at": _utcnow(),
                        }
                    },
                )
                return
            continue

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

    # Client-generated dag_run_id so we can write the Mongo record before
    # triggering — avoids a race where a webhook arrives before our insert.
    dag_run_id = f"tc-{uuid.uuid4().hex[:12]}"

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
            "source_bucket": config.SOURCE_BUCKET,
            "dest_bucket": config.DEST_BUCKET,
        },
    }

    record = {
        "dag_run_id": dag_run_id,
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

    # If Composer returned a different dag_run_id, follow that one for polling.
    try:
        composer_id = (resp.json() or {}).get("dag_run_id", "")
    except Exception:
        composer_id = ""
    if composer_id and composer_id != dag_run_id:
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"dag_run_id": composer_id, "updated_at": _utcnow()}},
        )
        dag_run_id = composer_id

    if config.TEMPLATE_JOB_NOTIFY_MODE in ("poll", "both"):
        background_tasks.add_task(_poll_dag_run, dag_run_id)

    record.pop("_id", None)
    record["dag_run_id"] = dag_run_id
    return record


async def get_template_job(dag_run_id: str) -> dict:
    """Fetch the current Mongo record for a DAG run."""
    doc = await template_jobs.find_one({"dag_run_id": dag_run_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, f"No template job found for dag_run_id={dag_run_id}")
    return doc


async def apply_callback(
    *,
    dag_run_id: str,
    state: str,
    gcs_path: str,
    error: str,
) -> None:
    """Apply a webhook callback from Composer to the Mongo record."""
    state_lower = (state or "").lower()
    update: dict = {"status": state_lower or "success", "updated_at": _utcnow()}
    if state_lower in TERMINAL_DAG_STATES or not state_lower:
        update["finished_at"] = _utcnow()
    if gcs_path:
        update["gcs_path"] = gcs_path
    if error:
        update["error"] = error

    result = await template_jobs.update_one({"dag_run_id": dag_run_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, f"No template job found for dag_run_id={dag_run_id}")
