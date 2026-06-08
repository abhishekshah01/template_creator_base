"""Composer DAG client — proxied through app-service.

template-creator has no GCP creds, so it can't mint the Composer OIDC token
itself. app-service holds the creds and exposes /internal/composer/*; we just
forward the caller's internal-user bearer token. app-service returns Composer's
status code + body verbatim in {status_code, body}.
"""

from __future__ import annotations

from typing import Any

from clients import app_service_client

_DAG_RUNS_PATH = "/internal/composer/dag-runs"


async def trigger_dag(*, dag_run_id: str, conf: dict, bearer_token: str) -> dict[str, Any]:
    """Trigger the template DAG via app-service. Returns {status_code, body}."""
    return await app_service_client.post(
        _DAG_RUNS_PATH,
        json={"dag_run_id": dag_run_id, "conf": conf},
        bearer_token=bearer_token,
        timeout=30.0,
        label="Composer trigger (via app-service)",
    )


async def get_dag_run(*, dag_run_id: str, bearer_token: str) -> dict[str, Any]:
    """Fetch a DAG run's state via app-service. Returns {status_code, body}."""
    return await app_service_client.get(
        f"{_DAG_RUNS_PATH}/{dag_run_id}",
        bearer_token=bearer_token,
        label="Composer get-run (via app-service)",
    )
