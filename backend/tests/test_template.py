"""Tests for the Composer-DAG-backed template flow.

Mocks composer_client, the template_jobs Mongo collection, and the polling
background task — no real Composer / Mongo / asyncio.sleep traffic.
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest


@pytest.fixture
def mock_composer(monkeypatch):
    """Stub composer_client + clear the OIDC cache between tests."""
    from clients import composer_client

    monkeypatch.setattr(composer_client, "get_oidc_token", AsyncMock(return_value="tok-xyz"))
    composer_client.clear_oidc_cache()
    return composer_client


@pytest.fixture(autouse=True)
def stub_poll_background(monkeypatch):
    """Replace the polling background task with a no-op so TestClient doesn't hang.

    The real `_poll_dag_run` runs `asyncio.sleep(5)` and would block the
    request handler in TestClient's BackgroundTasks runner.
    """

    async def _noop(dag_run_id):
        return None

    monkeypatch.setattr("services.template_service._poll_dag_run", _noop)


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
            # Support dag_run_id rewrite (Composer returning a different id)
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


def _composer_response(status_code=200, json_body=None, text=""):
    """Helper to build a fake httpx.Response-like object for trigger_dag's return."""
    body = json_body or {}
    return SimpleNamespace(
        status_code=status_code,
        text=text or str(body),
        json=lambda: body,
    )


# ---------------------------------------------------------------------------
# /api/create-template
# ---------------------------------------------------------------------------


def test_rejects_invalid_template_name(client, mock_composer, monkeypatch):
    monkeypatch.setattr("config.COMPOSER_DAG_TRIGGER_URL", "http://composer.test/dag")
    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "bad name!"},
    )
    assert resp.status_code == 400


def test_rejects_when_composer_not_configured(client, mock_composer, monkeypatch):
    monkeypatch.setattr("config.COMPOSER_DAG_TRIGGER_URL", "")
    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 503


def test_success_returns_queued_record(client, mock_composer, monkeypatch, patch_template_jobs):
    monkeypatch.setattr("config.COMPOSER_DAG_TRIGGER_URL", "http://composer.test/dag")
    monkeypatch.setattr(mock_composer, "trigger_dag", AsyncMock(return_value=_composer_response()))

    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "queued"
    assert body["template_name"] == "lumina"
    assert body["dag_run_id"].startswith("tc-")
    assert body["dag_run_id"] in patch_template_jobs.docs


def test_composer_4xx_marks_run_failed(client, mock_composer, monkeypatch, patch_template_jobs):
    monkeypatch.setattr("config.COMPOSER_DAG_TRIGGER_URL", "http://composer.test/dag")
    monkeypatch.setattr(
        mock_composer,
        "trigger_dag",
        AsyncMock(return_value=_composer_response(status_code=400, text="bad payload")),
    )

    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 400
    # The Mongo record should reflect the failure even though the response is 4xx.
    stored = next(iter(patch_template_jobs.docs.values()))
    assert stored["status"] == "failed"
    assert "bad payload" in stored["error"]


def test_composer_alt_dag_run_id_stored_in_composer_field(
    client,
    mock_composer,
    monkeypatch,
    patch_template_jobs,
):
    """If Composer responds with its own id, our local key stays stable; composer_dag_run_id is stored alongside."""
    monkeypatch.setattr("config.COMPOSER_DAG_TRIGGER_URL", "http://composer.test/dag")
    monkeypatch.setattr(
        mock_composer,
        "trigger_dag",
        AsyncMock(return_value=_composer_response(json_body={"dag_run_id": "manual-id-42"})),
    )

    resp = client.post(
        "/api/create-template",
        json={"job_id": "j-1", "user_id": "u-1", "template_name": "lumina"},
    )
    assert resp.status_code == 200
    local_id = resp.json()["dag_run_id"]
    assert local_id.startswith("tc-")  # NOT "manual-id-42"
    assert local_id in patch_template_jobs.docs
    assert patch_template_jobs.docs[local_id]["composer_dag_run_id"] == "manual-id-42"


# ---------------------------------------------------------------------------
# /api/template-job/{dag_run_id}
# ---------------------------------------------------------------------------


def test_get_template_job_returns_stored_record(client, patch_template_jobs):
    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "status": "running",
        "template_name": "lumina",
    }
    resp = client.get("/api/template-job/tc-abc")
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"


def test_get_template_job_404_when_missing(client):
    resp = client.get("/api/template-job/never-existed")
    assert resp.status_code == 404


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
    # State should NOT have been updated
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


# ---------------------------------------------------------------------------
# Poll loop short-circuit on terminal state (regression guard)
# ---------------------------------------------------------------------------


def test_poll_loop_stops_on_terminal_state_set_by_webhook(monkeypatch, patch_template_jobs):
    """If a webhook has already marked the record terminal, the poll loop returns
    without hitting Composer or writing an older state back."""
    import asyncio as _asyncio

    from services import template_service

    patch_template_jobs.docs["tc-abc"] = {
        "dag_run_id": "tc-abc",
        "status": "success",  # already terminal (webhook beat us)
        "gcs_path": "gs://bkt/lumina",
    }

    composer_called = {"count": 0}

    async def fail_if_called(_id):
        composer_called["count"] += 1
        raise AssertionError("Composer should not be called once the record is terminal")

    monkeypatch.setattr("clients.composer_client.get_dag_run", fail_if_called)
    # Skip the initial 5s sleep so the test doesn't block.
    monkeypatch.setattr("services.template_service.asyncio.sleep", AsyncMock(return_value=None))

    _asyncio.get_event_loop().run_until_complete(template_service._poll_dag_run("tc-abc"))

    assert composer_called["count"] == 0
    assert patch_template_jobs.docs["tc-abc"]["status"] == "success"  # not regressed
