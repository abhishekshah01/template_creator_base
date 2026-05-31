"""/api/asset/* — S3 + CloudFront proxies."""

from fastapi import APIRouter

from schemas.asset import (
    AssetDeleteRequest,
    AssetDownloadUrlRequest,
    AssetInvalidateRequest,
    AssetListObjectsRequest,
    AssetObjectMetaRequest,
    AssetUploadUrlRequest,
    BearerTokenRequest,
)
from services import asset_service

router = APIRouter(prefix="/api/asset", tags=["asset"])


@router.post("/upload-url")
async def upload_url(req: AssetUploadUrlRequest):
    return await asset_service.mint_upload_url(
        bucket=req.bucket,
        key=req.key,
        content_type=req.content_type,
        expiration_minutes=req.expiration_minutes,
        bearer_token=req.bearer_token,
    )


@router.post("/delete")
async def delete(req: AssetDeleteRequest):
    return await asset_service.delete_object(
        bucket=req.bucket, key=req.key, bearer_token=req.bearer_token
    )


@router.post("/invalidate")
async def invalidate(req: AssetInvalidateRequest):
    return await asset_service.invalidate_cache(
        cloudfront_distribution_id=req.cloudfront_distribution_id,
        path=req.path,
        bearer_token=req.bearer_token,
    )


@router.post("/buckets")
async def buckets(req: BearerTokenRequest):
    return await asset_service.list_buckets(bearer_token=req.bearer_token)


@router.post("/objects")
async def objects(req: AssetListObjectsRequest):
    return await asset_service.list_objects(
        bucket=req.bucket,
        prefix=req.prefix,
        continuation_token=req.continuation_token,
        page_size=req.page_size,
        bearer_token=req.bearer_token,
    )


@router.post("/object-meta")
async def object_meta(req: AssetObjectMetaRequest):
    return await asset_service.object_meta(
        bucket=req.bucket, key=req.key, bearer_token=req.bearer_token
    )


@router.post("/download-url")
async def download_url(req: AssetDownloadUrlRequest):
    return await asset_service.mint_download_url(
        bucket=req.bucket,
        key=req.key,
        expiration_minutes=req.expiration_minutes,
        download=req.download,
        bearer_token=req.bearer_token,
    )
