"""In-memory TTL cache.

Keyed by string; values are whatever the fetcher returns. Each entry stores
(expires_at, value). Lookups outside the asyncio lock; only the dict mutation
is locked, so concurrent gets for different keys don't serialise.

Use TTLCache.get_or_set() as the read path. invalidate() / invalidate_prefix()
on write paths so users see fresh data after they mutate.
"""

from __future__ import annotations

import asyncio
import hashlib
import time
from typing import Any, Awaitable, Callable, Optional


class TTLCache:
    def __init__(self, ttl_seconds: int = 30, name: str = "cache") -> None:
        self.ttl = ttl_seconds
        self.name = name
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get_or_set(
        self,
        key: str,
        fetch: Callable[[], Awaitable[Any]],
        *,
        force: bool = False,
        ttl_override: Optional[int] = None,
    ) -> Any:
        if not force:
            entry = self._store.get(key)
            if entry and entry[0] > time.time():
                return entry[1]
        value = await fetch()
        ttl = ttl_override if ttl_override is not None else self.ttl
        async with self._lock:
            self._store[key] = (time.time() + ttl, value)
        return value

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        keys = [k for k in self._store if k.startswith(prefix)]
        for k in keys:
            del self._store[k]
        return len(keys)

    def size(self) -> int:
        return len(self._store)


def token_hash(token: Optional[str]) -> str:
    """Stable 12-char SHA-256 prefix so cache keys can be scoped per token
    without storing the token itself. Different tokens get different cache
    entries — guarantees a stale/invalid token can't read data cached for
    a valid one."""
    if not token:
        return "anon"
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:12]


object_cache = TTLCache(ttl_seconds=30, name="asset")
config_cache = TTLCache(ttl_seconds=30, name="config")
