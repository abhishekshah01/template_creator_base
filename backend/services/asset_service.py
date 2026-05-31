"""S3 + CloudFront operations — proxied through app-service /internal/s3-templates/*.

Thin shims; app-service holds all AWS credentials.
"""

from typing import Optional

from clients import app_service_client as app_svc

_BASE = "/internal/s3-templates"


async def mint_upload_url(
    *, bucket: str, key: str, content_type: str, expiration_minutes: int, bearer_token: str
) -> dict:
    return await app_svc.post(
        f"{_BASE}/upload-url",
        json={
            "bucket": bucket,
            "key": key,
            "content_type": content_type,
            "expiration_minutes": expiration_minutes,
        },
        bearer_token=bearer_token,
        label="S3 upload-url",
    )


async def delete_object(*, bucket: str, key: str, bearer_token: str) -> dict:
    return await app_svc.post(
        f"{_BASE}/delete",
        json={"bucket": bucket, "key": key},
        bearer_token=bearer_token,
        label="S3 delete",
    )


async def invalidate_cache(*, cloudfront_distribution_id: str, path: str, bearer_token: str) -> dict:
    return await app_svc.post(
        f"{_BASE}/invalidate",
        json={"cloudfront_distribution_id": cloudfront_distribution_id, "path": path},
        bearer_token=bearer_token,
        timeout=30.0,
        label="CloudFront invalidate",
    )


async def list_buckets(*, bearer_token: str) -> dict:
    return await app_svc.get(
        f"{_BASE}/buckets",
        bearer_token=bearer_token,
        label="S3 list-buckets",
    )


async def list_objects(
    *, bucket: str, prefix: str, continuation_token: Optional[str], page_size: int, bearer_token: str
) -> dict:
    params = {"bucket": bucket, "prefix": prefix, "page_size": page_size}
    if continuation_token:
        params["continuation_token"] = continuation_token
    return await app_svc.get(
        f"{_BASE}/objects",
        bearer_token=bearer_token,
        params=params,
        label="S3 list-objects",
    )


async def object_meta(*, bucket: str, key: str, bearer_token: str) -> dict:
    return await app_svc.get(
        f"{_BASE}/object/meta",
        bearer_token=bearer_token,
        params={"bucket": bucket, "key": key},
        timeout=10.0,
        label="S3 object-meta",
    )


async def mint_download_url(
    *, bucket: str, key: str, expiration_minutes: int, download: bool, bearer_token: str
) -> dict:
    return await app_svc.post(
        f"{_BASE}/download-url",
        json={
            "bucket": bucket,
            "key": key,
            "expiration_minutes": expiration_minutes,
            "download": download,
        },
        bearer_token=bearer_token,
        label="S3 download-url",
    )
