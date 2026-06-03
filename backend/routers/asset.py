"""/api/asset/* — S3 + CloudFront proxies. Each route resolves the
action (and resource URI) from its request body before calling
authorize(), which evaluates against the caller's policy and writes
one permission_audit row. Enforcement (raise 403) only kicks in when
PERMISSIONS_ENFORCE is on."""

from fastapi import APIRouter, Depends, Request

from routers.admin_auth import get_current_admin
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
from services.permissions import actions
from services.permissions.deps import authorize

router = APIRouter(prefix="/api/asset", tags=["asset"])


@router.post("/upload-url")
async def upload_url(
    req: AssetUploadUrlRequest,
    request: Request,
    user: dict = Depends(get_current_admin),
):
    # Folder marker = zero-byte object with key ending in '/'. Same endpoint
    # in AWS too — we split the permission so an uploader can be granted
    # file uploads without folder-creation rights.
    action = actions.S3_CREATE_FOLDER if req.key.endswith("/") else actions.S3_PUT_OBJECT
    await authorize(user, action, f"s3://{req.bucket}/{req.key}", request)
    return await asset_service.mint_upload_url(
        bucket=req.bucket,
        key=req.key,
        content_type=req.content_type,
        expiration_minutes=req.expiration_minutes,
        bearer_token=req.bearer_token,
    )


@router.post("/delete")
async def delete(
    req: AssetDeleteRequest,
    request: Request,
    user: dict = Depends(get_current_admin),
):
    await authorize(user, actions.S3_DELETE_OBJECT, f"s3://{req.bucket}/{req.key}", request)
    return await asset_service.delete_object(bucket=req.bucket, key=req.key, bearer_token=req.bearer_token)


@router.post("/invalidate")
async def invalidate(
    req: AssetInvalidateRequest,
    request: Request,
    user: dict = Depends(get_current_admin),
):
    # CloudFront invalidations target a path, not a key — bucket-agnostic URI
    # so per-bucket scoping isn't accidentally implied.
    resource = f"cloudfront://{req.cloudfront_distribution_id}{req.path}"
    await authorize(user, actions.S3_INVALIDATE_CACHE, resource, request)
    return await asset_service.invalidate_cache(
        cloudfront_distribution_id=req.cloudfront_distribution_id,
        path=req.path,
        bearer_token=req.bearer_token,
    )


@router.post("/buckets")
async def buckets(
    req: BearerTokenRequest,
    request: Request,
    user: dict = Depends(get_current_admin),
):
    await authorize(user, actions.S3_LIST_BUCKETS, "s3://*", request)
    return await asset_service.list_buckets(bearer_token=req.bearer_token, force=req.force)


@router.post("/objects")
async def objects(
    req: AssetListObjectsRequest,
    request: Request,
    user: dict = Depends(get_current_admin),
):
    resource = f"s3://{req.bucket}/{req.prefix or ''}"
    await authorize(user, actions.S3_LIST_BUCKET, resource, request)
    return await asset_service.list_objects(
        bucket=req.bucket,
        prefix=req.prefix,
        continuation_token=req.continuation_token,
        page_size=req.page_size,
        bearer_token=req.bearer_token,
        force=req.force,
    )


@router.post("/object-meta")
async def object_meta(
    req: AssetObjectMetaRequest,
    request: Request,
    user: dict = Depends(get_current_admin),
):
    await authorize(user, actions.S3_GET_OBJECT, f"s3://{req.bucket}/{req.key}", request)
    return await asset_service.object_meta(
        bucket=req.bucket, key=req.key, bearer_token=req.bearer_token, force=req.force,
    )


@router.post("/download-url")
async def download_url(
    req: AssetDownloadUrlRequest,
    request: Request,
    user: dict = Depends(get_current_admin),
):
    await authorize(user, actions.S3_GET_OBJECT, f"s3://{req.bucket}/{req.key}", request)
    return await asset_service.mint_download_url(
        bucket=req.bucket,
        key=req.key,
        expiration_minutes=req.expiration_minutes,
        download=req.download,
        bearer_token=req.bearer_token,
    )
