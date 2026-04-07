"""Configuration for Template Creator app.

Set environment variables or edit defaults below.
"""

import os

# --- Environment: "dev", "local", or "eph-{name}" ---
ENV = os.environ.get("TEMPLATE_ENV", "eph-leadgen1")

# --- Environment-specific configs ---
_ENV_CONFIGS = {
    "local": {
        "api_url": "https://api.emergent.test",
        "envcore_url": None,
        "db_dsn": "host=localhost port=7432 dbname=postgres user=postgres",
    },
    "dev": {
        "api_url": "https://api.dev.emergentagent.com",
        "envcore_url": "http://envcore.int-worker.dev.emergentagent.com",
        "db_dsn": "host=10.0.2.3 port=6544 dbname=postgres user=postgres password=pYOjidM5JFUMJZp",
    },
}

def _get_eph_config(name):
    return {
        "api_url": "https://agent-service.emergentagent.com",
        "envcore_url": "http://envcore.int-worker.dev.emergentagent.com",
        "db_dsn": f"host=10.0.2.3 port=6544 dbname=postgres-{name} user=postgres password=pYOjidM5JFUMJZp",
    }

if ENV.startswith("eph-"):
    _cfg = _get_eph_config(ENV.removeprefix("eph-"))
elif ENV in _ENV_CONFIGS:
    _cfg = _ENV_CONFIGS[ENV]
else:
    _cfg = _ENV_CONFIGS["local"]

# --- Emergent API (for pause-environment) ---
API_URL = os.environ.get("EMERGENT_API_URL", _cfg["api_url"])

# --- Envcore (for pod_exec — running commands inside job pods) ---
ENVCORE_URL = os.environ.get("ENVCORE_URL", _cfg["envcore_url"])

# --- Database (to look up environment ID from job ID) ---
DB_DSN = os.environ.get("DB_DSN", _cfg["db_dsn"])

# --- Pause URL (internal Cloud Run URL, no auth needed) ---
PAUSE_URL = os.environ.get(
    "PAUSE_URL",
    "http://emergent-agents-leadgen1.cloudrun.internal.dev.emergentagent.com",
)

# --- Dev VM SSH (for template creation script) ---
VM_HOST = os.environ.get("VM_HOST", "emergent-dev-vm-anshul")
VM_ZONE = os.environ.get("VM_ZONE", "us-central1-a")
VM_USER = os.environ.get("VM_USER", "")  # your gcloud username on the VM
VM_SSH_KEY = os.environ.get("VM_SSH_KEY", "")  # path to private key (optional, for paramiko)

# --- Template defaults ---
RESTIC_PASSWORD = os.environ.get("RESTIC_PASSWORD", "test123")
DEST_BUCKET = os.environ.get("DEST_BUCKET", "emergent-dev-template-restic")
SOURCE_BUCKET = os.environ.get("SOURCE_BUCKET", "dev-snapshots-restic")

# --- Script path on the VM ---
TEMPLATE_SCRIPT_PATH = os.environ.get(
    "TEMPLATE_SCRIPT_PATH",
    "/home/sritam_emergent_sh/create_template_gcs.sh",
)
