"""Template Creator API — Backend for template creation automation.

Run: cd backend && uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import json
import re
import subprocess
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

import config

# Async HTTP client — does NOT block the event loop
_client = httpx.AsyncClient(follow_redirects=True)

# MongoDB (for template-job status persistence)
_mongo = AsyncIOMotorClient(config.MONGO_URL)
_db = _mongo[config.DB_NAME]
template_jobs = _db["template_jobs"]

app = FastAPI(title="template-automation-v0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class JobRequest(BaseModel):
    job_id: str
    bearer_token: str = ""

class DeleteCollectionsRequest(BaseModel):
    job_id: str
    db_name: str
    collections: list[str]

class CreateTemplateRequest(BaseModel):
    job_id: str
    user_id: str
    template_name: str

class TemplateJobCallback(BaseModel):
    """Body Composer POSTs when a DAG run finishes (webhook mode).

    Field names follow the conventional Airflow callback payload; backend is
    tolerant to extra keys.
    """
    state: str = ""           # "success" | "failed" | other Airflow states
    dag_run_id: str = ""
    gcs_path: str = ""
    error: str = ""

class EnvVarsRequest(BaseModel):
    job_id: str

class CollectionDataRequest(BaseModel):
    job_id: str
    db_name: str
    collection_name: str
    limit: int = 20

class MongoshRequest(BaseModel):
    job_id: str
    db_name: str
    command: str

class CategoryConfigRequest(BaseModel):
    template_name: str
    config: dict = {}
    default_env_config: dict
    summary_source_job_id: str
    internal: bool = True
    public: bool = False
    bearer_token: str

class TemplateSummaryRequest(BaseModel):
    template_name: str
    bearer_token: str

class BearerTokenRequest(BaseModel):
    bearer_token: str

class GetCategoryConfigRequest(BaseModel):
    config_id: str
    bearer_token: str

class UpdateCategoryConfigRequest(BaseModel):
    config_id: str
    template_name: str
    config: dict = {}
    default_env_config: dict
    summary_source_job_id: str = ""
    internal: bool = True
    public: bool = False
    bearer_token: str

class SwitchEnvironmentRequest(BaseModel):
    env_name: str


# ---------------------------------------------------------------------------
# Helpers — Pod Exec (reuses envcore pattern from mono/mcp/tools/pods.py)
# ---------------------------------------------------------------------------

async def _get_env_id(job_id: str) -> str | None:
    """Look up environment UUID for a job via agent-service API.
    Returns env_id if found, None if job doesn't exist in this environment."""
    if not config.API_URL:
        raise HTTPException(503, "API_URL not configured for this environment.")
    try:
        resp = await _client.get(
            f"{config.API_URL}/internal/verify-ownership",
            params={"job_id": job_id, "user_id": "_"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        pod_id = data.get("pod_id")
        if not pod_id:
            return None
        # If pod_id == job_id, the job was not found in this environment's DB
        # (the API falls back to returning job_id when no environment record exists)
        if pod_id == job_id:
            return None
        return pod_id
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, f"Failed to resolve environment for job: {e.response.text[:300]}")
    except Exception as e:
        raise HTTPException(502, f"Failed to resolve environment for job: {e}")  


async def _get_user_id_for_job(job_id: str, bearer_token: str = "") -> str | None:
    """Look up the owner user_id for a job via agent-service API."""
    if not config.API_URL:
        return None
    try:
        headers = {}
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"
        url = f"{config.API_URL}/jobs/v0/{job_id}/"
        print(f"[get-user] GET {url} | token={'yes ('+str(len(bearer_token))+'chars)' if bearer_token else 'NO TOKEN'}")
        resp = await _client.get(
            url,
            headers=headers,
            timeout=10,
        )
        print(f"[get-user] Response: {resp.status_code} | body: {resp.text[:200]}")
        if resp.status_code in (401, 403, 404):
            return None
        resp.raise_for_status()
        data = resp.json()
        return data.get("created_by") or None
    except Exception:
        return None


async def _pod_exec(env_id: str, command: str, timeout: int = 30) -> dict:
    """Execute a command in a job's pod via envcore."""
    if config.ENVCORE_URL:
        try:
            resp = await _client.post(
                f"{config.ENVCORE_URL}/api/v1/env/run-command",
                json={
                    "commands": ["sh", "-c", command],
                    "env": {"env_key": env_id},
                    "timeout": timeout,
                },
                timeout=min(timeout + 5, 30),
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
    return {"status": "ok", "service": "template-automation-v0"}


@app.get("/api/environments")
def list_environments():
    """List available environments and the active one."""
    envs = []
    # Standard environments
    for name, cfg in config.STANDARD_ENVS.items():
        envs.append({"name": name, "label": cfg["label"], "type": "standard"})
    return {
        "deployment_scope": config.DEPLOYMENT_SCOPE,
        "ephemeral_enabled": config.EPHEMERAL_ENABLED,
        "active": config.ENV,
        "environments": envs,
        "active_config": {
            "env": config.ENV,
            "label": config.get_env_config(config.ENV).get("label", config.ENV),
            "type": config.get_env_config(config.ENV).get("type", "ephemeral"),
            "api_url": config.API_URL,
            "envcore_url": config.ENVCORE_URL,
            "pause_url": config.PAUSE_URL,
            "db_dsn": (config.DB_DSN.split("password=")[0] + "password=***") if config.DB_DSN else "",
            "source_bucket": config.SOURCE_BUCKET,
            "dest_bucket": config.DEST_BUCKET,
        },
    }


@app.post("/api/switch-environment")
def switch_environment(req: SwitchEnvironmentRequest):
    """Switch the active environment. Reconfigures all URLs."""
    env_name = req.env_name.strip()
    if not env_name:
        raise HTTPException(400, "Environment name is required")

    if not config.is_env_allowed(env_name):
        raise HTTPException(
            403,
            f"Environment '{env_name}' is not available in the '{config.DEPLOYMENT_SCOPE}' deployment scope.",
        )

    cfg = config.get_env_config(env_name)

    # Update the module-level config
    config.ENV = env_name
    config.API_URL = cfg["api_url"]
    config.ENVCORE_URL = cfg["envcore_url"]
    config.PAUSE_URL = cfg["pause_url"]
    config.DB_DSN = cfg["db_dsn"]

    # Update the CATEGORY_CONFIG_URL which depends on API_URL
    global CATEGORY_CONFIG_URL
    CATEGORY_CONFIG_URL = f"{config.API_URL}/internal/category-config"

    # Update TEMPLATE_SUMMARY_URL
    global TEMPLATE_SUMMARY_URL
    TEMPLATE_SUMMARY_URL = f"{config.API_URL}/internal/category-config/template-app-summary"

    return {
        "status": "success",
        "env": env_name,
        "label": cfg.get("label", env_name),
        "config": {
            "api_url": config.API_URL,
            "envcore_url": config.ENVCORE_URL,
            "pause_url": config.PAUSE_URL,
        },
    }


@app.post("/api/job-info")
async def get_job_info(req: JobRequest):
    """Get job info including user_id and environment status."""
    env_id = await _get_env_id(req.job_id)
    if not env_id:
        env_label = config.get_env_config(config.ENV).get("label", config.ENV)
        raise HTTPException(404, f"Job {req.job_id} was not found in the '{env_label}' environment. Please check that the Job ID belongs to this environment, or switch to the correct environment.")

    user_id = await _get_user_id_for_job(req.job_id, req.bearer_token)

    # Check pod lifecycle status from DB (not available in this deployment)
    pod_status = None

    # Check pod info via envcore
    pod_info = {}
    if config.ENVCORE_URL:
        try:
            resp = await _client.get(
                f"{config.ENVCORE_URL}/api/v1/env/info",
                params={"env_key": env_id},
                timeout=3,
            )
            resp.raise_for_status()
            pod_info = resp.json()
        except Exception as e:
            pod_info = {"error": str(e)}

    # Determine if job is running
    pod_has_error = "error" in pod_info
    is_running = pod_status in ("RUNNING", "POD_READY", "POD_RUNNING") and not pod_has_error
    # If pod_status is None but envcore returned no error, assume running
    if pod_status is None and not pod_has_error:
        is_running = True
    is_paused = not is_running

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
    env_id = await _get_env_id(req.job_id)
    if not env_id:
        env_label = config.get_env_config(config.ENV).get("label", config.ENV)
        raise HTTPException(404, f"Job {req.job_id} was not found in the '{env_label}' environment. Please check that the Job ID belongs to this environment, or switch to the correct environment.")

    # Step 1: Get MONGO_URL and DB_NAME from .env
    env_result = await _pod_exec(env_id, "grep -E '(MONGO|DB_NAME)' /app/backend/.env 2>/dev/null || grep -E '(MONGO|DB_NAME)' /app/.env 2>/dev/null || echo ''")
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
    result = await _pod_exec(env_id, cmd)
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
    env_id = await _get_env_id(req.job_id)
    if not env_id:
        env_label = config.get_env_config(config.ENV).get("label", config.ENV)
        raise HTTPException(404, f"Job {req.job_id} was not found in the '{env_label}' environment. Please check that the Job ID belongs to this environment, or switch to the correct environment.")

    results = []
    for coll_name in req.collections:
        # Sanitize collection name to prevent injection
        safe_name = re.sub(r"[^a-zA-Z0-9_]", "", coll_name)
        if safe_name != coll_name:
            results.append({"collection": coll_name, "status": "skipped", "reason": "invalid name"})
            continue

        cmd = f"mongosh --quiet --eval 'print(db.getSiblingDB(\"{req.db_name}\").{safe_name}.drop())'"
        result = await _pod_exec(env_id, cmd)
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


@app.post("/api/collection-data")
async def get_collection_data(req: CollectionDataRequest):
    """Fetch documents from a MongoDB collection in a job's pod."""
    env_id = await _get_env_id(req.job_id)
    if not env_id:
        env_label = config.get_env_config(config.ENV).get("label", config.ENV)
        raise HTTPException(404, f"Job {req.job_id} was not found in the '{env_label}' environment. Please check that the Job ID belongs to this environment, or switch to the correct environment.")

    # Sanitize collection name
    safe_name = re.sub(r"[^a-zA-Z0-9_]", "", req.collection_name)
    if safe_name != req.collection_name:
        raise HTTPException(400, "Invalid collection name")

    limit = min(req.limit, 100)  # Cap at 100 docs

    # Get document count
    count_cmd = f"mongosh --quiet --eval 'print(db.getSiblingDB(\"{req.db_name}\").{safe_name}.countDocuments())'"
    count_result = await _pod_exec(env_id, count_cmd)
    count_str = count_result.get("stdout", "0").strip()
    try:
        doc_count = int(count_str.split("\n")[-1])
    except (ValueError, IndexError):
        doc_count = 0

    # Get documents
    find_cmd = f"mongosh --quiet --eval 'JSON.stringify(db.getSiblingDB(\"{req.db_name}\").{safe_name}.find().limit({limit}).toArray())'"
    result = await _pod_exec(env_id, find_cmd, timeout=30)
    stdout = result.get("stdout", "").strip()

    documents = []
    try:
        documents = json.loads(stdout)
    except (json.JSONDecodeError, TypeError):
        for line in stdout.split("\n"):
            line = line.strip()
            if line.startswith("["):
                try:
                    documents = json.loads(line)
                    break
                except json.JSONDecodeError:
                    continue

    return {
        "collection": req.collection_name,
        "db_name": req.db_name,
        "count": doc_count,
        "limit": limit,
        "documents": documents,
    }


# Read-only commands allowed in the mongosh terminal
_BLOCKED_COMMANDS = ["drop", "delete", "remove", "insert", "update", "replace", "rename", "createIndex", "dropIndex"]


@app.post("/api/mongosh")
async def run_mongosh(req: MongoshRequest):
    """Run a read-only mongosh command in a job's pod."""
    env_id = await _get_env_id(req.job_id)
    if not env_id:
        env_label = config.get_env_config(config.ENV).get("label", config.ENV)
        raise HTTPException(404, f"Job {req.job_id} was not found in the '{env_label}' environment. Please check that the Job ID belongs to this environment, or switch to the correct environment.")

    # Block destructive commands
    cmd_lower = req.command.lower().strip()
    for blocked in _BLOCKED_COMMANDS:
        if blocked.lower() in cmd_lower:
            return {"output": f"Error: '{blocked}' commands are blocked in the terminal. Use the UI controls for destructive operations.", "error": True}

    # Translate mongosh REPL commands to JavaScript equivalents
    js_command = req.command.strip()
    if cmd_lower == 'show dbs' or cmd_lower == 'show databases':
        js_command = 'db.adminCommand("listDatabases").databases.forEach(d => print(d.name + "  " + (d.sizeOnDisk/1024).toFixed(2) + " KiB"))'
    elif cmd_lower == 'show collections' or cmd_lower == 'show tables':
        js_command = f'db.getSiblingDB("{req.db_name}").getCollectionNames().forEach(c => print(c))'
    elif cmd_lower.startswith('use '):
        new_db = cmd_lower[4:].strip()
        js_command = f'print("switched to db {new_db}")'
    elif cmd_lower == 'db':
        js_command = f'print("{req.db_name}")'
    else:
        # Direct JS — prefix with db switch
        js_command = f'db = db.getSiblingDB("{req.db_name}"); {req.command}'

    full_cmd = f'mongosh --quiet --eval \'{js_command}\''
    try:
        result = await _pod_exec(env_id, full_cmd, timeout=15)
        stdout = result.get("stdout", "").strip()
        stderr = result.get("stderr", "").strip()
        if stderr and not stdout:
            return {"output": stderr, "error": True}
        return {"output": stdout or "(no output)", "error": False}
    except Exception as e:
        return {"output": str(e), "error": True}


@app.post("/api/deploy-app")
async def deploy_app(req: JobRequest):
    """Trigger an emergent deployment for a job."""
    if not config.API_URL:
        raise HTTPException(503, "API_URL not configured for this environment.")

    headers = {"Content-Type": "application/json"}
    if req.bearer_token:
        headers["Authorization"] = f"Bearer {req.bearer_token}"

    url = f"{config.API_URL}/jobs/v0/deploy"
    try:
        resp = await _client.post(url, headers=headers, json={"job_id": req.job_id}, timeout=60)
    except Exception as e:
        raise HTTPException(502, f"Failed to reach deploy API: {repr(e)}")

    if resp.status_code in (401, 403):
        raise HTTPException(resp.status_code, "Unauthorized — check your API token.")
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Deploy failed: {resp.text[:300]}")

    try:
        data = resp.json()
    except Exception:
        data = {"message": resp.text}

    return {
        "job_id": req.job_id,
        "run_id": data.get("run_id"),
        "deploy_url": data.get("deploy_url"),
    }


@app.post("/api/deploy-status")
async def deploy_status(req: JobRequest):
    """Poll latest deployment status for a job (per-phase steps)."""
    if not config.API_URL:
        raise HTTPException(503, "API_URL not configured for this environment.")

    headers = {}
    if req.bearer_token:
        headers["Authorization"] = f"Bearer {req.bearer_token}"

    url = f"{config.API_URL}/jobs/v0/deploy/{req.job_id}/latest"
    try:
        resp = await _client.get(url, headers=headers, timeout=15)
    except Exception as e:
        raise HTTPException(502, f"Failed to reach deploy status API: {repr(e)}")

    if resp.status_code in (401, 403):
        raise HTTPException(resp.status_code, "Unauthorized — check your API token.")
    if resp.status_code == 404:
        return {"status": "no_deployment", "steps": [], "deploy_url": None}
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Deploy status fetch failed: {resp.text[:300]}")

    try:
        data = resp.json()
    except Exception:
        data = {}

    latest = data.get("latest_run") or {}
    return {
        "status": latest.get("status"),
        "steps": latest.get("steps") or [],
        "deploy_url": data.get("deploy_url") or latest.get("deploy_url"),
    }


@app.post("/api/deploy-history")
async def deploy_history(req: JobRequest):
    """Fetch past deployments for a job (for the right-panel history list)."""
    if not config.API_URL:
        raise HTTPException(503, "API_URL not configured for this environment.")

    headers = {}
    if req.bearer_token:
        headers["Authorization"] = f"Bearer {req.bearer_token}"

    url = f"{config.API_URL}/jobs/v0/deploy/{req.job_id}/history"
    try:
        resp = await _client.get(url, headers=headers, timeout=15)
    except Exception as e:
        raise HTTPException(502, f"Failed to reach deploy history API: {repr(e)}")

    if resp.status_code in (401, 403):
        raise HTTPException(resp.status_code, "Unauthorized — check your API token.")
    if resp.status_code == 404:
        return {"deployments": []}
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Deploy history fetch failed: {resp.text[:300]}")

    try:
        data = resp.json()
    except Exception:
        data = {}

    if isinstance(data, list):
        deployments = data
        deployed_run_id = None
    else:
        deployments = data.get("runs") or data.get("deployments") or data.get("history") or []
        deployed_run_id = data.get("deployed_run_id")
    return {"deployments": deployments, "deployed_run_id": deployed_run_id}


@app.post("/api/restart-job")
async def restart_job(req: JobRequest):
    """Wake a paused job environment via app-service restart-environment."""
    if not config.API_URL:
        raise HTTPException(503, "API_URL not configured for this environment.")

    headers = {}
    if req.bearer_token:
        headers["Authorization"] = f"Bearer {req.bearer_token}"

    url = f"{config.API_URL}/jobs/v0/{req.job_id}/restart-environment"
    try:
        resp = await _client.post(url, headers=headers, timeout=180)
    except httpx.ReadTimeout:
        # Restart kicked off server-side but our connection idled out.
        # Frontend will poll for pod readiness, so treat as accepted.
        return {"job_id": req.job_id, "status": "accepted", "message": "Restart initiated; awaiting pod readiness."}
    except Exception as e:
        raise HTTPException(502, f"Failed to reach restart API: {repr(e)}")

    if resp.status_code in (401, 403):
        raise HTTPException(resp.status_code, "Unauthorized — check your API token.")
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Restart failed: {resp.text[:300]}")

    try:
        data = resp.json()
    except Exception:
        data = {"message": resp.text}

    return {
        "job_id": req.job_id,
        "status": data.get("status", "ok"),
        "message": data.get("message", ""),
    }


@app.post("/api/pause-job")
async def pause_job(req: JobRequest):
    """Pause a job to trigger restic backup."""
    internal_url = f"{config.PAUSE_URL}/v0/pause-environment/{req.job_id}"

    try:
        resp = await _client.post(internal_url, timeout=120)
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


# ---------------------------------------------------------------------------
# Template creation — async via Composer DAG
# ---------------------------------------------------------------------------
# Sync gcloud-SSH flow was replaced with a Cloud Composer DAG trigger.
# Backend writes status to MongoDB; frontend polls GET /api/template-job/{id}.
#
# Notify modes (config.TEMPLATE_JOB_NOTIFY_MODE):
#   poll    – backend polls Composer dagRuns endpoint (default, works locally)
#   webhook – Composer POSTs to /api/template-job/{id}/callback (needs public URL)
#   both    – send webhook_url + poll as fallback
# Switching modes is a .env change only — handler / status / callback wiring
# is identical across modes.

TERMINAL_DAG_STATES = {"success", "failed"}
POLL_INTERVAL_S = 5
POLL_MAX_DURATION_S = 30 * 60  # 30 min hard ceiling


def _utcnow():
    return datetime.now(timezone.utc)


def _build_status_url(dag_run_id: str) -> str:
    return f"{config.COMPOSER_DAG_TRIGGER_URL.rstrip('/')}/{dag_run_id}"


# OIDC token cache. Tokens are ~1h valid; refresh proactively at 50min.
_OIDC_CACHE = {"token": "", "expires_at": 0.0}
_OIDC_CACHE_TTL = 50 * 60
_oidc_lock = asyncio.Lock()


async def _get_oidc_token() -> str:
    """Mint a Google OIDC token via `gcloud auth print-identity-token`.

    Cached to avoid spawning gcloud on every poll tick. Swap to
    `google.oauth2.id_token.fetch_id_token(Request(), audience=...)` once
    a service account is available.
    """
    now = asyncio.get_event_loop().time()
    if _OIDC_CACHE["token"] and _OIDC_CACHE["expires_at"] > now:
        return _OIDC_CACHE["token"]

    async with _oidc_lock:
        now = asyncio.get_event_loop().time()
        if _OIDC_CACHE["token"] and _OIDC_CACHE["expires_at"] > now:
            return _OIDC_CACHE["token"]

        cmd = ["gcloud", "auth", "print-identity-token"]
        if config.OIDC_AUDIENCE:
            cmd.append(f"--audiences={config.OIDC_AUDIENCE}")
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
        except FileNotFoundError:
            raise HTTPException(500, "gcloud CLI not found. Install Google Cloud SDK and run `gcloud auth login`.")

        if proc.returncode != 0:
            raise HTTPException(
                500,
                f"Failed to mint OIDC token via gcloud: {stderr.decode()[:300]}. "
                "Run `gcloud auth login` and retry.",
            )
        token = stdout.decode().strip()
        if not token:
            raise HTTPException(500, "gcloud returned empty OIDC token")

        _OIDC_CACHE["token"] = token
        _OIDC_CACHE["expires_at"] = now + _OIDC_CACHE_TTL
        return token


async def _poll_dag_run(dag_run_id: str):
    """Poll Composer for a DAG run until terminal state, updating Mongo each tick.

    Runs as a FastAPI BackgroundTask. Survives transient network/5xx errors;
    bails after POLL_MAX_DURATION_S without a terminal state.
    """
    status_url = _build_status_url(dag_run_id)
    deadline = asyncio.get_event_loop().time() + POLL_MAX_DURATION_S

    while True:
        if asyncio.get_event_loop().time() > deadline:
            await template_jobs.update_one(
                {"dag_run_id": dag_run_id},
                {"$set": {
                    "status": "timeout",
                    "error": f"Polling exceeded {POLL_MAX_DURATION_S}s without terminal state",
                    "updated_at": _utcnow(),
                    "finished_at": _utcnow(),
                }},
            )
            return

        await asyncio.sleep(POLL_INTERVAL_S)

        try:
            token = await _get_oidc_token()
            resp = await _client.get(
                status_url,
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
        except Exception as e:
            print(f"[poll {dag_run_id}] transient error: {e}")
            continue

        if resp.status_code >= 400:
            print(f"[poll {dag_run_id}] {resp.status_code}: {resp.text[:200]}")
            if resp.status_code in (401, 403):
                _OIDC_CACHE["token"] = ""
                await template_jobs.update_one(
                    {"dag_run_id": dag_run_id},
                    {"$set": {
                        "status": "failed",
                        "error": "OIDC token rejected by Composer while polling DAG status",
                        "updated_at": _utcnow(),
                        "finished_at": _utcnow(),
                    }},
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
                # the canonical destination. Webhook mode overrides this with
                # the real gcs_path from the DAG's callback payload.
                doc = await template_jobs.find_one({"dag_run_id": dag_run_id})
                if doc and not doc.get("gcs_path"):
                    update["gcs_path"] = f"gs://{config.DEST_BUCKET}/{doc.get('template_name', '')}"

        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": update},
        )

        if state in TERMINAL_DAG_STATES:
            return


@app.post("/api/create-template")
async def create_template(req: CreateTemplateRequest, background_tasks: BackgroundTasks):
    """Trigger the template_publish Composer DAG.

    Returns immediately with a record containing dag_run_id + status="queued".
    Frontend polls GET /api/template-job/{dag_run_id} until status is terminal.
    """
    if not re.match(r"^[a-zA-Z0-9_-]+$", req.template_name):
        raise HTTPException(400, "Template name must be alphanumeric with hyphens/underscores only")
    if not config.COMPOSER_DAG_TRIGGER_URL:
        raise HTTPException(
            503,
            "Template creation is not available in this environment. "
            "The Composer DAG trigger is only configured for dev / ephemeral deployments.",
        )

    oidc_token = await _get_oidc_token()

    # Client-generated dag_run_id so we can write the Mongo record before
    # triggering — avoids a race where a webhook arrives before our insert.
    dag_run_id = f"tc-{uuid.uuid4().hex[:12]}"

    webhook_url = ""
    if (
        config.TEMPLATE_JOB_NOTIFY_MODE in ("webhook", "both")
        and config.TEMPLATE_JOB_WEBHOOK_BASE_URL
    ):
        webhook_url = (
            f"{config.TEMPLATE_JOB_WEBHOOK_BASE_URL.rstrip('/')}"
            f"/api/template-job/{dag_run_id}/callback"
        )

    payload = {
        "dag_run_id": dag_run_id,
        "conf": {
            "job_id": req.job_id,
            "user_id": req.user_id,
            "template_name": req.template_name,
            "webhook_url": webhook_url,
            "source_bucket": config.SOURCE_BUCKET,
            "dest_bucket": config.DEST_BUCKET,
        },
    }

    record = {
        "dag_run_id": dag_run_id,
        "job_id": req.job_id,
        "user_id": req.user_id,
        "template_name": req.template_name,
        "status": "queued",
        "gcs_path": "",
        "error": "",
        "started_at": _utcnow(),
        "updated_at": _utcnow(),
        "finished_at": None,
    }
    await template_jobs.insert_one(record)

    try:
        resp = await _client.post(
            config.COMPOSER_DAG_TRIGGER_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {oidc_token}",
            },
            timeout=30,
        )
    except Exception as e:
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"status": "failed", "error": str(e), "finished_at": _utcnow()}},
        )
        raise HTTPException(502, f"Failed to reach Composer: {e}")

    if resp.status_code >= 400:
        body = resp.text[:500]
        await template_jobs.update_one(
            {"dag_run_id": dag_run_id},
            {"$set": {"status": "failed", "error": body, "finished_at": _utcnow()}},
        )
        raise HTTPException(resp.status_code, f"Composer rejected the DAG trigger: {body}")

    # If Composer returned a different dag_run_id (e.g. version ignored ours),
    # update the record and use it for polling.
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


