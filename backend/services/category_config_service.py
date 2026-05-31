"""Category config CRUD + template-app-summary — proxied to app-service."""

from urllib.parse import quote

from fastapi import HTTPException

from clients import app_service_client as app_svc

_BASE = "/internal/category-config"
_SUMMARY = f"{_BASE}/template-app-summary"


def _safe_config_id(config_id: str) -> str:
    """Reject empty/path-traversal/slash-bearing IDs, then URL-encode for safety."""
    if not config_id or "/" in config_id or ".." in config_id:
        raise HTTPException(400, "Invalid config_id")
    return quote(config_id, safe="")


async def list_configs(*, bearer_token: str):
    data = await app_svc.get(_BASE, bearer_token=bearer_token, timeout=10.0, label="list category configs")
    # Unwrap common envelope shapes
    if isinstance(data, dict):
        for key in ("configs", "data", "results", "items", "category_configs"):
            value = data.get(key)
            if isinstance(value, list):
                return value
        if "template_name" in data:
            return [data]
    return data


async def create_config(*, payload: dict, bearer_token: str) -> dict:
    response = await app_svc.post(
        _BASE, json=payload, bearer_token=bearer_token, timeout=30.0, label="create category config",
    )
    return {"status": "success", "response": response}


async def get_config(*, config_id: str, bearer_token: str) -> dict:
    encoded = _safe_config_id(config_id)
    return await app_svc.get(
        f"{_BASE}/{encoded}", bearer_token=bearer_token, timeout=10.0, label="get category config",
    )


async def update_config(*, config_id: str, payload: dict, bearer_token: str) -> dict:
    encoded = _safe_config_id(config_id)
    response = await app_svc.put(
        f"{_BASE}/{encoded}", json=payload, bearer_token=bearer_token, label="update category config",
    )
    return {"status": "success", "response": response}


async def generate_template_summary(*, template_name: str, bearer_token: str) -> dict:
    response = await app_svc.post(
        _SUMMARY,
        json={"template_name": template_name},
        bearer_token=bearer_token,
        timeout=120.0,
        label="template summary",
    )
    return {"status": "success", "response": response}
