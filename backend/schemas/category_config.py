"""Models for /api/category-config CRUD + template summary."""

from pydantic import BaseModel


class CategoryConfigRequest(BaseModel):
    template_name: str
    config: dict = {}
    default_env_config: dict
    summary_source_job_id: str = ""
    internal: bool = True
    public: bool = False
    bearer_token: str


class TemplateSummaryRequest(BaseModel):
    template_name: str
    bearer_token: str


class GetCategoryConfigRequest(BaseModel):
    config_id: str
    bearer_token: str


class UpdateCategoryConfigRequest(BaseModel):
    config_id: str
    template_name: str
    config: dict = {}
    default_env_config: dict
    summary_source_job_id: str = ""
    internal: bool = True
    public: bool = False
    bearer_token: str