@app.get("/api/template-job/{dag_run_id}")
async def get_template_job(dag_run_id: str):
    """Return current status of a template-creation DAG run (frontend polls this)."""
    doc = await template_jobs.find_one({"dag_run_id": dag_run_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, f"No template job found for dag_run_id={dag_run_id}")
    return doc


@app.post("/api/template-job/{dag_run_id}/callback")
async def template_job_callback(dag_run_id: str, body: TemplateJobCallback):
    """Webhook target Composer POSTs to when the DAG finishes.

    Endpoint is wired now but only USED when TEMPLATE_JOB_NOTIFY_MODE includes
    "webhook" + TEMPLATE_JOB_WEBHOOK_BASE_URL is set. Switching from poll to
    webhook is a .env change — no code changes here.
    """
    state = (body.state or "").lower()
    update = {"status": state or "success", "updated_at": _utcnow()}
    if state in TERMINAL_DAG_STATES or not state:
        update["finished_at"] = _utcnow()
    if body.gcs_path:
        update["gcs_path"] = body.gcs_path
    if body.error:
        update["error"] = body.error

    result = await template_jobs.update_one(
        {"dag_run_id": dag_run_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(404, f"No template job found for dag_run_id={dag_run_id}")
    return {"status": "ok"}


@app.post("/api/env-variables")
async def get_env_variables(req: EnvVarsRequest):
    """Fetch environment variables from a job's pod .env file."""
    env_id = await _get_env_id(req.job_id)
    if not env_id:
        env_label = config.get_env_config(config.ENV).get("label", config.ENV)
        raise HTTPException(404, f"Job {req.job_id} was not found in the '{env_label}' environment. Please check that the Job ID belongs to this environment, or switch to the correct environment.")

    # Read .env file from the pod
    cmd = "cat /app/backend/.env 2>/dev/null || cat /app/.env 2>/dev/null || echo ''"
    result = await _pod_exec(env_id, cmd)
    stdout = result.get("stdout", "").strip()

    env_vars = {}
    for line in stdout.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                env_vars[key] = value

    return {
        "job_id": req.job_id,
        "env_variables": env_vars,
    }


CATEGORY_CONFIG_URL = f"{config.API_URL}/internal/category-config"


@app.post("/api/list-category-configs")
async def list_category_configs(req: BearerTokenRequest):
    """List all category configs via the agent service API."""
    url = CATEGORY_CONFIG_URL
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {req.bearer_token}",
    }
    try:
        resp = await _client.get(
            url,
            headers=headers,
            timeout=10,
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to reach category config API: {e}")

    print(f"[list-configs] GET {url} -> {resp.status_code} (final url: {resp.url})")
    print(f"[list-configs] Token (first 20 chars): {req.bearer_token[:20]}...")
    print(f"[list-configs] Response body (first 500 chars): {resp.text[:500]}")
    print(f"[list-configs] Response type: {type(resp.json()) if resp.status_code < 400 else 'error'}")

    if resp.status_code >= 400:
        # Sanitize HTML error pages from upstream services
        body = resp.text[:500]
        if "<html" in body.lower():
            raise HTTPException(resp.status_code, f"Upstream service returned {resp.status_code}. The environment may not have this endpoint available.")
        raise HTTPException(resp.status_code, f"Failed to fetch configs: {body}")

    try:
        data = resp.json()
    except Exception:
        data = []

    # Handle both plain array and wrapped responses like {"configs": [...]}
    if isinstance(data, dict):
        for key in ("configs", "data", "results", "items", "category_configs"):
            if key in data and isinstance(data[key], list):
                return data[key]
        if "template_name" in data:
            return [data]
        return data

    return data


@app.post("/api/category-config")
async def create_category_config(req: CategoryConfigRequest):
    """Create a category config entry via the agent service API."""
    payload = {
        "template_name": req.template_name,
        "config": req.config,
        "default_env_config": req.default_env_config,
        "summary_source_job_id": req.summary_source_job_id,
        "internal": req.internal,
        "public": req.public,
    }

    try:
        resp = await _client.post(
            CATEGORY_CONFIG_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {req.bearer_token}",
            },
            timeout=30,
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to reach category config API: {e}")

    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Category config creation failed: {resp.text[:500]}")

    try:
        data = resp.json()
    except Exception:
        data = {"message": resp.text}

    return {
        "status": "success",
        "response": data,
    }


TEMPLATE_SUMMARY_URL = f"{config.API_URL}/internal/category-config/template-app-summary"


@app.post("/api/template-summary")
async def generate_template_summary(req: TemplateSummaryRequest):
    """Generate a template app summary via the agent service API."""
    try:
        resp = await _client.post(
            TEMPLATE_SUMMARY_URL,
            json={"template_name": req.template_name},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {req.bearer_token}",
            },
            timeout=120,
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to reach template summary API: {e}")

    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Template summary generation failed: {resp.text[:500]}")

    try:
        data = resp.json()
    except Exception:
        data = {"message": resp.text}

    return {
        "status": "success",
        "response": data,
    }


@app.post("/api/get-category-config")
async def get_category_config(req: GetCategoryConfigRequest):
    """Fetch a single category config by ID."""
    try:
        resp = await _client.get(
            f"{CATEGORY_CONFIG_URL}/{req.config_id}",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {req.bearer_token}",
            },
            timeout=10,
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to reach category config API: {e}")

    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Config not found: {resp.text[:500]}")

    return resp.json()


@app.post("/api/update-category-config")
async def update_category_config(req: UpdateCategoryConfigRequest):
    """Update an existing category config."""
    payload = {
        "template_name": req.template_name,
        "config": req.config,
        "default_env_config": req.default_env_config,
        "summary_source_job_id": req.summary_source_job_id,
        "internal": req.internal,
        "public": req.public,
    }

    try:
        resp = await _client.put(
            f"{CATEGORY_CONFIG_URL}/{req.config_id}",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {req.bearer_token}",
            },
            timeout=30,
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to reach category config API: {e}")

    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Update failed: {resp.text[:500]}")

    try:
        data = resp.json()
    except Exception:
        data = {"message": resp.text}

    return {"status": "success", "response": data}
