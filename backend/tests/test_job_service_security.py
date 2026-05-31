"""Security-hardening tests for job_service: db_name validation, mongosh
injection guards, expanded blocklist, and env-var redaction.

Covers fixes for issues #8, #9, #10.
"""

import json

import httpx
import respx


def _mock_env_id(mock, app_service_base, pod_id="pod-abc"):
    mock.get(f"{app_service_base}/internal/verify-ownership").mock(
        return_value=httpx.Response(200, json={"pod_id": pod_id}),
    )


# ---------------------------------------------------------------------------
# Issue #10 — db_name validation
# ---------------------------------------------------------------------------


def test_delete_collections_rejects_invalid_db_name(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/delete-collections",
            json={"job_id": "j-1", "db_name": "my; db.users.drop(); //", "collections": ["users"]},
        )
    assert resp.status_code == 400
    assert "db_name" in resp.text.lower()


def test_collection_data_rejects_invalid_db_name(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/collection-data",
            json={
                "job_id": "j-1",
                "db_name": "bad name with spaces",
                "collection_name": "users",
                "limit": 10,
            },
        )
    assert resp.status_code == 400


def test_mongosh_rejects_invalid_db_name(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/mongosh",
            json={"job_id": "j-1", "db_name": "db'; sh -c rm", "command": "show collections"},
        )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Issue #9 — mongosh exec uses array form (no shell)
# ---------------------------------------------------------------------------


def test_mongosh_uses_array_form_exec(client, app_service_base, envcore_base):
    """Envcore receives ['mongosh', '--quiet', '--eval', js] — not ['sh', '-c', ...]."""
    captured = {}

    def capture(request):
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"stdout": "ok", "stderr": "", "return_code": 0})

    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(side_effect=capture)
        resp = client.post(
            "/api/mongosh",
            json={"job_id": "j-1", "db_name": "mydb", "command": "db.users.findOne()"},
        )
    assert resp.status_code == 200
    commands = captured["body"]["commands"]
    assert commands[0] == "mongosh"
    assert commands[1] == "--quiet"
    assert commands[2] == "--eval"
    # The JS payload is its own argv element — single quotes inside can't break out.
    assert "db.users.findOne()" in commands[3]
    # Critically, the array does NOT start with `sh -c`.
    assert commands[:2] != ["sh", "-c"]


# ---------------------------------------------------------------------------
# Issue #8 part 2 — expanded mongosh blocklist
# ---------------------------------------------------------------------------


def test_mongosh_blocks_mapReduce(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/mongosh",
            json={"job_id": "j-1", "db_name": "mydb", "command": "db.runCommand({mapReduce: 'users'})"},
        )
    body = resp.json()
    assert body["error"] is True
    # Either runcommand or mapreduce will trigger first; both are blocked.
    assert any(word in body["output"].lower() for word in ("runcommand", "mapreduce"))


def test_mongosh_blocks_aggregation_out_stage(client, app_service_base):
    """Aggregation with $out writes data — should be blocked."""
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/mongosh",
            json={
                "job_id": "j-1",
                "db_name": "mydb",
                "command": "db.users.aggregate([{$out: 'leaked'}])",
            },
        )
    body = resp.json()
    assert body["error"] is True
    assert "$out" in body["output"]


def test_mongosh_blocks_aggregation_merge_stage(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/mongosh",
            json={
                "job_id": "j-1",
                "db_name": "mydb",
                "command": "db.users.aggregate([{$merge: {into: 'x'}}])",
            },
        )
    body = resp.json()
    assert body["error"] is True
    assert "$merge" in body["output"]


def test_mongosh_blocks_eval(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/mongosh",
            json={"job_id": "j-1", "db_name": "mydb", "command": "db.eval('var x = 1')"},
        )
    body = resp.json()
    assert body["error"] is True
    assert "eval" in body["output"].lower()


# ---------------------------------------------------------------------------
# Issue #8 part 1 — env-var redaction (smoke)
# ---------------------------------------------------------------------------


def test_env_variables_redacts_keys_matching_secret_patterns(client, app_service_base, envcore_base):
    env_file = (
        "PORT=8080\n"
        "API_TOKEN=sk_live_xxx\n"
        "DATABASE_PASSWORD=pw\n"
        "STRIPE_PRIVATE_KEY=priv\n"
        "AUTH_HEADER=bearer-stuff\n"
        "RANDOM_DSN=postgres://u:p@h/db\n"
    )
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            return_value=httpx.Response(200, json={"stdout": env_file, "stderr": "", "return_code": 0}),
        )
        resp = client.post("/api/env-variables", json={"job_id": "j-1"})
    env_vars = resp.json()["env_variables"]
    assert env_vars["PORT"] == "8080"  # non-sensitive
    assert env_vars["API_TOKEN"] == "REDACTED"
    assert env_vars["DATABASE_PASSWORD"] == "REDACTED"
    assert env_vars["STRIPE_PRIVATE_KEY"] == "REDACTED"
    assert env_vars["AUTH_HEADER"] == "REDACTED"
    assert env_vars["RANDOM_DSN"] == "REDACTED"


# Collection-name handling: hyphens allowed + getCollection() instead of dot-notation
# (CodeRabbit follow-up — see PR #13 thread)


def test_delete_collections_accepts_hyphenated_name(client, app_service_base, envcore_base):
    captured = {}

    def capture(request):
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"stdout": "true", "stderr": "", "return_code": 0})

    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(side_effect=capture)
        resp = client.post(
            "/api/delete-collections",
            json={"job_id": "j-1", "db_name": "mydb", "collections": ["user-events"]},
        )
    assert resp.status_code == 200
    assert resp.json()["results"][0]["status"] == "dropped"
    sent_eval = captured["body"]["commands"][3]
    assert 'getCollection("user-events")' in sent_eval
    assert "user-events." not in sent_eval


def test_collection_data_accepts_digit_prefixed_name(client, app_service_base, envcore_base):
    captured = []

    def capture(request):
        captured.append(json.loads(request.content))
        return httpx.Response(200, json={"stdout": "0", "stderr": "", "return_code": 0})

    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(side_effect=capture)
        resp = client.post(
            "/api/collection-data",
            json={"job_id": "j-1", "db_name": "mydb", "collection_name": "2024_logs", "limit": 10},
        )
    assert resp.status_code == 200
    for body in captured:
        sent_eval = body["commands"][3]
        assert 'getCollection("2024_logs")' in sent_eval
        assert ".2024_logs" not in sent_eval


def test_collection_name_validator_still_rejects_metacharacters(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/delete-collections",
            json={"job_id": "j-1", "db_name": "mydb", "collections": ["users; sh"]},
        )
    assert resp.status_code == 200
    assert resp.json()["results"][0]["status"] == "skipped"
