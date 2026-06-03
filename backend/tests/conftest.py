"""Shared pytest fixtures."""

import os
import sys
from pathlib import Path

import pytest

# Make `backend/` importable as the root package path.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Stub minimal env so config.py loads with a usable API_URL.
# These need to be set BEFORE any module reads them; force-set so a local .env
# can't accidentally point tests at a real upstream.
os.environ["DEPLOYMENT_SCOPE"] = "dev"
os.environ["TEMPLATE_ENV"] = "dev"
os.environ["DEV_API_URL"] = "http://app-service.test"
os.environ["DEV_ENVCORE_URL"] = "http://envcore.test"
os.environ["DEV_PAUSE_URL"] = "http://pause.test"


_CONFIG_SNAPSHOT_ATTRS = ("ENV", "API_URL", "ENVCORE_URL", "PAUSE_URL", "DB_DSN")


@pytest.fixture(autouse=True)
def _restore_config():
    """Snapshot config.* module state so tests that switch envs don't leak into others."""
    import config

    saved = {attr: getattr(config, attr) for attr in _CONFIG_SNAPSHOT_ATTRS}
    try:
        yield
    finally:
        for attr, value in saved.items():
            setattr(config, attr, value)


@pytest.fixture(autouse=True)
def _clear_caches():
    """Reset the module-level TTL caches so a value cached by one test can't
    satisfy another test's request (and skip its respx mock)."""
    from services import cache

    cache.object_cache._store.clear()
    cache.config_cache._store.clear()
    yield


@pytest.fixture
def client():
    """FastAPI TestClient against the real app, but with httpx routed via respx."""
    from fastapi.testclient import TestClient

    from main import app

    return TestClient(app)


@pytest.fixture
def app_service_base():
    """Base URL respx should mount mocks under (matches config.API_URL)."""
    import config

    return config.API_URL.rstrip("/")


@pytest.fixture
def envcore_base():
    import config

    return config.ENVCORE_URL.rstrip("/")


@pytest.fixture
def pause_base():
    import config

    return config.PAUSE_URL.rstrip("/")
