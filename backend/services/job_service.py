"""Job + pod operations: env_id resolution, pod exec, mongo queries, deploy proxies.

Hits envcore for in-pod execution and app-service for deploy / restart / job metadata.
"""

from __future__ import annotations

import json
import re
import subprocess

import httpx
from fastapi import HTTPException

import config

_client = httpx.AsyncClient(follow_redirects=True)


# Read-only commands allowed in the mongosh terminal
_BLOCKED_MONGOSH_COMMANDS = [
    "drop",
    "delete",
    "remove",
    "insert",
    "update",
    "replace",
    "rename",
    "createIndex",
    "dropIndex",
]


# ---------------------------------------------------------------------------
# Pod helpers (envcore / kubectl fallback)
# ---------------------------------------------------------------------------


async def get_env_id(job_id: str) -> str | None:
    """Resolve env UUID for a job via agent-service. None if not found in this env."""
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
        # API returns job_id itself when no env record exists
        if not pod_id or pod_id == job_id:
            return None
        return pod_id
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            exc.response.status_code, f"Failed to resolve environment for job: {exc.response.text[:300]}"
        )
    except Exception as exc:
        raise HTTPException(502, f"Failed to resolve environment for job: {exc}")


async def get_user_id_for_job(job_id: str, bearer_token: str = "") -> str | None:
    """Look up job owner via agent-service /jobs/v0/{job_id}/. Returns None on any failure."""
    if not config.API_URL:
        return None
    try:
        headers = {"Authorization": f"Bearer {bearer_token}"} if bearer_token else {}
        resp = await _client.get(f"{config.API_URL}/jobs/v0/{job_id}/", headers=headers, timeout=10)
        if resp.status_code in (401, 403, 404):
            return None
        resp.raise_for_status()
        return (resp.json() or {}).get("created_by") or None
    except Exception:
        return None


