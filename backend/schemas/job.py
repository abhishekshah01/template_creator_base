"""Models for /api/job-info, /api/collections, /api/deploy-*, /api/mongosh, etc."""

from pydantic import BaseModel


class JobRequest(BaseModel):
    job_id: str
    bearer_token: str = ""


class DeleteCollectionsRequest(BaseModel):
    job_id: str
    db_name: str
    collections: list[str]


class EnvVarsRequest(BaseModel):
    job_id: str


class CollectionDataRequest(BaseModel):
    job_id: str
    db_name: str
    collection_name: str
    limit: int = 20


class MongoshRequest(BaseModel):
    job_id: str
    db_name: str
    command: str
