#!/usr/bin/env bash
#
# create_template_gcs.sh — Create a scrubbed template from a user's restic backup (GCS → GCS)
#
# Runs inside a GCE container with restic, git, and GCS access.
# Restores to / (safe in a container) so backup paths match the original structure.
#
# Usage:
#   ./create_template_gcs.sh \
#     --source-repo "gs:emergent-snapshots-restic:/users/<user_id>" \
#     --template-name "crm-template" \
#     --restic-password "$RESTIC_PASSWORD"
#
# Optional:
#   --dest-bucket NAME           Destination GCS bucket (default: emergent-template-restic)
#   --dest-repo REPO             Full destination restic repo (overrides --dest-bucket)
#   --source-snapshot ID         Snapshot ID to restore (default: latest)
#   --source-host HOST           Filter by host when restoring
#   --env-image IMAGE            Container image to record in output
#   --scrub-passes LIST          Comma-separated scrub passes (default: env,credential,git,cache,source)
#   --job-id ID                  Job/run ID — resolves snapshot via tag "run-id=<ID>"
#   --dry-run                    Scrub but skip the backup step
#
set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────

SOURCE_REPO=""
SOURCE_SNAPSHOT="latest"
SOURCE_HOST=""
DEST_BUCKET="emergent-template-restic"
DEST_REPO_OVERRIDE=""
TEMPLATE_NAME=""
RESTIC_PASSWORD="${RESTIC_PASSWORD:-}"
ENV_IMAGE=""
JOB_ID=""
SCRUB_PASSES="env,credential,git,cache,source"
DRY_RUN=false

# ── Parse args ──────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source-repo)      SOURCE_REPO="$2"; shift 2 ;;
        --source-snapshot)  SOURCE_SNAPSHOT="$2"; shift 2 ;;
        --source-host)      SOURCE_HOST="$2"; shift 2 ;;
        --dest-bucket)      DEST_BUCKET="$2"; shift 2 ;;
        --dest-repo)        DEST_REPO_OVERRIDE="$2"; shift 2 ;;
        --template-name)    TEMPLATE_NAME="$2"; shift 2 ;;
        --restic-password)  RESTIC_PASSWORD="$2"; shift 2 ;;
        --env-image)        ENV_IMAGE="$2"; shift 2 ;;
        --job-id)           JOB_ID="$2"; shift 2 ;;
        --scrub-passes)     SCRUB_PASSES="$2"; shift 2 ;;
        --dry-run)          DRY_RUN=true; shift ;;
        -h|--help)
            sed -n '2,/^$/{ s/^# \?//; p }' "$0"
            exit 0 ;;
        *)  echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$SOURCE_REPO" ]]    && echo "ERROR: --source-repo required" >&2 && exit 1
[[ -z "$TEMPLATE_NAME" ]]  && echo "ERROR: --template-name required" >&2 && exit 1
[[ -z "$RESTIC_PASSWORD" ]] && echo "ERROR: --restic-password or RESTIC_PASSWORD env required" >&2 && exit 1

export RESTIC_PASSWORD
DEST_REPO="${DEST_REPO_OVERRIDE:-gs:${DEST_BUCKET}:/templates/${TEMPLATE_NAME}}"
CACHE_DIR="/tmp/restic-cache"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

mkdir -p "${CACHE_DIR}"
export RESTIC_CACHE_DIR="${CACHE_DIR}"

# Validate GCS credentials
if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
    [[ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]] || { log "ERROR: GOOGLE_APPLICATION_CREDENTIALS file not found: $GOOGLE_APPLICATION_CREDENTIALS"; exit 1; }
    log "Using service account: ${GOOGLE_APPLICATION_CREDENTIALS}"
else
    log "Using instance metadata for GCS auth"
fi

# ── 1. Resolve snapshot & restore to / ────────────────────────────────────
# Restoring to / so backup paths (/app, /data/db, etc.) land in their
# original locations. Safe because this runs in a dedicated container.

if [[ -n "$JOB_ID" ]]; then
    log "Resolving snapshot for job ${JOB_ID}"
    SNAP_JSON=$(RESTIC_REPOSITORY="${SOURCE_REPO}" restic snapshots --tag "run-id=${JOB_ID}" --latest 1 --json --no-lock 2>/dev/null)
    RESOLVED_ID=$(echo "$SNAP_JSON" | sed -n 's/.*"short_id":"\([^"]*\)".*/\1/p')
    if [[ -z "$RESOLVED_ID" ]]; then
        log "ERROR: no snapshot found for job-id=${JOB_ID} in ${SOURCE_REPO}" >&2
        exit 1
    fi
    SOURCE_SNAPSHOT="$RESOLVED_ID"
    log "Found snapshot ${SOURCE_SNAPSHOT} for job ${JOB_ID}"
