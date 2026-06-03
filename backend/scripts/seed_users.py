"""Seed local test users (owner / admin / user) for RBAC testing.

Bootstraps the chicken-and-egg gap: creating users normally requires an
authenticated session, but there's no user to sign in as yet. Run once against
a fresh Mongo.

Usage:
    cd backend && ../.venv311/bin/python scripts/seed_users.py

Idempotent — skips accounts that already exist. All accounts use the same
password: Password123
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Put backend/ on the path and supply dev env so config imports cleanly.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DEPLOYMENT_SCOPE", "dev")
os.environ.setdefault("TEMPLATE_ENV", "dev")
os.environ.setdefault("DEV_API_URL", "http://app-service.test")
os.environ.setdefault("DEV_ENVCORE_URL", "http://envcore.test")
os.environ.setdefault("DEV_PAUSE_URL", "http://pause.test")

from clients import mongo_client  # noqa: E402
from exceptions import DuplicateResourceError  # noqa: E402
from services import user_service  # noqa: E402
from services.access_control import role_seeder  # noqa: E402

PASSWORD = "Password123"
SEED_USERS = [
    {"account_id": "000000000001", "email": "owner@emergent.sh", "username": "owner", "user_type": "owner"},
    {"account_id": "000000000002", "email": "admin@emergent.sh", "username": "admin", "user_type": "admin"},
    {"account_id": "000000000003", "email": "user@emergent.sh", "username": "user", "user_type": "user"},
]


async def main() -> None:
    await mongo_client.ensure_indexes()
    await role_seeder.seed_system_roles()

    for spec in SEED_USERS:
        try:
            created = await user_service.create_user(password=PASSWORD, **spec)
            print(f"created {spec['user_type']:>5}  {spec['username']:<6} id={created['_id']}")
        except DuplicateResourceError:
            existing = await user_service.find_user_by_account_or_email(spec["account_id"])
            print(f"exists  {spec['user_type']:>5}  {spec['username']:<6} id={existing['_id']}")

    await mongo_client.aclose()
    print(f"\nAll accounts use password: {PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
