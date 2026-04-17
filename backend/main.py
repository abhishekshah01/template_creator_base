"""Template Creator API — Backend for template creation automation.

Run: cd backend && uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import json
import re
import subprocess

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config

# Async HTTP client — does NOT block the event loop
_client = httpx.AsyncClient(follow_redirects=True)

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


@app.post("/api/create-template")
async def create_template(req: CreateTemplateRequest):
    """Run the template creation script on the dev VM via `gcloud compute ssh`.

    Relies on the caller's local gcloud auth (`gcloud auth login`).
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

    gcloud_cmd = [
        "gcloud", "compute", "ssh", config.VM_HOST,
        f"--zone={config.VM_ZONE}",
        "--command", script_command,
    ]

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
        raise HTTPException(500, "gcloud CLI not found. Install Google Cloud SDK and run `gcloud auth login`.")


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
        raise HTTPException(resp.status_code, f"Failed to fetch configs: {resp.text[:500]}")

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
