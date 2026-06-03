"""/api/asset/* — S3 + CloudFront proxies.

Each route resolves the (action, resource) it represents and calls
require_permission before proxying, so an unauthorized caller gets a 403 from
the backend rather than the action silently succeeding.
"""

from fastapi import APIRouter, Depends, File, Form, UploadFile

from authentication.authenticated_user import AuthenticatedUser
from schemas.asset import (
    AssetCreateFolderRequest,
    AssetDeleteRequest,
    AssetDownloadUrlRequest,
    AssetInvalidateRequest,
    AssetListObjectsRequest,
    AssetObjectMetaRequest,
    AssetUploadUrlRequest,
    BearerTokenRequest,
)
from services import asset_service
from services.access_control.permission_catalog import S3Action

router = APIRouter(prefix="/api/asset", tags=["asset"])


@router.post("/upload-url")
async def upload_url(
    req: AssetUploadUrlRequest,
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    # A key ending in '/' is a zero-byte folder marker, so it needs the
    # create-folder permission rather than plain object upload.
    action = S3Action.CREATE_FOLDER if req.key.endswith("/") else S3Action.PUT_OBJECT
    await user.require_permission(action, f"s3://{req.bucket}/{req.key}")
    return await asset_service.mint_upload_url(
        bucket=req.bucket,
        key=req.key,
        content_type=req.content_type,
        expiration_minutes=req.expiration_minutes,
        bearer_token=req.bearer_token,
    )


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    bucket: str = Form(...),
    key: str = Form(...),
    bearer_token: str = Form(...),
    content_type: str = Form("application/octet-stream"),
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    action = S3Action.CREATE_FOLDER if key.endswith("/") else S3Action.PUT_OBJECT
    await user.require_permission(action, f"s3://{bucket}/{key}")
    return await asset_service.upload_object(
        bucket=bucket,
        key=key,
        content_type=content_type,
        data=await file.read(),
        bearer_token=bearer_token,
    )


@router.post("/create-folder")
async def create_folder(
    req: AssetCreateFolderRequest,
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    await user.require_permission(S3Action.CREATE_FOLDER, f"s3://{req.bucket}/{req.key}")
    return await asset_service.create_folder(bucket=req.bucket, key=req.key, bearer_token=req.bearer_token)


@router.post("/delete")
async def delete(
    req: AssetDeleteRequest,
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    await user.require_permission(S3Action.DELETE_OBJECT, f"s3://{req.bucket}/{req.key}")
    return await asset_service.delete_object(bucket=req.bucket, key=req.key, bearer_token=req.bearer_token)


@router.post("/invalidate")
async def invalidate(
    req: AssetInvalidateRequest,
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    resource = f"cloudfront://{req.cloudfront_distribution_id}{req.path}"
    await user.require_permission(S3Action.INVALIDATE_CACHE, resource)
    return await asset_service.invalidate_cache(
        cloudfront_distribution_id=req.cloudfront_distribution_id,
        path=req.path,
        bearer_token=req.bearer_token,
    )


@router.post("/buckets")
async def buckets(
    req: BearerTokenRequest,
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    await user.require_permission(S3Action.LIST_BUCKETS, "s3://*")
    return await asset_service.list_buckets(bearer_token=req.bearer_token, force=req.force)


@router.post("/objects")
async def objects(
    req: AssetListObjectsRequest,
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    await user.require_permission(S3Action.LIST_BUCKET, f"s3://{req.bucket}/{req.prefix or ''}")
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
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    await user.require_permission(S3Action.GET_OBJECT, f"s3://{req.bucket}/{req.key}")
    return await asset_service.object_meta(
        bucket=req.bucket, key=req.key, bearer_token=req.bearer_token, force=req.force,
    )


@router.post("/download-url")
async def download_url(
    req: AssetDownloadUrlRequest,
    user: AuthenticatedUser = Depends(AuthenticatedUser.require_user),
):
    await user.require_permission(S3Action.GET_OBJECT, f"s3://{req.bucket}/{req.key}")
    return await asset_service.mint_download_url(
        bucket=req.bucket,
        key=req.key,
        expiration_minutes=req.expiration_minutes,
        download=req.download,
        bearer_token=req.bearer_token,
    )
