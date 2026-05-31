"""Tests for /api/collections, /api/delete-collections, /api/collection-data, /api/mongosh.

All four endpoints resolve env_id via app-service, then issue mongosh commands
through envcore's run-command endpoint.
"""

import httpx
import respx


def _mock_env_id(mock, app_service_base, pod_id="pod-abc"):
    mock.get(f"{app_service_base}/internal/verify-ownership").mock(
        return_value=httpx.Response(200, json={"pod_id": pod_id}),
    )


def _envcore_responses(*stdouts):
    """Build a sequence of envcore responses; each call pops the next one."""
    return [httpx.Response(200, json={"stdout": s, "stderr": "", "return_code": 0}) for s in stdouts]


# ---------------------------------------------------------------------------
# /api/collections
# ---------------------------------------------------------------------------


def test_list_collections_parses_db_and_names(client, app_service_base, envcore_base):
    env_file = "MONGO_URL=mongodb://localhost:27017/mydb\nDB_NAME=mydb"
    coll_list = '["users","orders","products"]'
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            side_effect=_envcore_responses(env_file, coll_list),
        )
        resp = client.post("/api/collections", json={"job_id": "j-1"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["db_name"] == "mydb"
    assert [c["name"] for c in body["collections"]] == ["users", "orders", "products"]


def test_list_collections_handles_malformed_stdout(client, app_service_base, envcore_base):
    """When mongosh returns extra lines, parser extracts the first JSON array line."""
    env_file = "DB_NAME=mydb"
    noisy = 'connecting to mongodb\n["users","orders"]\nbye'
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            side_effect=_envcore_responses(env_file, noisy),
        )
        resp = client.post("/api/collections", json={"job_id": "j-1"})
    assert resp.status_code == 200
    assert [c["name"] for c in resp.json()["collections"]] == ["users", "orders"]


# ---------------------------------------------------------------------------
# /api/delete-collections
# ---------------------------------------------------------------------------


def test_delete_collections_reports_per_collection_status(client, app_service_base, envcore_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        # Two drop calls — both succeed.
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            side_effect=_envcore_responses("true", "true"),
        )
        resp = client.post(
            "/api/delete-collections",
            json={"job_id": "j-1", "db_name": "mydb", "collections": ["users", "orders"]},
        )
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 2
    assert all(r["status"] == "dropped" for r in results)


def test_delete_collections_skips_invalid_names(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/delete-collections",
            json={"job_id": "j-1", "db_name": "mydb", "collections": ["bad name!"]},
        )
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert results[0]["status"] == "skipped"
    assert results[0]["reason"] == "invalid name"


# ---------------------------------------------------------------------------
# /api/collection-data
# ---------------------------------------------------------------------------


def test_collection_data_returns_count_and_documents(client, app_service_base, envcore_base):
    docs = '[{"_id":1,"name":"alice"},{"_id":2,"name":"bob"}]'
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            side_effect=_envcore_responses("2", docs),
        )
        resp = client.post(
            "/api/collection-data",
            json={"job_id": "j-1", "db_name": "mydb", "collection_name": "users", "limit": 10},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 2
    assert len(body["documents"]) == 2


def test_collection_data_rejects_invalid_collection_name(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/collection-data",
            json={
                "job_id": "j-1",
                "db_name": "mydb",
                "collection_name": "bad name!",
                "limit": 10,
            },
        )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# /api/mongosh
# ---------------------------------------------------------------------------


def test_mongosh_blocks_destructive_commands(client, app_service_base):
    with respx.mock() as mock:
        _mock_env_id(mock, app_service_base)
        resp = client.post(
            "/api/mongosh",
            json={"job_id": "j-1", "db_name": "mydb", "command": "db.users.drop()"},
        )
    body = resp.json()
    assert body["error"] is True
    assert "drop" in body["output"].lower()


def test_mongosh_allows_read_only_query(client, app_service_base, envcore_base):
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            return_value=httpx.Response(
                200,
                json={"stdout": '{"_id":1,"name":"alice"}', "stderr": "", "return_code": 0},
            ),
        )
        resp = client.post(
            "/api/mongosh",
            json={"job_id": "j-1", "db_name": "mydb", "command": "db.users.findOne()"},
        )
    body = resp.json()
    assert body["error"] is False
    assert "alice" in body["output"]


def test_mongosh_translates_show_dbs(client, app_service_base, envcore_base):
    """`show dbs` should be rewritten to the JS adminCommand equivalent."""
    with respx.mock(assert_all_called=True) as mock:
        _mock_env_id(mock, app_service_base)
        route = mock.post(f"{envcore_base}/api/v1/env/run-command").mock(
            return_value=httpx.Response(
                200,
                json={"stdout": "admin  0.5 KiB", "stderr": "", "return_code": 0},
            ),
        )
        resp = client.post(
            "/api/mongosh",
            json={"job_id": "j-1", "db_name": "mydb", "command": "show dbs"},
        )
    assert resp.status_code == 200
    sent_cmd = route.calls[0].request.content.decode()
    assert "adminCommand" in sent_cmd
