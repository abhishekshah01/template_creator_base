"""permission_audit.record writes one row per call and never raises."""

from types import SimpleNamespace

import pytest
from bson import ObjectId

from schemas.permissions import Decision


@pytest.fixture
def fake_audit():
    class FakeAudit:
        def __init__(self):
            self.docs: list[dict] = []
            self.raise_next = False

        async def insert_one(self, doc):
            if self.raise_next:
                self.raise_next = False
                raise RuntimeError("simulated mongo down")
            self.docs.append(dict(doc))
            return SimpleNamespace(inserted_id="x")

    return FakeAudit()


@pytest.fixture(autouse=True)
def patch_audit(monkeypatch, fake_audit):
    monkeypatch.setattr("clients.mongo_client.permission_audit", fake_audit)
    monkeypatch.setattr("services.permissions.audit.permission_audit", fake_audit)
    return fake_audit


@pytest.mark.asyncio
async def test_record_allow_writes_one_row(fake_audit):
    from services.permissions import audit

    user = {"_id": ObjectId(), "username": "abc", "type": "admin"}
    decision = Decision(effect="allow", reason="explicit allow")

    await audit.record(
        user=user,
        action="tc:s3:GetObject",
        resource="s3://b/k",
        decision=decision,
        route="/api/asset/download-url",
        request_id="req-1",
    )

    assert len(fake_audit.docs) == 1
    row = fake_audit.docs[0]
    assert row["user_id"] == user["_id"]
    assert row["username"] == "abc"
    assert row["user_type"] == "admin"
    assert row["action"] == "tc:s3:GetObject"
    assert row["resource"] == "s3://b/k"
    assert row["decision"] == "allow"
    assert row["reason"] == "explicit allow"
    assert row["route"] == "/api/asset/download-url"
    assert row["request_id"] == "req-1"
    assert row["ts"] is not None


@pytest.mark.asyncio
async def test_record_deny_writes_one_row(fake_audit):
    from services.permissions import audit

    user = {"_id": ObjectId(), "username": "bob", "type": "user"}
    decision = Decision(effect="deny", reason="default deny")

    await audit.record(user=user, action="tc:s3:DeleteObject", resource="s3://b/k", decision=decision)
    assert fake_audit.docs[0]["decision"] == "deny"
    assert fake_audit.docs[0]["reason"] == "default deny"


@pytest.mark.asyncio
async def test_record_handles_missing_user_id_gracefully(fake_audit):
    from services.permissions import audit

    user = {"username": "no-id"}
    decision = Decision(effect="deny", reason="default deny")

    await audit.record(user=user, action="tc:s3:GetObject", resource="s3://b/k", decision=decision)
    assert fake_audit.docs[0]["user_id"] is None


@pytest.mark.asyncio
async def test_record_accepts_string_user_id(fake_audit):
    """When the caller passes a string id (e.g. from request state), it's
    coerced to ObjectId when possible; otherwise stored as-is."""
    from services.permissions import audit

    oid = ObjectId()
    user = {"_id": str(oid), "username": "x", "type": "admin"}
    decision = Decision(effect="allow", reason="explicit allow")

    await audit.record(user=user, action="tc:s3:GetObject", resource="s3://b/k", decision=decision)
    assert fake_audit.docs[0]["user_id"] == oid


@pytest.mark.asyncio
async def test_record_uses_user_id_when_no_underscore_id(fake_audit):
    """The session shape carries user_id, not _id — fallback path must work."""
    from services.permissions import audit

    oid = ObjectId()
    user = {"user_id": oid, "username": "x", "type": "admin"}
    decision = Decision(effect="allow", reason="explicit allow")

    await audit.record(user=user, action="tc:s3:GetObject", resource="s3://b/k", decision=decision)
    assert fake_audit.docs[0]["user_id"] == oid


@pytest.mark.asyncio
async def test_record_swallows_mongo_errors(fake_audit):
    """An audit write failure must not propagate — the request path is
    already past the evaluator; bailing here would mask a successful
    permission check."""
    from services.permissions import audit

    fake_audit.raise_next = True
    user = {"_id": ObjectId(), "username": "x"}
    decision = Decision(effect="allow", reason="explicit allow")

    await audit.record(user=user, action="tc:s3:GetObject", resource="s3://b/k", decision=decision)
    assert fake_audit.docs == []
