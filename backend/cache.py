"""
Two-tier persistent disk cache (diskcache).

On Render free tier there is no persistent disk. The cache directory is
created automatically at startup. If it cannot be created or written to
(permissions, read-only filesystem), the cache silently degrades to a
no-op — scrapers still work, they just re-fetch every time.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Optional

from config import get_settings

logger = logging.getLogger("cache")

_cache_instance: Any = None   # diskcache.Cache or _NoOpCache
_cache_lock = Lock()

_stats_lock = Lock()
_stats: dict[str, int] = {"hits_fresh": 0, "hits_stale": 0, "misses": 0, "sets": 0}


# ── No-op fallback ────────────────────────────────────────────────────────────

class _NoOpCache:
    """Used when the disk cache directory cannot be created or written to."""
    def get(self, key: str, default: Any = None) -> Any:  # noqa: ANN401
        return default
    def set(self, key: str, value: Any) -> None: pass     # noqa: ANN401
    def delete(self, key: str) -> None: pass
    def clear(self) -> None: pass
    def volume(self) -> int: return 0
    def __len__(self) -> int: return 0


def _get_cache() -> Any:  # noqa: ANN401
    """Return the singleton cache, creating it on first call."""
    global _cache_instance
    if _cache_instance is not None:
        return _cache_instance

    with _cache_lock:
        if _cache_instance is not None:
            return _cache_instance

        s = get_settings()
        cache_dir = s.cache_dir

        try:
            os.makedirs(cache_dir, exist_ok=True)
            # Quick write test
            test_path = os.path.join(cache_dir, ".write_test")
            with open(test_path, "w") as f:
                f.write("ok")
            os.remove(test_path)

            from diskcache import Cache
            _cache_instance = Cache(cache_dir, size_limit=s.cache_max_size_bytes)
            logger.info("Cache initialised at %s (max %d MB)", cache_dir, s.cache_max_size_bytes // 1_000_000)

        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Cache directory %s not writable (%s) — running without cache. "
                "Scrapers will re-fetch on every request.",
                cache_dir, exc,
            )
            _cache_instance = _NoOpCache()

    return _cache_instance


# ── Public API ────────────────────────────────────────────────────────────────

def _key(source: str, query: str) -> str:
    return f"{source}:{hashlib.sha256(query.strip().lower().encode()).hexdigest()}"


@dataclass
class CacheEntry:
    data: Any
    stored_at: float
    is_fresh: bool

    @property
    def age_seconds(self) -> float:
        return time.time() - self.stored_at


def get(source: str, query: str) -> Optional[CacheEntry]:
    s = get_settings()
    cache = _get_cache()
    record = cache.get(_key(source, query))

    if record is None:
        with _stats_lock:
            _stats["misses"] += 1
        return None

    data, stored_at = record
    age = time.time() - stored_at

    if age > s.stale_serve_ttl_seconds:
        cache.delete(_key(source, query))
        with _stats_lock:
            _stats["misses"] += 1
        return None

    is_fresh = age <= s.cache_ttl_seconds
    with _stats_lock:
        _stats["hits_fresh" if is_fresh else "hits_stale"] += 1
    return CacheEntry(data=data, stored_at=stored_at, is_fresh=is_fresh)


def store(source: str, query: str, data: Any) -> None:
    cache = _get_cache()
    try:
        cache.set(_key(source, query), (data, time.time()))
        with _stats_lock:
            _stats["sets"] += 1
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache write failed for %s: %s", source, exc)


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
            "cache_available": not isinstance(cache, _NoOpCache),
        }


def clear_all() -> int:
    cache = _get_cache()
    count = len(cache)
    cache.clear()
    return count
