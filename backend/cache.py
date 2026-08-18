"""Two-tier cache with optional Redis persistence and disk fallback."""
from __future__ import annotations

import hashlib
import logging
import os
import pickle
import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Optional

from config import get_settings

logger = logging.getLogger("cache")

_cache_instance: Any = None
_cache_backend_name = "none"
_cache_lock = Lock()
_stats_lock = Lock()
_stats: dict[str, int] = {"hits_fresh": 0, "hits_stale": 0, "misses": 0, "sets": 0}


class _NoOpCache:
    def get(self, key: str, default: Any = None) -> Any:
        return default

    def set(self, key: str, value: Any) -> None:
        pass

    def delete(self, key: str) -> None:
        pass

    def clear(self) -> None:
        pass

    def volume(self) -> int:
        return 0

    def __len__(self) -> int:
        return 0


class _RedisCache:
    """Small diskcache-compatible adapter over a Redis deployment."""

    def __init__(self, url: str) -> None:
        import redis

        self.client = redis.Redis.from_url(url, socket_connect_timeout=3, socket_timeout=3)
        self.prefix = "ai-shopping-agent:"
        self.client.ping()

    def _key(self, key: str) -> str:
        return f"{self.prefix}{key}"

    def get(self, key: str, default: Any = None) -> Any:
        raw = self.client.get(self._key(key))
        return pickle.loads(raw) if raw is not None else default

    def set(self, key: str, value: Any) -> None:
        self.client.set(self._key(key), pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL))

    def delete(self, key: str) -> None:
        self.client.delete(self._key(key))

    def clear(self) -> None:
        keys = list(self.client.scan_iter(match=f"{self.prefix}*", count=500))
        if keys:
            self.client.delete(*keys)

    def volume(self) -> int:
        return 0

    def __len__(self) -> int:
        return sum(1 for _ in self.client.scan_iter(match=f"{self.prefix}*", count=500))


def _disk_cache() -> Any:
    s = get_settings()
    try:
        os.makedirs(s.cache_dir, exist_ok=True)
        test_path = os.path.join(s.cache_dir, ".write_test")
        with open(test_path, "w") as f:
            f.write("ok")
        os.remove(test_path)
        from diskcache import Cache
        return Cache(s.cache_dir, size_limit=s.cache_max_size_bytes)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache directory %s unavailable (%s); cache disabled", s.cache_dir, type(exc).__name__)
        return _NoOpCache()


def _get_cache() -> Any:
    global _cache_instance, _cache_backend_name
    if _cache_instance is not None:
        return _cache_instance

    with _cache_lock:
        if _cache_instance is not None:
            return _cache_instance
        s = get_settings()
        if s.redis_url:
            try:
                _cache_instance = _RedisCache(s.redis_url)
                _cache_backend_name = "redis"
                logger.info("Cache initialised with Redis backend")
                return _cache_instance
            except Exception as exc:  # noqa: BLE001
                logger.warning("Redis cache unavailable (%s); falling back to disk cache", type(exc).__name__)
        _cache_instance = _disk_cache()
        _cache_backend_name = "diskcache" if not isinstance(_cache_instance, _NoOpCache) else "none"
        logger.info("Cache initialised with %s backend", _cache_backend_name)
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
    cache = _get_cache()
    try:
        cache.set(_key(source, query), (data, time.time()))
        with _stats_lock:
            _stats["sets"] += 1
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache write failed for %s: %s", source, type(exc).__name__)


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
            "backend": _cache_backend_name,
            "persistent": _cache_backend_name in {"redis", "diskcache"},
        }


def clear_all() -> int:
    cache = _get_cache()
    count = len(cache)
    cache.clear()
    return count
