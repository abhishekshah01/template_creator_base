"""Configuration for Template Creator app.

Supports three environment types:
- "dev" / "prod": Standard environments with fixed URLs
- "eph-{name}": Ephemeral environments with dynamic URL generation
"""

import os
from dotenv import load_dotenv

load_dotenv()

# --- Active environment (can be changed at runtime) ---
ENV = os.environ.get("TEMPLATE_ENV", "eph-leadgen1")

# --- Standard environment presets ---
STANDARD_ENVS = {
    "dev": {
        "label": "dev",
        "type": "standard",
        "api_url": os.environ.get("DEV_API_URL", ""),
        "envcore_url": os.environ.get("DEV_ENVCORE_URL", ""),
        "pause_url": os.environ.get("DEV_PAUSE_URL", ""),
        "db_dsn": os.environ.get("DEV_DB_DSN", ""),
    },
    "prod": {
        "label": "prod",
        "type": "standard",
        "api_url": os.environ.get("PROD_API_URL", ""),
        "envcore_url": os.environ.get("PROD_ENVCORE_URL", ""),
        "pause_url": os.environ.get("PROD_PAUSE_URL", ""),
        "db_dsn": os.environ.get("PROD_DB_DSN", ""),
    },
}

# --- Ephemeral environment URL templates ---
EPH_API_URL_TEMPLATE = os.environ.get("EPH_API_URL_TEMPLATE", "")
EPH_ENVCORE_URL = os.environ.get("EPH_ENVCORE_URL", "")
EPH_PAUSE_URL_TEMPLATE = os.environ.get("EPH_PAUSE_URL_TEMPLATE", "")
EPH_DB_DSN_TEMPLATE = os.environ.get("EPH_DB_DSN_TEMPLATE", "")

EPH_TEMPLATES = {
    "api_url": EPH_API_URL_TEMPLATE,
    "envcore_url": EPH_ENVCORE_URL,
    "pause_url": EPH_PAUSE_URL_TEMPLATE,
    "db_dsn": EPH_DB_DSN_TEMPLATE,
}


def get_env_config(env_name):
    """Get configuration for an environment by name."""
    if env_name in STANDARD_ENVS:
        return STANDARD_ENVS[env_name]

    # Ephemeral: strip "eph-" prefix if present
    name = env_name.removeprefix("eph-") if env_name.startswith("eph-") else env_name
    return {
        "label": f"eph-{name}",
        "type": "ephemeral",
        "api_url": EPH_TEMPLATES["api_url"].format(name=name) if EPH_TEMPLATES["api_url"] else "",
        "envcore_url": EPH_TEMPLATES["envcore_url"],
        "pause_url": EPH_TEMPLATES["pause_url"].format(name=name) if EPH_TEMPLATES["pause_url"] else "",
        "db_dsn": EPH_TEMPLATES["db_dsn"].format(name=name) if EPH_TEMPLATES["db_dsn"] else "",
    }


# --- Resolve active environment ---
_cfg = get_env_config(ENV)

API_URL = os.environ.get("EMERGENT_API_URL", _cfg["api_url"])
ENVCORE_URL = os.environ.get("ENVCORE_URL", _cfg["envcore_url"])
DB_DSN = os.environ.get("DB_DSN", _cfg["db_dsn"])
PAUSE_URL = os.environ.get("PAUSE_URL", _cfg["pause_url"])

# --- Dev VM SSH (legacy template creation) ---
VM_HOST = os.environ.get("VM_HOST", "")
VM_ZONE = os.environ.get("VM_ZONE", "")
VM_USER = os.environ.get("VM_USER", "")
VM_SSH_KEY = os.environ.get("VM_SSH_KEY", "")

# --- Template defaults ---
RESTIC_PASSWORD = os.environ.get("RESTIC_PASSWORD", "")
DEST_BUCKET = os.environ.get("DEST_BUCKET", "")
SOURCE_BUCKET = os.environ.get("SOURCE_BUCKET", "")

# --- Script path on the VM ---
TEMPLATE_SCRIPT_PATH = os.environ.get("TEMPLATE_SCRIPT_PATH", "")

# --- GCP Service Account key file ---
GCP_SA_KEY_FILE = os.environ.get("GCP_SA_KEY_FILE", "")
