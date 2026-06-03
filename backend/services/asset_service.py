"""S3 + CloudFront operations — proxied through app-service /internal/templates/s3/*.

Thin shims; app-service holds all AWS credentials. Reads go through a 30s
TTL cache (services/cache.py). Writes invalidate the relevant cache keys
so users see fresh data after they mutate.
"""

from typing import Optional

from clients import app_service_client as app_svc
from services.cache import object_cache, token_hash

_BASE = "/internal/templates/s3"


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
    result = await app_svc.post(
        f"{_BASE}/delete",
        json={"bucket": bucket, "key": key},
        bearer_token=bearer_token,
        label="S3 delete",
    )
    # Bust every listing in this bucket and any cached metadata for this key,
    # across all tokens — a delete is observable to everyone.
    object_cache.invalidate_prefix(f"objects:{bucket}:")
    object_cache.invalidate_prefix(f"meta:{bucket}:{key}:")
    return result


async def upload_object(*, bucket: str, key: str, content_type: str, data: bytes, bearer_token: str) -> dict:
    minted = await mint_upload_url(
        bucket=bucket,
        key=key,
        content_type=content_type,
        expiration_minutes=15,
        bearer_token=bearer_token,
    )
    await app_svc.put_bytes(minted["upload_url"], data, content_type)
    object_cache.invalidate_prefix(f"objects:{bucket}:")
    return {"bucket": bucket, "key": key, "public_url": minted.get("public_url")}


async def create_folder(*, bucket: str, key: str, bearer_token: str) -> dict:
    result = await app_svc.post(
        f"{_BASE}/folder",
        json={"bucket": bucket, "key": key},
        bearer_token=bearer_token,
        label="S3 create-folder",
    )
    # A new marker object changes what listings return for this bucket.
    object_cache.invalidate_prefix(f"objects:{bucket}:")
    return result


async def invalidate_cache(*, cloudfront_distribution_id: str, path: str, bearer_token: str) -> dict:
    return await app_svc.post(
        f"{_BASE}/invalidate",
        json={"cloudfront_distribution_id": cloudfront_distribution_id, "path": path},
        bearer_token=bearer_token,
        timeout=30.0,
        label="CloudFront invalidate",
    )


async def list_buckets(*, bearer_token: str, force: bool = False) -> dict:
    key = f"buckets:{token_hash(bearer_token)}"
    return await object_cache.get_or_set(
        key,
        lambda: app_svc.get(f"{_BASE}/buckets", bearer_token=bearer_token, label="S3 list-buckets"),
        force=force,
    )


async def list_objects(
    *,
    bucket: str,
    prefix: str,
    continuation_token: Optional[str],
    page_size: int,
    bearer_token: str,
    force: bool = False,
) -> dict:
    cache_key = f"objects:{bucket}:{prefix}:{continuation_token or ''}:{page_size}:{token_hash(bearer_token)}"
    async def _fetch():
        params = {"bucket": bucket, "prefix": prefix, "page_size": page_size}
        if continuation_token:
            params["continuation_token"] = continuation_token
        return await app_svc.get(
            f"{_BASE}/objects",
            bearer_token=bearer_token,
            params=params,
            label="S3 list-objects",
        )
    return await object_cache.get_or_set(cache_key, _fetch, force=force)


async def object_meta(*, bucket: str, key: str, bearer_token: str, force: bool = False) -> dict:
    cache_key = f"meta:{bucket}:{key}:{token_hash(bearer_token)}"
    async def _fetch():
        return await app_svc.get(
            f"{_BASE}/object/meta",
            bearer_token=bearer_token,
            params={"bucket": bucket, "key": key},
            timeout=10.0,
            label="S3 object-meta",
        )
    return await object_cache.get_or_set(cache_key, _fetch, force=force)


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
