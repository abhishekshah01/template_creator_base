"""Tests for the Composer-DAG-backed template flow.

Composer is reached only through app-service, so we mock composer_client
(trigger_dag / get_dag_run return {status_code, body}) and the template_jobs
Mongo collection — no real Composer / Mongo traffic.
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

BEARER = "test-bearer-token"
AUTH = {"Authorization": f"Bearer {BEARER}"}


@pytest.fixture
def mock_composer(monkeypatch):
    """Stub composer_client's app-service-proxied calls with success defaults."""
    from clients import composer_client

    monkeypatch.setattr(
        composer_client, "trigger_dag", AsyncMock(return_value={"status_code": 200, "body": {}})
    )
    monkeypatch.setattr(
        composer_client,
        "get_dag_run",
        AsyncMock(return_value={"status_code": 200, "body": {"state": "running"}}),
    )
    return composer_client


@pytest.fixture
def fake_jobs():
    """In-memory dict-backed substitute for the Mongo collection."""

    class FakeCollection:
        def __init__(self):
            self.docs: dict[str, dict] = {}

        async def insert_one(self, doc):
            self.docs[doc["dag_run_id"]] = dict(doc)
            return SimpleNamespace(inserted_id="x")

        async def find_one(self, filter_, projection=None):
            doc = self.docs.get(filter_["dag_run_id"])
            if doc is None:
                return None
            out = dict(doc)
            if projection and "_id" in projection and projection["_id"] == 0:
                out.pop("_id", None)
            return out

        async def update_one(self, filter_, update):
            doc = self.docs.get(filter_["dag_run_id"])
            if doc is None:
                return SimpleNamespace(matched_count=0)
            doc.update(update.get("$set", {}))
            new_id = update.get("$set", {}).get("dag_run_id")
            if new_id and new_id != filter_["dag_run_id"]:
                self.docs[new_id] = self.docs.pop(filter_["dag_run_id"])
            return SimpleNamespace(matched_count=1)

    return FakeCollection()


@pytest.fixture(autouse=True)
def patch_template_jobs(monkeypatch, fake_jobs):
    """Route every template_jobs reference at this fake collection."""
    monkeypatch.setattr("clients.mongo_client.template_jobs", fake_jobs)
    monkeypatch.setattr("services.template_service.template_jobs", fake_jobs)
    return fake_jobs


def _create_payload(template_name="lumina"):
    return {"job_id": "j-1", "user_id": "u-1", "template_name": template_name, "bearer_token": BEARER}


# ---------------------------------------------------------------------------
# /api/create-template
# ---------------------------------------------------------------------------


def test_rejects_invalid_template_name(client, mock_composer):
    resp = client.post("/api/create-template", json=_create_payload("bad name!"))
    assert resp.status_code == 400


def test_success_returns_queued_record(client, mock_composer, patch_template_jobs):
    resp = client.post("/api/create-template", json=_create_payload())
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "queued"
    assert body["template_name"] == "lumina"
    assert body["dag_run_id"].startswith("tc-")
    assert body["dag_run_id"] in patch_template_jobs.docs
    # The internal bearer token must reach composer_client, never be stored.
    assert mock_composer.trigger_dag.await_args.kwargs["bearer_token"] == BEARER
    assert "webhook_secret" not in body


def test_composer_4xx_marks_run_failed(client, mock_composer, patch_template_jobs):
    mock_composer.trigger_dag = AsyncMock(return_value={"status_code": 400, "body": "bad payload"})

    resp = client.post("/api/create-template", json=_create_payload())
    assert resp.status_code == 400
    stored = next(iter(patch_template_jobs.docs.values()))
    assert stored["status"] == "failed"
    assert "bad payload" in stored["error"]


def test_composer_alt_dag_run_id_stored_in_composer_field(client, mock_composer, patch_template_jobs):
    """If Composer responds with its own id, our local key stays stable; composer_dag_run_id stored alongside."""
    mock_composer.trigger_dag = AsyncMock(
        return_value={"status_code": 200, "body": {"dag_run_id": "manual-id-42"}}
    )

    resp = client.post("/api/create-template", json=_create_payload())
    assert resp.status_code == 200
    local_id = resp.json()["dag_run_id"]
    assert local_id.startswith("tc-")  # NOT "manual-id-42"
    assert patch_template_jobs.docs[local_id]["composer_dag_run_id"] == "manual-id-42"


