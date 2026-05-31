"""Template creation endpoints — Composer DAG trigger + polling/webhook callback."""

from fastapi import APIRouter, BackgroundTasks

from schemas.template import CreateTemplateRequest, TemplateJobCallback
from services import template_service

router = APIRouter(tags=["template"])


@router.post("/api/create-template")
async def create_template(req: CreateTemplateRequest, background_tasks: BackgroundTasks):
    """Trigger the template_publish Composer DAG. Returns immediately with dag_run_id."""
    return await template_service.create_template(
        job_id=req.job_id,
        user_id=req.user_id,
        template_name=req.template_name,
        background_tasks=background_tasks,
    )


@router.get("/api/template-job/{dag_run_id}")
async def get_template_job(dag_run_id: str):
    """Return current status of a template-creation DAG run (frontend polls this)."""
    return await template_service.get_template_job(dag_run_id)


@router.post("/api/template-job/{dag_run_id}/callback")
async def template_job_callback(dag_run_id: str, body: TemplateJobCallback):
    """Webhook target Composer POSTs to when the DAG finishes.

    Only USED when TEMPLATE_JOB_NOTIFY_MODE includes "webhook" and
    TEMPLATE_JOB_WEBHOOK_BASE_URL is set; otherwise the poll-mode path
    already updates the Mongo record.
    """
    await template_service.apply_callback(
        dag_run_id=dag_run_id,
        state=body.state,
        gcs_path=body.gcs_path,
        error=body.error,
    )
    return {"status": "ok"}
