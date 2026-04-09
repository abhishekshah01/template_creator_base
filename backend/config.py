"""Configuration for Template Creator app.

Supports three environment types:
- "dev" / "prod": Standard environments with fixed URLs
- "eph-{name}": Ephemeral environments with dynamic URL generation
"""

import os

# --- Active environment (can be changed at runtime) ---
ENV = os.environ.get("TEMPLATE_ENV", "eph-leadgen1")

# --- Standard environment presets ---
STANDARD_ENVS = {
    "dev": {
        "label": "dev",
        "type": "standard",
        "api_url": "http://agent-service.cloudrun.internal.dev.emergentagent.com",
        "envcore_url": "http://envcore.int-worker.dev.emergentagent.com",
        "pause_url": "http://emergent-agents.cloudrun.internal.dev.emergentagent.com",
        "db_dsn": "host=10.0.2.3 port=6544 dbname=postgres user=postgres password=pYOjidM5JFUMJZp",
    },
    "prod": {
        "label": "prod",
        "type": "standard",
        "api_url": "http://agent-service.cloudrun.internal.prod.emergentagent.com",
        "envcore_url": "http://envcore.int-worker.dev.emergentagent.com",
        "pause_url": "http://emergent-agents.cloudrun.internal.prod.emergentagent.com",
        "db_dsn": "host=10.0.2.3 port=6544 dbname=postgres user=postgres password=pYOjidM5JFUMJZp",
    },
}

# --- Ephemeral environment URL templates ---
EPH_TEMPLATES = {
    "api_url": "https://agent-service-{name}-1035522277200.us-central1.run.app",
    "envcore_url": "http://envcore.int-worker.dev.emergentagent.com",
    "pause_url": "http://emergent-agents-{name}.cloudrun.internal.dev.emergentagent.com",
    "db_dsn": "host=10.0.2.3 port=6544 dbname=postgres-{name} user=postgres password=pYOjidM5JFUMJZp",
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
        "api_url": EPH_TEMPLATES["api_url"].format(name=name),
        "envcore_url": EPH_TEMPLATES["envcore_url"],
        "pause_url": EPH_TEMPLATES["pause_url"].format(name=name),
        "db_dsn": EPH_TEMPLATES["db_dsn"].format(name=name),
    }


# --- Resolve active environment ---
_cfg = get_env_config(ENV)

API_URL = os.environ.get("EMERGENT_API_URL", _cfg["api_url"])
ENVCORE_URL = os.environ.get("ENVCORE_URL", _cfg["envcore_url"])
DB_DSN = os.environ.get("DB_DSN", _cfg["db_dsn"])
PAUSE_URL = os.environ.get("PAUSE_URL", _cfg["pause_url"])

# --- Dev VM SSH (legacy template creation) ---
VM_HOST = os.environ.get("VM_HOST", "emergent-dev-vm-anshul")
VM_ZONE = os.environ.get("VM_ZONE", "us-central1-a")
VM_USER = os.environ.get("VM_USER", "")
VM_SSH_KEY = os.environ.get("VM_SSH_KEY", "")

# --- Template defaults ---
RESTIC_PASSWORD = os.environ.get("RESTIC_PASSWORD", "test123")
DEST_BUCKET = os.environ.get("DEST_BUCKET", "emergent-dev-template-restic")
SOURCE_BUCKET = os.environ.get("SOURCE_BUCKET", "dev-snapshots-restic")

# --- Script path on the VM ---
TEMPLATE_SCRIPT_PATH = os.environ.get(
    "TEMPLATE_SCRIPT_PATH",
    "/home/sritam_emergent_sh/create_template_gcs.sh",
)

# --- GCP Service Account key file ---
GCP_SA_KEY_FILE = os.environ.get("GCP_SA_KEY_FILE", os.path.join(os.path.dirname(__file__), "..", "sa-key.json"))