async def pod_exec(env_id: str, command: str, timeout: int = 30) -> dict:
    """Run `sh -c <command>` in the job's pod via envcore (or kubectl as local fallback)."""
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
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                exc.response.status_code, f"Pod exec failed (is the job running?): {exc.response.text[:300]}"
            )
        except Exception as exc:
            raise HTTPException(502, f"Pod exec failed: {exc}")

    # Local dev fallback
    result = subprocess.run(
        [
            "kubectl",
            "exec",
            "-n",
            "emergent-agents-env",
            "-c",
            "agent-env",
            f"agent-env-{env_id}",
            "--",
            "sh",
            "-c",
            command,
        ],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return {"stdout": result.stdout, "stderr": result.stderr, "return_code": result.returncode}


def _not_found_msg(job_id: str) -> str:
    env_label = config.get_env_config(config.ENV).get("label", config.ENV)
    return (
        f"Job {job_id} was not found in the '{env_label}' environment. "
        "Please check that the Job ID belongs to this environment, or switch to the correct environment."
    )


async def _require_env_id(job_id: str) -> str:
    env_id = await get_env_id(job_id)
    if not env_id:
        raise HTTPException(404, _not_found_msg(job_id))
    return env_id


# ---------------------------------------------------------------------------
# Job info / inspection
# ---------------------------------------------------------------------------


async def get_job_info(*, job_id: str, bearer_token: str) -> dict:
    env_id = await _require_env_id(job_id)
    user_id = await get_user_id_for_job(job_id, bearer_token)

    pod_info: dict = {}
    if config.ENVCORE_URL:
        try:
            resp = await _client.get(
                f"{config.ENVCORE_URL}/api/v1/env/info",
                params={"env_key": env_id},
                timeout=3,
            )
            resp.raise_for_status()
            pod_info = resp.json()
        except Exception as exc:
            pod_info = {"error": str(exc)}

    pod_has_error = "error" in pod_info
    pod_status = pod_info.get("status") or pod_info.get("state")
    running_states = {"RUNNING", "POD_READY", "POD_RUNNING", "READY"}
    if pod_has_error:
        is_running = False
    elif pod_status:
        is_running = pod_status.upper() in running_states
    else:
        # envcore returned info but no explicit status — assume running
        is_running = True

    return {
        "job_id": job_id,
        "env_id": env_id,
        "user_id": user_id,
        "pod_info": pod_info,
        "pod_status": pod_status,
        "is_running": is_running,
        "is_paused": not is_running,
    }


def _parse_db_name(env_output: str) -> tuple[str, str]:
    """Pick DB_NAME from .env contents; fall back to the path segment of MONGO_URL."""
    db_name = "test"
    mongo_url = ""
    for raw_line in env_output.split("\n"):
        line = raw_line.strip()
        if line.upper().startswith("DB_NAME="):
            db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
        elif "MONGO" in line.upper() and "://" in line:
            mongo_url = line
            url_part = line.split("=", 1)[-1].strip().strip('"').strip("'")
            match = re.search(r":\d+/(\w+)", url_part)
            if match and db_name == "test":
                db_name = match.group(1)
    return db_name, mongo_url


def _parse_first_json_array(stdout: str) -> list:
    try:
        return json.loads(stdout)
    except (json.JSONDecodeError, TypeError):
        pass
    for line in stdout.split("\n"):
        line = line.strip()
        if line.startswith("["):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
    return []


async def list_collections(*, job_id: str) -> dict:
    env_id = await _require_env_id(job_id)

    env_result = await pod_exec(
        env_id,
        "grep -E '(MONGO|DB_NAME)' /app/backend/.env 2>/dev/null "
        "|| grep -E '(MONGO|DB_NAME)' /app/.env 2>/dev/null || echo ''",
    )
    db_name, mongo_url = _parse_db_name(env_result.get("stdout", "").strip())

    cmd = f"mongosh --quiet --eval 'JSON.stringify(db.getSiblingDB(\"{db_name}\").getCollectionNames())'"
    result = await pod_exec(env_id, cmd)
    collections = _parse_first_json_array(result.get("stdout", "").strip())

    return {
        "job_id": job_id,
        "db_name": db_name,
        "mongo_url": mongo_url,
        "collections": [{"name": name} for name in collections],
    }


async def delete_collections(*, job_id: str, db_name: str, collections: list[str]) -> dict:
    env_id = await _require_env_id(job_id)
    results = []
    for coll_name in collections:
        safe_name = re.sub(r"[^a-zA-Z0-9_]", "", coll_name)
        if safe_name != coll_name:
            results.append({"collection": coll_name, "status": "skipped", "reason": "invalid name"})
            continue
        cmd = f"mongosh --quiet --eval 'print(db.getSiblingDB(\"{db_name}\").{safe_name}.drop())'"
        result = await pod_exec(env_id, cmd)
        stdout = result.get("stdout", "").strip()
        success = stdout == "true"
        results.append(
            {
                "collection": coll_name,
                "status": "dropped" if success else "failed",
                "output": stdout,
                "error": result.get("stderr", "") or "",
                "return_code": result.get("return_code", -1),
                "db_name": db_name,
            }
        )
    return {"job_id": job_id, "results": results}


async def get_collection_data(*, job_id: str, db_name: str, collection_name: str, limit: int) -> dict:
    env_id = await _require_env_id(job_id)
    safe_name = re.sub(r"[^a-zA-Z0-9_]", "", collection_name)
    if safe_name != collection_name:
        raise HTTPException(400, "Invalid collection name")
    capped = min(limit, 100)

    count_cmd = f"mongosh --quiet --eval 'print(db.getSiblingDB(\"{db_name}\").{safe_name}.countDocuments())'"
    count_result = await pod_exec(env_id, count_cmd)
    count_str = count_result.get("stdout", "0").strip()
    try:
        doc_count = int(count_str.split("\n")[-1])
    except (ValueError, IndexError):
        doc_count = 0

    find_cmd = (
        f"mongosh --quiet --eval 'JSON.stringify("
        f'db.getSiblingDB("{db_name}").{safe_name}.find().limit({capped}).toArray()'
        f")'"
    )
    result = await pod_exec(env_id, find_cmd, timeout=30)
    documents = _parse_first_json_array(result.get("stdout", "").strip())

    return {
        "collection": collection_name,
        "db_name": db_name,
        "count": doc_count,
        "limit": capped,
        "documents": documents,
    }


async def run_mongosh(*, job_id: str, db_name: str, command: str) -> dict:
    env_id = await _require_env_id(job_id)

    cmd_lower = command.lower().strip()
    for blocked in _BLOCKED_MONGOSH_COMMANDS:
        if blocked in cmd_lower:
            return {
                "output": f"Error: '{blocked}' commands are blocked in the terminal. Use the UI controls for destructive operations.",
                "error": True,
            }

    if cmd_lower in ("show dbs", "show databases"):
        js_command = 'db.adminCommand("listDatabases").databases.forEach(d => print(d.name + "  " + (d.sizeOnDisk/1024).toFixed(2) + " KiB"))'
    elif cmd_lower in ("show collections", "show tables"):
        js_command = f'db.getSiblingDB("{db_name}").getCollectionNames().forEach(c => print(c))'
    elif cmd_lower.startswith("use "):
        new_db = cmd_lower[4:].strip()
        js_command = f'print("switched to db {new_db}")'
    elif cmd_lower == "db":
        js_command = f'print("{db_name}")'
    else:
        js_command = f'db = db.getSiblingDB("{db_name}"); {command}'

    full_cmd = f"mongosh --quiet --eval '{js_command}'"
    try:
        result = await pod_exec(env_id, full_cmd, timeout=15)
        stdout = result.get("stdout", "").strip()
        stderr = result.get("stderr", "").strip()
        if stderr and not stdout:
            return {"output": stderr, "error": True}
        return {"output": stdout or "(no output)", "error": False}
    except Exception as exc:
        return {"output": str(exc), "error": True}


async def get_env_variables(*, job_id: str) -> dict:
    env_id = await _require_env_id(job_id)
    result = await pod_exec(
        env_id, "cat /app/backend/.env 2>/dev/null || cat /app/.env 2>/dev/null || echo ''"
    )
    env_vars: dict[str, str] = {}
    for raw_line in result.get("stdout", "").strip().split("\n"):
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key:
            env_vars[key] = value.strip().strip('"').strip("'")
    return {"job_id": job_id, "env_variables": env_vars}


# ---------------------------------------------------------------------------
# Deploy / lifecycle proxies (forward to app-service)
# ---------------------------------------------------------------------------


def _require_api_url() -> None:
    if not config.API_URL:
        raise HTTPException(503, "API_URL not configured for this environment.")


def _auth_headers(bearer_token: str, json_body: bool = False) -> dict:
    h = {}
    if bearer_token:
        h["Authorization"] = f"Bearer {bearer_token}"
    if json_body:
        h["Content-Type"] = "application/json"
    return h


def _raise_auth_or_status(resp, label: str) -> None:
    if resp.status_code in (401, 403):
        raise HTTPException(resp.status_code, "Unauthorized — check your API token.")
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"{label}: {resp.text[:300]}")