# ---------------------------------------------------------------------------
# /api/template-job/{dag_run_id}
# ---------------------------------------------------------------------------


def test_get_template_job_live_fetches_non_terminal(client, mock_composer, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "composer_dag_run_id": "tc-abc",
        "status": "queued",
        "template_name": "lumina",
        "gcs_path": "",
    }
    mock_composer.get_dag_run = AsyncMock(return_value={"status_code": 200, "body": {"state": "running"}})

    resp = client.get("/api/template-job/tc-abc", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"
    assert mock_composer.get_dag_run.await_args.kwargs["bearer_token"] == BEARER


def test_get_template_job_success_derives_gcs_path(client, mock_composer, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "composer_dag_run_id": "tc-abc",
        "status": "running",
        "template_name": "lumina",
        "gcs_path": "",
    }
    mock_composer.get_dag_run = AsyncMock(return_value={"status_code": 200, "body": {"state": "success"}})

    resp = client.get("/api/template-job/tc-abc", headers=AUTH)
    body = resp.json()
    assert body["status"] == "success"
    assert body["gcs_path"].startswith("gs://") and body["gcs_path"].endswith("lumina")


def test_get_template_job_terminal_short_circuits(client, mock_composer, patch_template_jobs):
    """A terminal record (e.g. webhook-fed) is returned without re-hitting Composer."""
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "status": "success",
        "gcs_path": "gs://bkt/lumina",
    }
    mock_composer.get_dag_run = AsyncMock(side_effect=AssertionError("must not fetch when terminal"))

    resp = client.get("/api/template-job/tc-abc", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    mock_composer.get_dag_run.assert_not_awaited()


def test_get_template_job_404_when_missing(client, mock_composer):
    resp = client.get("/api/template-job/never-existed", headers=AUTH)
    assert resp.status_code == 404


def test_get_template_job_requires_auth(client, mock_composer, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {"dag_run_id": "tc-abc", "status": "queued"}
    resp = client.get("/api/template-job/tc-abc")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /api/template-job/{dag_run_id}/callback
# ---------------------------------------------------------------------------


def test_callback_with_valid_secret_updates_record(client, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "webhook_secret": "right-secret",
        "status": "running",
        "started_at": datetime.now(timezone.utc),
    }
    resp = client.post(
        "/api/template-job/tc-abc/callback",
        json={"state": "success", "gcs_path": "gs://bkt/lumina"},
        headers={"X-Callback-Secret": "right-secret"},
    )
    assert resp.status_code == 200
    assert patch_template_jobs.docs["tc-abc"]["status"] == "success"
    assert patch_template_jobs.docs["tc-abc"]["gcs_path"] == "gs://bkt/lumina"


def test_callback_wrong_secret_returns_403(client, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "webhook_secret": "right-secret",
        "status": "running",
    }
    resp = client.post(
        "/api/template-job/tc-abc/callback",
        json={"state": "success"},
        headers={"X-Callback-Secret": "wrong-secret"},
    )
    assert resp.status_code == 403
    assert patch_template_jobs.docs["tc-abc"]["status"] == "running"


def test_callback_missing_secret_header_returns_403(client, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "webhook_secret": "right-secret",
        "status": "running",
    }
    resp = client.post("/api/template-job/tc-abc/callback", json={"state": "success"})
    assert resp.status_code == 403


def test_callback_empty_state_marks_failed_not_success(client, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "webhook_secret": "s",
        "status": "running",
    }
    resp = client.post(
        "/api/template-job/tc-abc/callback",
        json={"state": ""},
        headers={"X-Callback-Secret": "s"},
    )
    assert resp.status_code == 200
    assert patch_template_jobs.docs["tc-abc"]["status"] == "failed"


def test_callback_404_when_record_missing(client):
    resp = client.post(
        "/api/template-job/never-existed/callback",
        json={"state": "success"},
        headers={"X-Callback-Secret": "whatever"},
    )
    assert resp.status_code == 404
