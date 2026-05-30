"""Request/response models for /api/asset/* — S3 + CloudFront proxies."""

from typing import Optional

from pydantic import BaseModel


class BearerTokenRequest(BaseModel):
    bearer_token: str


class AssetUploadUrlRequest(BaseModel):
    bucket: str
    key: str
    content_type: str = "application/octet-stream"
    expiration_minutes: int = 15
    bearer_token: str


class AssetDeleteRequest(BaseModel):
    bucket: str
    key: str
    bearer_token: str


class AssetInvalidateRequest(BaseModel):
    cloudfront_distribution_id: str
    path: str
    bearer_token: str


class AssetListObjectsRequest(BaseModel):
    bucket: str
    prefix: str = ""
    continuation_token: Optional[str] = None
    page_size: int = 300
    bearer_token: str


class AssetObjectMetaRequest(BaseModel):
    bucket: str
    key: str
    bearer_token: str


class AssetDownloadUrlRequest(BaseModel):
    bucket: str
    key: str
    expiration_minutes: int = 5
    download: bool = False
    bearer_token: str
