"""Shared pytest fixtures."""

import os
import sys
from pathlib import Path

import pytest

# Make `backend/` importable as the root package path.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Stub minimal env so config.py loads without raising.
os.environ.setdefault("DEPLOYMENT_SCOPE", "dev")
os.environ.setdefault("DEV_API_URL", "http://app-service.test")


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
