"""
Two-tier persistent cache (diskcache).

Tiers:
  fresh  (< cache_ttl_seconds)         → serve from cache, skip network
  stale  (< stale_serve_ttl_seconds)   → serve as fallback if live scrape fails
  expired (>= stale_serve_ttl_seconds) → delete and treat as UNAVAILABLE

Added in this version:
  - max size limit to prevent unbounded disk growth
  - thread-safe eviction
  - basic stats tracking
  - explicit clear() utility
"""
from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Any, Optional

from diskcache import Cache

from config import get_settings

logger = logging.getLogger("cache")
settings = get_settings()

_cache = Cache(settings.cache_dir, size_limit=settings.cache_max_size_bytes)
_stats_lock = Lock()
_stats = {"hits_fresh": 0, "hits_stale": 0, "misses": 0, "sets": 0}


def _key(source: str, query: str) -> str:
    normalized = query.strip().lower()
    return f"{source}:{hashlib.sha256(normalized.encode()).hexdigest()}"


@dataclass
class CacheEntry:
    data: Any
    stored_at: float
    is_fresh: bool

    @property
    def age_seconds(self) -> float:
        return time.time() - self.stored_at


def get(source: str, query: str) -> Optional[CacheEntry]:
    """Return a CacheEntry if one exists within the stale window, else None."""
    key = _key(source, query)
    record = _cache.get(key)
    if record is None:
        with _stats_lock:
            _stats["misses"] += 1
        return None

    data, stored_at = record
    age = time.time() - stored_at

    if age > settings.stale_serve_ttl_seconds:
        _cache.delete(key)
        with _stats_lock:
            _stats["misses"] += 1
        return None

    is_fresh = age <= settings.cache_ttl_seconds
    with _stats_lock:
        if is_fresh:
            _stats["hits_fresh"] += 1
        else:
            _stats["hits_stale"] += 1

    return CacheEntry(data=data, stored_at=stored_at, is_fresh=is_fresh)


def set(source: str, query: str, data: Any) -> None:
    """Store a successfully-scraped/fetched result."""
    key = _key(source, query)
    try:
        _cache.set(key, (data, time.time()))
        with _stats_lock:
            _stats["sets"] += 1
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache write failed for %s/%s: %s", source, query[:30], exc)


def get_stats() -> dict:
    with _stats_lock:
        total = _stats["hits_fresh"] + _stats["hits_stale"] + _stats["misses"]
        hit_rate = (_stats["hits_fresh"] + _stats["hits_stale"]) / total if total else 0
        return {
            **_stats,
            "total_requests": total,
            "hit_rate_pct": round(hit_rate * 100, 1),
            "disk_size_bytes": _cache.volume(),
            "entry_count": len(_cache),
        }


def clear() -> int:
    """Clear all entries. Returns number of entries cleared."""
    count = len(_cache)
    _cache.clear()
    return count
