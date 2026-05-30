"""httpx wrapper for app-service /internal/* endpoints.

Centralizes URL construction, bearer-token forwarding, and error mapping so
service layers don't repeat the same boilerplate.
"""

from __future__ import annotations

from typing import Any, Optional

import httpx
from fastapi import HTTPException

import config

_client = httpx.AsyncClient(follow_redirects=True)


def _headers(bearer_token: str, json_body: bool = True) -> dict:
    h = {"Authorization": f"Bearer {bearer_token}"}
    if json_body:
        h["Content-Type"] = "application/json"
    return h


def _raise_for_status(resp: httpx.Response, label: str) -> None:
    if resp.status_code < 400:
        return
    body = resp.text[:500]
    if "<html" in body.lower():
        raise HTTPException(
            resp.status_code,
            f"{label} returned {resp.status_code} (HTML — endpoint may not exist in this env)",
        )
    raise HTTPException(resp.status_code, f"{label} failed: {body}")


async def post(
    path: str,
    json: dict,
    bearer_token: str,
    timeout: float = 15.0,
    label: Optional[str] = None,
) -> Any:
    """POST a JSON body to {API_URL}{path} with the bearer token."""
    url = f"{config.API_URL}{path}"
    try:
        resp = await _client.post(url, json=json, headers=_headers(bearer_token), timeout=timeout)
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach app-service ({path}): {exc}")
    _raise_for_status(resp, label or f"POST {path}")
    return resp.json()


async def get(
    path: str,
    bearer_token: str,
    params: Optional[dict] = None,
    timeout: float = 15.0,
    label: Optional[str] = None,
) -> Any:
    """GET {API_URL}{path} with the bearer token + optional query params."""
    url = f"{config.API_URL}{path}"
    try:
        resp = await _client.get(
            url,
            params=params,
            headers=_headers(bearer_token, json_body=False),
            timeout=timeout,
        )
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach app-service ({path}): {exc}")
    _raise_for_status(resp, label or f"GET {path}")
    return resp.json()


async def put(
    path: str,
    json: dict,
    bearer_token: str,
    timeout: float = 30.0,
    label: Optional[str] = None,
) -> Any:
    """PUT a JSON body to {API_URL}{path} with the bearer token."""
    url = f"{config.API_URL}{path}"
    try:
        resp = await _client.put(url, json=json, headers=_headers(bearer_token), timeout=timeout)
    except Exception as exc:
        raise HTTPException(502, f"Failed to reach app-service ({path}): {exc}")
    _raise_for_status(resp, label or f"PUT {path}")
    return resp.json()
