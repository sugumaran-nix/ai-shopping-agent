"""
Two-tier persistent cache (diskcache).

- Fresh  (≤ cache_ttl_seconds):   serve without hitting the network
- Stale  (≤ stale_ttl_seconds):   network failed → serve old real data,
                                   labeled STALE
- Expired / missing:               network failed → UNAVAILABLE

Nothing here ever stores placeholder or synthetic data.
"""
from __future__ import annotations
import hashlib
import time
from dataclasses import dataclass
from typing import Any, Optional

from diskcache import Cache
from config import get_settings

_settings = get_settings()
_cache    = Cache(_settings.cache_dir)


def _key(source: str, query: str) -> str:
    h = hashlib.sha256(query.strip().lower().encode()).hexdigest()
    return f"{source}:{h}"


@dataclass
class CacheEntry:
    data:     Any
    age:      float   # seconds since stored
    is_fresh: bool


def get(source: str, query: str) -> Optional[CacheEntry]:
    record = _cache.get(_key(source, query))
    if record is None:
        return None
    data, stored_at = record
    age = time.time() - stored_at
    if age > _settings.stale_ttl_seconds:
        _cache.delete(_key(source, query))
        return None
    return CacheEntry(
        data=data,
        age=age,
        is_fresh=age <= _settings.cache_ttl_seconds,
    )


def set(source: str, query: str, data: Any) -> None:
    _cache.set(_key(source, query), (data, time.time()))
