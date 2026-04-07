"""Template Creator API — Backend for template creation automation.

Run: cd backend && uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import json
import os
import re
import subprocess

import httpx
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config

app = FastAPI(title="Template Creator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class JobRequest(BaseModel):
    job_id: str

class DeleteCollectionsRequest(BaseModel):
    job_id: str
    db_name: str
    collections: list[str]

class CreateTemplateRequest(BaseModel):
    job_id: str
    user_id: str
    template_name: str


# ---------------------------------------------------------------------------
# Helpers — Pod Exec (reuses envcore pattern from mono/mcp/tools/pods.py)
# ---------------------------------------------------------------------------

def _get_env_id(job_id: str) -> str | None:
    """Look up environment UUID for a job from the DB."""
    if not config.DB_DSN:
        raise HTTPException(500, "DB_DSN not configured")
    conn = psycopg2.connect(config.DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM environments WHERE entity_id = %s ORDER BY created_at DESC LIMIT 1",
                (job_id,),
            )
            row = cur.fetchone()
            return str(row[0]) if row else None
    finally:
        conn.close()


def _get_user_id_for_job(job_id: str) -> str | None:
    """Look up the owner user_id for a job from the DB."""
    if not config.DB_DSN:
        return None
    conn = psycopg2.connect(config.DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT created_by FROM jobs WHERE id = %s", (job_id,))
            row = cur.fetchone()
            return str(row[0]) if row else None
    finally:
        conn.close()


def _pod_exec(env_id: str, command: str, timeout: int = 30) -> dict:
    """Execute a command in a job's pod via envcore."""
    if config.ENVCORE_URL:
        try:
            resp = httpx.post(
                f"{config.ENVCORE_URL}/api/v1/env/run-command",
                json={
                    "commands": ["sh", "-c", command],
                    "env": {"env_key": env_id},
                    "timeout": timeout,
                },
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(e.response.status_code, f"Pod exec failed (is the job running?): {e.response.text[:300]}")
        except Exception as e:
            raise HTTPException(502, f"Pod exec failed: {e}")
    else:
        # Fallback: kubectl exec (local dev)
        pod_name = f"agent-env-{env_id}"
        namespace = "emergent-agents-env"
        result = subprocess.run(
            ["kubectl", "exec", "-n", namespace, "-c", "agent-env", pod_name, "--", "sh", "-c", command],
            capture_output=True, text=True, timeout=timeout,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode,
        }


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def health():
    return {"status": "ok", "service": "template-creator-api"}


@app.post("/api/job-info")
async def get_job_info(req: JobRequest):
    """Get job info including user_id and environment status."""
    env_id = _get_env_id(req.job_id)
    if not env_id:
        raise HTTPException(404, f"No environment found for job {req.job_id}")

    user_id = _get_user_id_for_job(req.job_id)

    # Check pod lifecycle status from DB
    pod_status = None
    if config.DB_DSN:
        conn = psycopg2.connect(config.DB_DSN)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT pod_lifecycle_status FROM environments WHERE id = %s",
                    (env_id,),
                )
                row = cur.fetchone()
                pod_status = row[0] if row else None
        finally:
            conn.close()

    # Check pod info via envcore
    pod_info = {}
    if config.ENVCORE_URL:
        try:
            resp = httpx.get(
                f"{config.ENVCORE_URL}/api/v1/env/info",
                params={"env_key": env_id},
                timeout=10,
            )
            resp.raise_for_status()
            pod_info = resp.json()
        except Exception as e:
            pod_info = {"error": str(e)}

    # Determine if job is running
    is_running = pod_status in ("RUNNING", "POD_READY", None) and "error" not in pod_info
    is_paused = pod_status in ("PVC_BOUND", "SNAPSHOTTING", "TERMINATED")

    return {
        "job_id": req.job_id,
        "env_id": env_id,
        "user_id": user_id,
        "pod_info": pod_info,
        "pod_status": pod_status,
        "is_running": is_running,
        "is_paused": is_paused,
    }


@app.post("/api/collections")
async def list_collections(req: JobRequest):
    """List MongoDB collections in a job's pod."""
    env_id = _get_env_id(req.job_id)
    if not env_id:
        raise HTTPException(404, f"No environment found for job {req.job_id}")

    # Step 1: Get MONGO_URL and DB_NAME from .env
    env_result = _pod_exec(env_id, "grep -E '(MONGO|DB_NAME)' /app/backend/.env 2>/dev/null || grep -E '(MONGO|DB_NAME)' /app/.env 2>/dev/null || echo ''")
    env_output = env_result.get("stdout", "").strip()

    # Parse DB name — check DB_NAME first, then extract from MONGO_URL
    db_name = "test"  # fallback
    mongo_url = ""
    for line in env_output.split("\n"):
        line = line.strip()
        if line.upper().startswith("DB_NAME="):
            db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
        elif "MONGO" in line.upper() and "://" in line:
            mongo_url = line
            url_part = line.split("=", 1)[-1].strip().strip('"').strip("'")
            match = re.search(r":\d+/(\w+)", url_part)
            if match and db_name == "test":
                db_name = match.group(1)

    # Step 2: List collections
    cmd = f"mongosh --quiet --eval 'JSON.stringify(db.getSiblingDB(\"{db_name}\").getCollectionNames())'"
    result = _pod_exec(env_id, cmd)
    stdout = result.get("stdout", "").strip()

    try:
        collections = json.loads(stdout)
    except (json.JSONDecodeError, TypeError):
        # Try fallback — output might have extra lines
        for line in stdout.split("\n"):
            line = line.strip()
            if line.startswith("["):
                try:
                    collections = json.loads(line)
                    break
                except json.JSONDecodeError:
                    continue
        else:
            collections = []

    collection_info = [{"name": name} for name in collections]

    return {
        "job_id": req.job_id,
        "db_name": db_name,
        "mongo_url": mongo_url,
        "collections": collection_info,
    }


