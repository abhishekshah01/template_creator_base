"""Persistence for the `permission_audit` collection."""

from __future__ import annotations

from clients.mongo_client import permission_audit


async def insert_audit_entry(document: dict) -> None:
    await permission_audit.insert_one(document)
