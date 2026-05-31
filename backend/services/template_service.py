"""Template creation — runs the restic snapshot script on the dev VM via gcloud SSH."""

import re
import subprocess

from fastapi import HTTPException

import config


def create_template(*, job_id: str, user_id: str, template_name: str) -> dict:
    """Trigger create_template_gcs.sh on the dev VM. Requires local gcloud auth."""
    if not re.match(r"^[a-zA-Z0-9_-]+$", template_name):
        raise HTTPException(400, "Template name must be alphanumeric with hyphens/underscores only")

    script_command = (
        f"sudo docker run --rm --network=host "
        f"-v {config.TEMPLATE_SCRIPT_PATH}:/run_template.sh:ro "
        f"alpine:latest sh -c '"
        f"apk add --no-cache restic git bash curl sed >/dev/null 2>&1 && "
        f"bash /run_template.sh "
        f'--source-repo "gs:{config.SOURCE_BUCKET}:/users/{user_id}" '
        f"--template-name {template_name} "
        f"--restic-password {config.RESTIC_PASSWORD} "
        f"--job-id {job_id} "
        f"--dest-bucket {config.DEST_BUCKET}"
        f"'"
    )

    gcloud_cmd = [
        "gcloud",
        "compute",
        "ssh",
        config.VM_HOST,
        f"--zone={config.VM_ZONE}",
        "--command",
        script_command,
    ]

    try:
        result = subprocess.run(gcloud_cmd, capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Template creation timed out (5 min limit)")
    except FileNotFoundError:
        raise HTTPException(
            500, "gcloud CLI not found. Install Google Cloud SDK and run `gcloud auth login`."
        )

    return {
        "status": "success" if result.returncode == 0 else "failed",
        "gcs_path": f"gs://{config.DEST_BUCKET}/{template_name}",
        "output": result.stdout[-2000:],
        "error": result.stderr[-1000:] if result.returncode != 0 else "",
    }
