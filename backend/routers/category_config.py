"""Category config CRUD endpoints (proxies to app-service)."""

from fastapi import APIRouter

from schemas.asset import BearerTokenRequest
from schemas.category_config import (
    CategoryConfigRequest,
    GetCategoryConfigRequest,
    TemplateSummaryRequest,
    UpdateCategoryConfigRequest,
)
from services import category_config_service as svc

router = APIRouter(tags=["category-config"])


@router.post("/api/list-category-configs")
async def list_category_configs(req: BearerTokenRequest):
    return await svc.list_configs(bearer_token=req.bearer_token)


@router.post("/api/category-config")
async def create_category_config(req: CategoryConfigRequest):
    payload = {
        "template_name": req.template_name,
        "config": req.config,
        "default_env_config": req.default_env_config,
        "summary_source_job_id": req.summary_source_job_id,
        "internal": req.internal,
        "public": req.public,
    }
    return await svc.create_config(payload=payload, bearer_token=req.bearer_token)


@router.post("/api/get-category-config")
async def get_category_config(req: GetCategoryConfigRequest):
    return await svc.get_config(config_id=req.config_id, bearer_token=req.bearer_token)


@router.post("/api/update-category-config")
async def update_category_config(req: UpdateCategoryConfigRequest):
    payload = {
        "template_name": req.template_name,
        "config": req.config,
        "default_env_config": req.default_env_config,
        "summary_source_job_id": req.summary_source_job_id,
        "internal": req.internal,
        "public": req.public,
    }
    return await svc.update_config(
        config_id=req.config_id,
        payload=payload,
        bearer_token=req.bearer_token,
    )


@router.post("/api/template-summary")
async def template_summary(req: TemplateSummaryRequest):
    return await svc.generate_template_summary(
        template_name=req.template_name,
        bearer_token=req.bearer_token,
    )
