"""Cloud Composer (Airflow) DAG-trigger client.

Mints + caches a Google OIDC token via the local `gcloud` CLI, then triggers
the configured DAG and polls its run status. The OIDC path is a stepping
stone — swap to `google.oauth2.id_function` + a service account once one is
available.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from fastapi import HTTPException

import config

_client = httpx.AsyncClient(follow_redirects=True)

# Tokens are ~1h valid from Google; refresh proactively at the 50min mark.
_OIDC_CACHE: dict[str, Any] = {"token": "", "expires_at": 0.0}
_OIDC_CACHE_TTL_SECONDS = 50 * 60
_oidc_lock = asyncio.Lock()


async def aclose() -> None:
    """Close the shared AsyncClient. Wired into main.py's lifespan."""
    if not _client.is_closed:
        await _client.aclose()


async def get_oidc_token() -> str:
    """Mint a Google OIDC token via `gcloud auth print-identity-token` (cached)."""
    loop = asyncio.get_event_loop()
    now = loop.time()
    if _OIDC_CACHE["token"] and _OIDC_CACHE["expires_at"] > now:
        return _OIDC_CACHE["token"]

    async with _oidc_lock:
        now = loop.time()
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
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                raise HTTPException(
                    500,
                    "gcloud auth print-identity-token did not return within 15s. "
                    "Check gcloud CLI health on this host.",
                ) from None
        except FileNotFoundError:
            raise HTTPException(
                500,
                "gcloud CLI not found. Install Google Cloud SDK and run `gcloud auth login`.",
            ) from None

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
        _OIDC_CACHE["expires_at"] = now + _OIDC_CACHE_TTL_SECONDS
        return token


def clear_oidc_cache() -> None:
    """Forget the cached token (used after a 401/403 from Composer)."""
    _OIDC_CACHE["token"] = ""


async def trigger_dag(payload: dict, timeout: float = 30.0) -> httpx.Response:
    """POST a DAG-trigger payload to Composer. Caller handles error responses."""
    if not config.COMPOSER_DAG_TRIGGER_URL:
        raise HTTPException(
            503,
            "Template creation is not available in this environment. "
            "The Composer DAG trigger is only configured for dev / ephemeral deployments.",
        )
    token = await get_oidc_token()
    try:
        return await _client.post(
            config.COMPOSER_DAG_TRIGGER_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            timeout=timeout,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Failed to reach Composer: {exc}") from exc


async def get_dag_run(dag_run_id: str, timeout: float = 15.0) -> httpx.Response:
    """GET a DAG run's current state from Composer. Caller handles error responses."""
    if not config.COMPOSER_DAG_TRIGGER_URL:
        raise HTTPException(503, "COMPOSER_DAG_TRIGGER_URL not configured")
    token = await get_oidc_token()
    url = f"{config.COMPOSER_DAG_TRIGGER_URL.rstrip('/')}/{dag_run_id}"
    return await _client.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=timeout,
    )
