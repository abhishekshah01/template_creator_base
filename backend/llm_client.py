"""Thin async wrapper around emergentintegrations for collection classification.

Single entry point: ``classify_collections(collections)``.

One batched request — names, field shapes, and a few raw sample docs per
collection — gets back a structured verdict per collection. Retries once on
parse failure, then raises and lets the caller fall back to keyword heuristics.

The system prompt lives in ``prompts.py`` so prompt iteration doesn't churn
this file.
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from typing import Any

from emergentintegrations.llm.chat import LlmChat, UserMessage

from prompts_template_aware import CLASSIFY_COLLECTIONS_TEMPLATE_AWARE_SYSTEM_PROMPT

_TIMEOUT_S = 25
_MODEL_PROVIDER = "anthropic"
_MODEL_NAME = "claude-sonnet-4-6"
_PAYLOAD_CHAR_LIMIT = 80_000


class LLMClassificationError(Exception):
    pass


def _build_payload(collections: list[dict]) -> str:
    return json.dumps({"collections": collections}, default=str)[:_PAYLOAD_CHAR_LIMIT]


async def _one_shot(prompt: str) -> str:
    api_key = os.environ.get("EMERGENT_LLM_API_KEY", "").strip()
    if not api_key:
        raise LLMClassificationError("EMERGENT_LLM_API_KEY is not set")

    chat = (
        LlmChat(
            api_key=api_key,
            session_id=f"template-classify-{uuid.uuid4().hex[:8]}",
            system_message=CLASSIFY_COLLECTIONS_TEMPLATE_AWARE_SYSTEM_PROMPT,
        )
        .with_model(_MODEL_PROVIDER, _MODEL_NAME)
        .with_params(temperature=0.1, response_format={"type": "json_object"})
    )

    return await chat.send_message(UserMessage(text=prompt))


async def classify_collections(collections: list[dict]) -> dict[str, Any]:
    """Run the batched classification call.

    ``collections`` is a list of ``{"name", "field_names", "sample_docs",
    "doc_count"}`` dicts already trimmed by the caller. Returns the parsed
    JSON dict, or raises ``LLMClassificationError`` on failure.
    """
    if not collections:
        return {"app_type": "", "collections": {}}

    payload = _build_payload(collections)

    for attempt in (1, 2):
        suffix = (
            "\n\nIMPORTANT: respond with valid JSON only, no prose, no markdown."
            if attempt == 2
            else ""
        )
        try:
            raw = await asyncio.wait_for(_one_shot(payload + suffix), timeout=_TIMEOUT_S)
        except asyncio.TimeoutError as e:
            if attempt == 2:
                raise LLMClassificationError("LLM call timed out") from e
            continue
        except Exception as e:
            if attempt == 2:
                raise LLMClassificationError(f"LLM call failed: {e}") from e
            continue

        try:
            return json.loads(_strip_fences(raw))
        except json.JSONDecodeError:
            if attempt == 2:
                raise LLMClassificationError(f"LLM returned non-JSON: {raw[:300]}")
            continue

    raise LLMClassificationError("unreachable")


def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s[3:]
        if s.endswith("```"):
            s = s[:-3]
    return s.strip()
