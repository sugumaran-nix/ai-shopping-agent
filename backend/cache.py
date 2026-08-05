"""
Two-tier cache built on top of `diskcache` (a real, persistent, file-backed
cache - not an in-memory dict that vanishes on restart, and not synthetic
data of any kind).

Every value stored here was produced by an actual successful scrape or a real
API call. There is no seeded/fake/sample data anywhere in this module.

Tiering:
  - "fresh" window (CACHE_TTL_SECONDS): serve straight from cache, skip the
    network call entirely. This is what makes the app fast and cuts
    ScraperAPI usage.
  - "stale" window (STALE_SERVE_TTL_SECONDS): if a *live* scrape attempt
    fails, we fall back to the last real successful result we have for that
    query+source, but the response is explicitly tagged STALE so the
    frontend can show "prices may be outdated" instead of silently
    presenting old data as current.
  - Beyond the stale window (or if nothing was ever cached), we report
    UNAVAILABLE rather than inventing anything.
"""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Any, Optional

from diskcache import Cache

from config import get_settings

settings = get_settings()
_cache = Cache(settings.cache_dir)


def _key(source: str, query: str) -> str:
    normalized = query.strip().lower()
    return f"{source}:{hashlib.sha256(normalized.encode()).hexdigest()}"


@dataclass
class CacheEntry:
    data: Any
    stored_at: float
    is_fresh: bool  # True if within CACHE_TTL_SECONDS of being stored


def get(source: str, query: str) -> Optional[CacheEntry]:
    """Return the cached entry for this source+query, if one exists at all
    (fresh or stale). Returns None only if nothing real was ever stored, or
    it's older than STALE_SERVE_TTL_SECONDS.
    """
    key = _key(source, query)
    record = _cache.get(key)
    if record is None:
        return None

    data, stored_at = record
    age = time.time() - stored_at

    if age > settings.stale_serve_ttl_seconds:
        # Too old to be useful even as a fallback - don't pretend it's current.
        _cache.delete(key)
        return None

    return CacheEntry(data=data, stored_at=stored_at, is_fresh=age <= settings.cache_ttl_seconds)


def set(source: str, query: str, data: Any) -> None:
    """Store a real, successfully-scraped/fetched result."""
    key = _key(source, query)
    _cache.set(key, (data, time.time()))
