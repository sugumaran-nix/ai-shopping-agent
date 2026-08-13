"""
Two-tier persistent disk cache (diskcache).

Tier 1 — fresh  (age < cache_ttl_seconds):        serve directly, skip network
Tier 2 — stale  (age < stale_serve_ttl_seconds):  serve as fallback if live scrape fails
Expired (age >= stale_serve_ttl_seconds):          delete on read, treat as miss

The diskcache instance is created lazily via _get_cache() so that the CACHE_DIR
environment variable is guaranteed to be loaded before the directory is created.
"""
from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Optional

from diskcache import Cache

from config import get_settings

logger = logging.getLogger("cache")

_cache_instance: Cache | None = None
_cache_lock = Lock()


def _get_cache() -> Cache:
    """Return the singleton Cache, creating it on first call."""
    global _cache_instance
    if _cache_instance is None:
        with _cache_lock:
            if _cache_instance is None:
                s = get_settings()
                _cache_instance = Cache(s.cache_dir, size_limit=s.cache_max_size_bytes)
    return _cache_instance


_stats_lock = Lock()
_stats: dict[str, int] = {"hits_fresh": 0, "hits_stale": 0, "misses": 0, "sets": 0}


def _key(source: str, query: str) -> str:
    normalized = query.strip().lower()
    digest = hashlib.sha256(normalized.encode()).hexdigest()
    return f"{source}:{digest}"


@dataclass
class CacheEntry:
    data: Any
    stored_at: float
    is_fresh: bool

    @property
    def age_seconds(self) -> float:
        return time.time() - self.stored_at


def get(source: str, query: str) -> Optional[CacheEntry]:
    """Return a CacheEntry within the stale window, or None on miss/expiry."""
    s = get_settings()
    cache = _get_cache()
    key = _key(source, query)
    record = cache.get(key)

    if record is None:
        with _stats_lock:
            _stats["misses"] += 1
        return None

    data, stored_at = record
    age = time.time() - stored_at

    if age > s.stale_serve_ttl_seconds:
        cache.delete(key)
        with _stats_lock:
            _stats["misses"] += 1
        return None

    is_fresh = age <= s.cache_ttl_seconds
    with _stats_lock:
        _stats["hits_fresh" if is_fresh else "hits_stale"] += 1

    return CacheEntry(data=data, stored_at=stored_at, is_fresh=is_fresh)


def store(source: str, query: str, data: Any) -> None:
    """Persist a successfully scraped result."""
    cache = _get_cache()
    key = _key(source, query)
    try:
        cache.set(key, (data, time.time()))
        with _stats_lock:
            _stats["sets"] += 1
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache write failed for %s: %s", key[:40], exc)


def get_stats() -> dict:
    cache = _get_cache()
    with _stats_lock:
        total = _stats["hits_fresh"] + _stats["hits_stale"] + _stats["misses"]
        hit_rate = (_stats["hits_fresh"] + _stats["hits_stale"]) / total if total else 0.0
        return {
            **_stats,
            "total_requests": total,
            "hit_rate_pct": round(hit_rate * 100, 1),
            "disk_size_bytes": cache.volume(),
            "entry_count": len(cache),
        }


def clear_all() -> int:
    """Clear every entry. Returns count cleared."""
    cache = _get_cache()
    count = len(cache)
    cache.clear()
    return count
