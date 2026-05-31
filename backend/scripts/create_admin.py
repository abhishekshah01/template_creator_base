#!/usr/bin/env python3
"""Bootstrap CLI — create an admin user in MongoDB.

Run from the backend directory so config.py / clients import cleanly:

    cd backend
    python scripts/create_admin.py

Prompts for account_id (12 digits), email (@emergent.sh), username, and
password (twice). Validates via the same service the API uses, hashes the
password with bcrypt, and inserts into admin_users.

Safe to re-run — duplicate account_id / email / username raise a clean error.
"""

from __future__ import annotations

import asyncio
import getpass
import sys
from pathlib import Path

# Allow running as `python backend/scripts/create_admin.py` from repo root by
# adding the backend dir to sys.path so the package-style imports below resolve.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv

load_dotenv(BACKEND_DIR / ".env")

from fastapi import HTTPException  # noqa: E402

from clients import mongo_client  # noqa: E402
from services import admin_users  # noqa: E402


def _prompt(label: str, *, default: str = "", secret: bool = False) -> str:
    suffix = f" [{default}]" if default else ""
    while True:
        raw = getpass.getpass(f"{label}{suffix}: ") if secret else input(f"{label}{suffix}: ")
        value = raw.strip() if not secret else raw
        if value:
            return value
        if default:
            return default
        print("  (required)")


async def main() -> int:
    print("Create an admin user for template-creator")
    print("-----------------------------------------")
    account_id = _prompt("Account ID (12 digits)")
    email = _prompt("Email (@emergent.sh)")
    username = _prompt("Username")

    while True:
        pw = _prompt("Password", secret=True)
        pw2 = _prompt("Confirm password", secret=True)
        if pw != pw2:
            print("  passwords do not match — try again\n")
            continue
        try:
            admin_users.validate_password(pw)
            break
        except HTTPException as e:
            print(f"  {e.detail} — try again\n")

    # Make sure the indexes exist before we insert — otherwise the first call
    # on a fresh database won't enforce uniqueness.
    await mongo_client.ensure_indexes()

    try:
        doc = await admin_users.create_admin(
            account_id=account_id,
            email=email,
            username=username,
            password=pw,
        )
    except HTTPException as e:
        print(f"\nFailed: {e.detail}")
        return 1

    print("\nCreated admin:")
    print(f"  _id        : {doc['_id']}")
    print(f"  account_id : {doc['account_id']}")
    print(f"  email      : {doc['email']}")
    print(f"  username   : {doc['username']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