fi

log "Restoring from ${SOURCE_REPO} (snapshot: ${SOURCE_SNAPSHOT})"

RESTORE_CMD=(restic restore "${SOURCE_SNAPSHOT}" --no-lock --target / --verify)
[[ -n "$SOURCE_HOST" ]] && RESTORE_CMD+=(--host "${SOURCE_HOST}")
RESTIC_REPOSITORY="${SOURCE_REPO}" "${RESTORE_CMD[@]}" 2>&1

# ── 2. Normalize: /app → /workspace ────────────────────────────────────────

if [[ -d /app ]] && [[ ! -d /workspace ]]; then
    mv /app /workspace
    log "Renamed /app → /workspace"
elif [[ ! -d /workspace ]]; then
    log "ERROR: no /workspace or /app in restored snapshot"; exit 1
fi
WS=/workspace
log "Restored $(du -sh "${WS}" | cut -f1) to ${WS}"

# ── 3. Scrub ────────────────────────────────────────────────────────────────

log "Scrubbing (${SCRUB_PASSES})"
IFS=',' read -ra PASSES <<< "${SCRUB_PASSES}"

for pass in "${PASSES[@]}"; do
    case "$pass" in
        env)
            find "${WS}" -name ".env*" -type f ! -path "*/node_modules/*" ! -path "*/.git/*" -print0 2>/dev/null \
            | while IFS= read -r -d '' f; do
                sed -i -E '/^\s*#/!{/^\s*$/!s/^([A-Za-z_][A-Za-z0-9_]*)=.*$/\1=__PLACEHOLDER__/}' "$f"
            done
            log "  env: done"
            ;;
        credential)
            rm -rf /root/.ssh /root/.aws /root/.config/gcloud /root/.npmrc /root/.pypirc
            log "  credential: done"
            ;;
        git)
            rm -rf "${WS}/.git"
            log "  git: done"
            ;;
        cache)
            find "${WS}" \( -name "__pycache__" -o -name ".pytest_cache" -o -name ".mypy_cache" -o -name ".ruff_cache" -o -name ".next" \) -type d -exec rm -rf {} + 2>/dev/null || true
            find "${WS}" -name "*.pyc" -delete 2>/dev/null || true
            find /var/log -type f -exec truncate -s 0 {} + 2>/dev/null || true
            log "  cache: done"
            ;;
        source)
            find "${WS}" \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.conf" \) \
                -type f ! -path "*/node_modules/*" ! -path "*/.git/*" -print0 2>/dev/null \
            | while IFS= read -r -d '' f; do
                sed -i -E 's/AKIA[0-9A-Z]{16}/__SCRUBBED_AWS_KEY__/g' "$f"
            done
            log "  source: done"
            ;;
    esac
done

# ── 4. Re-init git ─────────────────────────────────────────────────────────

log "Re-initializing git"
cd "${WS}"
git init -b main -q
git config user.email "github@emergent.sh"
git config user.name "emergent-agent-e1"
git add -A
git commit -m "template: ${TEMPLATE_NAME}" -q
cd - >/dev/null

# ── 5. Backup to destination ───────────────────────────────────────────────

if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN — would backup to ${DEST_REPO}"
    ls -la "${WS}/"
    exit 0
fi

log "Backing up to ${DEST_REPO}"
export RESTIC_REPOSITORY="${DEST_REPO}"
restic init 2>&1 || true

BACKUP_PATHS=()
for d in /workspace /data/db /data /etc/supervisor /var/log /root; do
    [[ -d "$d" ]] && BACKUP_PATHS+=("$d")
done

BACKUP_TAGS=(--tag "template:${TEMPLATE_NAME}")
[[ -n "$JOB_ID" ]] && BACKUP_TAGS+=(--tag "source-job:${JOB_ID}")

restic backup "${BACKUP_PATHS[@]}" \
    "${BACKUP_TAGS[@]}" \
    --host "template-${TEMPLATE_NAME}" \
    --verbose 2>&1

SNAP_ID=$(restic snapshots --latest 1 --json 2>/dev/null \
    | sed -n 's/.*"short_id":"\([^"]*\)".*/\1/p' \
    || echo "unknown")

cat <<EOF

Done! Template: ${TEMPLATE_NAME}
  Repo:     ${DEST_REPO}
  Snapshot: ${SNAP_ID}
  Image:    ${ENV_IMAGE:-n/a}

  INSERT INTO templates (name, status, restic_repo, restic_snapshot_id, env_image)
  VALUES ('${TEMPLATE_NAME}', 'ready', '${DEST_REPO}', '${SNAP_ID}', '${ENV_IMAGE}');
EOF