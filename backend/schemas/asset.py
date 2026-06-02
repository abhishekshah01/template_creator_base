"""Request/response models for /api/asset/* — S3 + CloudFront proxies."""

from typing import Optional

from pydantic import BaseModel, Field

# AWS bucket names: 3-63 chars, lowercase letters/digits/dots/hyphens.
_BUCKET = Field(min_length=3, max_length=63)
# S3 object keys: AWS allows up to 1024 bytes; require non-empty.
_KEY = Field(min_length=1, max_length=1024)
_TOKEN = Field(min_length=1, max_length=4096)


class BearerTokenRequest(BaseModel):
    bearer_token: str = _TOKEN
    force: bool = False


class AssetUploadUrlRequest(BaseModel):
    bucket: str = _BUCKET
    key: str = _KEY
    content_type: str = Field(default="application/octet-stream", max_length=255)
    expiration_minutes: int = Field(default=15, ge=1, le=60)
    bearer_token: str = _TOKEN


class AssetDeleteRequest(BaseModel):
    bucket: str = _BUCKET
    key: str = _KEY
    bearer_token: str = _TOKEN


class AssetInvalidateRequest(BaseModel):
    cloudfront_distribution_id: str = Field(min_length=1, max_length=64)
    path: str = Field(min_length=1, max_length=1024)
    bearer_token: str = _TOKEN


class AssetListObjectsRequest(BaseModel):
    bucket: str = _BUCKET
    prefix: str = Field(default="", max_length=1024)
    continuation_token: Optional[str] = Field(default=None, max_length=2048)
    page_size: int = Field(default=1000, ge=1, le=1000)
    bearer_token: str = _TOKEN
    force: bool = False


class AssetObjectMetaRequest(BaseModel):
    bucket: str = _BUCKET
    key: str = _KEY
    bearer_token: str = _TOKEN
    force: bool = False


class AssetDownloadUrlRequest(BaseModel):
    bucket: str = _BUCKET
    key: str = _KEY
    expiration_minutes: int = Field(default=5, ge=1, le=60)
    download: bool = False
    bearer_token: str = _TOKEN
