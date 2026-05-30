"""/api/create-template — kicks off the restic snapshot script via gcloud SSH."""

from fastapi import APIRouter

from schemas.template import CreateTemplateRequest
from services import template_service

router = APIRouter(tags=["template"])


@router.post("/api/create-template")
def create_template(req: CreateTemplateRequest):
    return template_service.create_template(
        job_id=req.job_id, user_id=req.user_id, template_name=req.template_name,
    )
