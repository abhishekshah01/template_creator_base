"""Models for /api/create-template + DAG callbacks."""

from pydantic import BaseModel


class CreateTemplateRequest(BaseModel):
    job_id: str
    user_id: str
    template_name: str


class TemplateJobCallback(BaseModel):
    """Body Composer POSTs when a DAG run finishes (webhook mode).

    Field names follow the conventional Airflow callback payload; backend is
    tolerant to extra keys.
    """
    state: str = ""
    dag_run_id: str = ""
    gcs_path: str = ""
    error: str = ""
