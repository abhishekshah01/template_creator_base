"""Environment switching + introspection.

The active env is held as module-level state on `config` (legacy pattern).
Services that build URLs do so from `config.API_URL` at call time, so they
pick up the new env automatically after a switch.
"""

import re
import threading

from fastapi import HTTPException

import config

# Held while we rewrite config.* during a switch so requests don't observe
# half-updated state. Read paths are best-effort (no lock) since each url is
# read once per request.
_switch_lock = threading.Lock()


def _mask_dsn(dsn: str) -> str:
    """Redact credentials in both key=value and URI-style DSNs."""
    if not dsn:
        return ""
    masked = re.sub(r"(?i)(password\s*=\s*)([^ \t;&]+)", r"\1***", dsn)
    masked = re.sub(r"(://[^:/@]+:)([^@]+)(@)", r"\1***\3", masked)
    return masked


def get_environments() -> dict:
    envs = [
        {"name": name, "label": cfg["label"], "type": "standard"}
        for name, cfg in config.STANDARD_ENVS.items()
    ]
    active = config.get_env_config(config.ENV)
    masked_dsn = _mask_dsn(config.DB_DSN)
    return {
        "deployment_scope": config.DEPLOYMENT_SCOPE,
        "ephemeral_enabled": config.EPHEMERAL_ENABLED,
        "active": config.ENV,
        "environments": envs,
        "active_config": {
            "env": config.ENV,
            "label": active.get("label", config.ENV),
            "type": active.get("type", "ephemeral"),
            "api_url": config.API_URL,
            "envcore_url": config.ENVCORE_URL,
            "pause_url": config.PAUSE_URL,
            "db_dsn": masked_dsn,
            "source_bucket": config.SOURCE_BUCKET,
            "dest_bucket": config.DEST_BUCKET,
        },
    }


def switch_environment(env_name: str) -> dict:
    name = env_name.strip()
    if not name:
        raise HTTPException(400, "Environment name is required")
    if not config.is_env_allowed(name):
        raise HTTPException(
            403,
            f"Environment '{name}' is not available in the '{config.DEPLOYMENT_SCOPE}' deployment scope.",
        )

    cfg = config.get_env_config(name)
    with _switch_lock:
        config.ENV = name
        config.API_URL = cfg["api_url"]
        config.ENVCORE_URL = cfg["envcore_url"]
        config.PAUSE_URL = cfg["pause_url"]
        config.DB_DSN = cfg["db_dsn"]

    return {
        "status": "success",
        "env": name,
        "label": cfg.get("label", name),
        "config": {
            "api_url": config.API_URL,
            "envcore_url": config.ENVCORE_URL,
            "pause_url": config.PAUSE_URL,
        },
    }