async def deploy_app(*, job_id: str, bearer_token: str) -> dict:
    _require_api_url()
    url = f"{config.API_URL}/jobs/v0/deploy"
    try:
        resp = await _client.post(
            url,
            headers=_auth_headers(bearer_token, json_body=True),
            json={"job_id": job_id},
            timeout=60,
        )
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach deploy API: {exc!r}")
    _raise_auth_or_status(resp, "Deploy failed")
    data = resp.json() if resp.content else {}
    return {"job_id": job_id, "run_id": data.get("run_id"), "deploy_url": data.get("deploy_url")}


async def deploy_status(*, job_id: str, bearer_token: str) -> dict:
    _require_api_url()
    url = f"{config.API_URL}/jobs/v0/deploy/{job_id}/latest"
    try:
        resp = await _client.get(url, headers=_auth_headers(bearer_token), timeout=15)
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach deploy status API: {exc!r}")
    if resp.status_code == 404:
        return {"status": "no_deployment", "steps": [], "deploy_url": None}
    _raise_auth_or_status(resp, "Deploy status fetch failed")
    data = resp.json() if resp.content else {}
    latest = data.get("latest_run") or {}
    return {
        "status": latest.get("status"),
        "steps": latest.get("steps") or [],
        "deploy_url": data.get("deploy_url") or latest.get("deploy_url"),
    }


async def deploy_history(*, job_id: str, bearer_token: str) -> dict:
    _require_api_url()
    url = f"{config.API_URL}/jobs/v0/deploy/{job_id}/history"
    try:
        resp = await _client.get(url, headers=_auth_headers(bearer_token), timeout=15)
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach deploy history API: {exc!r}")
    if resp.status_code == 404:
        return {"deployments": []}
    _raise_auth_or_status(resp, "Deploy history fetch failed")
    data = resp.json() if resp.content else {}
    if isinstance(data, list):
        return {"deployments": data, "deployed_run_id": None}
    return {
        "deployments": data.get("runs") or data.get("deployments") or data.get("history") or [],
        "deployed_run_id": data.get("deployed_run_id"),
    }


async def restart_job(*, job_id: str, bearer_token: str) -> dict:
    _require_api_url()
    url = f"{config.API_URL}/jobs/v0/{job_id}/restart-environment"
    try:
        resp = await _client.post(url, headers=_auth_headers(bearer_token), timeout=180)
    except httpx.ReadTimeout:
        return {
            "job_id": job_id,
            "status": "accepted",
            "message": "Restart initiated; awaiting pod readiness.",
        }
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach restart API: {exc!r}")
    _raise_auth_or_status(resp, "Restart failed")
    data = resp.json() if resp.content else {}
    return {"job_id": job_id, "status": data.get("status", "ok"), "message": data.get("message", "")}


async def pause_job(*, job_id: str) -> dict:
    try:
        resp = await _client.post(
            f"{config.PAUSE_URL}/v0/pause-environment/{job_id}",
            timeout=120,
        )
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach pause API: {exc}")
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Pause failed: {resp.text}")
    data = resp.json() if resp.content else {}
    return {
        "job_id": job_id,
        "status": data.get("status", "success"),
        "message": data.get("message", str(resp.text)[:200]),
    }
