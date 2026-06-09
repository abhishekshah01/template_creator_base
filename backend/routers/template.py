"""Template creation endpoints — Composer DAG trigger + live polling / webhook callback."""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from schemas.template import CreateTemplateRequest, TemplateJobCallback
from services import template_service

router = APIRouter(tags=["template"])


def _bearer_from_header(authorization: Optional[str]) -> str:
    """Extract the bearer token from an Authorization header (401 if absent)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing or malformed Authorization header")
    return authorization.split(" ", 1)[1].strip()


@router.post("/api/create-template")
async def create_template(req: CreateTemplateRequest):
    """Trigger the template_publish Composer DAG. Returns immediately with dag_run_id."""
    return await template_service.create_template(
        job_id=req.job_id,
        user_id=req.user_id,
        template_name=req.template_name,
        bearer_token=req.bearer_token,
    )


@router.get("/api/template-job/{dag_run_id}")
async def get_template_job(dag_run_id: str, authorization: Optional[str] = Header(default=None)):
    """Return current status of a template-creation DAG run (frontend polls this)."""
    return await template_service.get_template_job(
        dag_run_id=dag_run_id,
        bearer_token=_bearer_from_header(authorization),
    )


@router.post("/api/template-job/{dag_run_id}/callback")
async def template_job_callback(
    dag_run_id: str,
    body: TemplateJobCallback,
    x_callback_secret: Optional[str] = Header(default=None),
):
    """Webhook target Composer POSTs to when the DAG finishes.

    Authenticated via the per-job secret in the `X-Callback-Secret` header —
    minted at job creation, known only to Composer and our Mongo record. Keeping
    it in a header (not the URL) avoids leakage through access logs.
    """
    await template_service.apply_callback(
        dag_run_id=dag_run_id,
        secret=x_callback_secret or "",
        state=body.state,
        gcs_path=body.gcs_path,
        error=body.error,
    )
    return {"status": "ok"}
