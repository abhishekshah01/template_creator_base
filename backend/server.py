# Re-export app from main so uvicorn server:app works
from main import app  # noqa: F401
