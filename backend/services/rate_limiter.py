"""Small fixed-window limiter for public API routes.

The Render service runs one worker, so an in-process limiter is appropriate as a
baseline safeguard. Redis-backed deployments can replace this with a shared
limiter if the service is scaled horizontally.
"""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from config import get_settings


_buckets: dict[str, deque[float]] = defaultdict(deque)
_lock = asyncio.Lock()


async def allow_request(key: str) -> tuple[bool, int]:
    """Return ``(allowed, retry_after_seconds)`` for one fixed-window request."""
    settings = get_settings()
    now = time.monotonic()
    window = settings.rate_limit_window_seconds
    limit = settings.rate_limit_max_requests

    async with _lock:
        bucket = _buckets[key]
        cutoff = now - window
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(bucket[0] + window - now) + 1)
            return False, retry_after

        bucket.append(now)
        # Prevent unbounded memory growth if many clients scan once and leave.
        if len(_buckets) > 10_000:
            stale_keys = [name for name, values in _buckets.items() if not values or values[-1] <= cutoff]
            for stale_key in stale_keys[:2_000]:
                _buckets.pop(stale_key, None)
        return True, 0


def reset_rate_limits() -> None:
    """Clear limiter state for tests and controlled maintenance."""
    _buckets.clear()
