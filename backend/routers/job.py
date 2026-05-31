"""Job / pod / deploy endpoints."""

from fastapi import APIRouter

from schemas.job import (
    CollectionDataRequest,
    DeleteCollectionsRequest,
    EnvVarsRequest,
    JobRequest,
    MongoshRequest,
)
from services import job_service

router = APIRouter(tags=["job"])


@router.post("/api/job-info")
async def job_info(req: JobRequest):
    return await job_service.get_job_info(job_id=req.job_id, bearer_token=req.bearer_token)


@router.post("/api/collections")
async def collections(req: JobRequest):
    return await job_service.list_collections(job_id=req.job_id)


@router.post("/api/delete-collections")
async def delete_collections(req: DeleteCollectionsRequest):
    return await job_service.delete_collections(
        job_id=req.job_id,
        db_name=req.db_name,
        collections=req.collections,
    )


@router.post("/api/collection-data")
async def collection_data(req: CollectionDataRequest):
    return await job_service.get_collection_data(
        job_id=req.job_id,
        db_name=req.db_name,
        collection_name=req.collection_name,
        limit=req.limit,
    )


@router.post("/api/mongosh")
async def mongosh(req: MongoshRequest):
    return await job_service.run_mongosh(
        job_id=req.job_id,
        db_name=req.db_name,
        command=req.command,
    )


@router.post("/api/env-variables")
async def env_variables(req: EnvVarsRequest):
    return await job_service.get_env_variables(job_id=req.job_id)


@router.post("/api/deploy-app")
async def deploy_app(req: JobRequest):
    return await job_service.deploy_app(job_id=req.job_id, bearer_token=req.bearer_token)


@router.post("/api/deploy-status")
async def deploy_status(req: JobRequest):
    return await job_service.deploy_status(job_id=req.job_id, bearer_token=req.bearer_token)


@router.post("/api/deploy-history")
async def deploy_history(req: JobRequest):
    return await job_service.deploy_history(job_id=req.job_id, bearer_token=req.bearer_token)


@router.post("/api/restart-job")
async def restart_job(req: JobRequest):
    return await job_service.restart_job(job_id=req.job_id, bearer_token=req.bearer_token)


@router.post("/api/pause-job")
async def pause_job(req: JobRequest):
    return await job_service.pause_job(job_id=req.job_id)