@app.post("/api/delete-collections")
async def delete_collections(req: DeleteCollectionsRequest):
    """Drop selected MongoDB collections from a job's pod."""
    env_id = _get_env_id(req.job_id)
    if not env_id:
        raise HTTPException(404, f"No environment found for job {req.job_id}")

    results = []
    for coll_name in req.collections:
        # Sanitize collection name to prevent injection
        safe_name = re.sub(r"[^a-zA-Z0-9_]", "", coll_name)
        if safe_name != coll_name:
            results.append({"collection": coll_name, "status": "skipped", "reason": "invalid name"})
            continue

        cmd = f"mongosh --quiet --eval 'print(db.getSiblingDB(\"{req.db_name}\").{safe_name}.drop())'"
        result = _pod_exec(env_id, cmd)
        stdout = result.get("stdout", "").strip()
        stderr = result.get("stderr", "")
        rc = result.get("return_code", -1)
        success = stdout == "true"

        results.append({
            "collection": coll_name,
            "status": "dropped" if success else "failed",
            "output": stdout,
            "error": stderr if stderr else "",
            "return_code": rc,
            "db_name": req.db_name,
        })

    return {"job_id": req.job_id, "results": results}


@app.post("/api/pause-job")
def pause_job(req: JobRequest):
    """Pause a job to trigger restic backup."""
    internal_url = f"{config.PAUSE_URL}/v0/pause-environment/{req.job_id}"

    try:
        resp = httpx.post(internal_url, timeout=120)
    except Exception as e:
        raise HTTPException(502, f"Failed to reach pause API: {e}")

    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Pause failed: {resp.text}")

    try:
        data = resp.json()
    except Exception:
        data = {"message": resp.text}

    return {
        "job_id": req.job_id,
        "status": data.get("status", "success"),
        "message": data.get("message", str(resp.text)[:200]),
    }


@app.post("/api/create-template")
async def create_template(req: CreateTemplateRequest):
    """Run the template creation script on the dev VM.

    Uses gcloud compute ssh (inherits local gcloud auth) via subprocess.
    For deployed backends, switch to paramiko with SSH key.
    """
    # Sanitize inputs
    if not re.match(r"^[a-zA-Z0-9_-]+$", req.template_name):
        raise HTTPException(400, "Template name must be alphanumeric with hyphens/underscores only")

    script_command = (
        f"sudo docker run --rm --network=host "
        f"-v {config.TEMPLATE_SCRIPT_PATH}:/run_template.sh:ro "
        f"alpine:latest sh -c '"
        f"apk add --no-cache restic git bash curl sed >/dev/null 2>&1 && "
        f"bash /run_template.sh "
        f'--source-repo "gs:{config.SOURCE_BUCKET}:/users/{req.user_id}" '
        f"--template-name {req.template_name} "
        f"--restic-password {config.RESTIC_PASSWORD} "
        f"--job-id {req.job_id} "
        f"--dest-bucket {config.DEST_BUCKET}"
        f"'"
    )

    # Use gcloud compute ssh (works when running locally with gcloud auth)
    gcloud_cmd = [
        "gcloud", "compute", "ssh", config.VM_HOST,
        f"--zone={config.VM_ZONE}",
        "--command", script_command,
    ]

    # If SSH key is configured, use paramiko instead (for deployed backends)
    if config.VM_SSH_KEY and config.VM_USER:
        import paramiko
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(
                hostname=config.VM_HOST,
                username=config.VM_USER,
                key_filename=config.VM_SSH_KEY,
            )
            stdin, stdout, stderr = ssh.exec_command(script_command, timeout=300)
            out = stdout.read().decode()
            err = stderr.read().decode()
            exit_code = stdout.channel.recv_exit_status()
            ssh.close()
        except Exception as e:
            raise HTTPException(500, f"SSH failed: {e}")

        return {
            "status": "success" if exit_code == 0 else "failed",
            "gcs_path": f"gs://{config.DEST_BUCKET}/{req.template_name}",
            "output": out[-2000:],
            "error": err[-1000:] if exit_code != 0 else "",
        }

    # Default: gcloud compute ssh (local backend)
    try:
        result = subprocess.run(
            gcloud_cmd,
            capture_output=True, text=True, timeout=300,
        )
        return {
            "status": "success" if result.returncode == 0 else "failed",
            "gcs_path": f"gs://{config.DEST_BUCKET}/{req.template_name}",
            "output": result.stdout[-2000:],
            "error": result.stderr[-1000:] if result.returncode != 0 else "",
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Template creation timed out (5 min limit)")
    except FileNotFoundError:
        raise HTTPException(500, "gcloud CLI not found. Install Google Cloud SDK or configure SSH key.")
