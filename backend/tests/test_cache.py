"""Tests for the cache module."""
import time
import tempfile
import os
import pytest


def _make_cache(tmp_path):
    """Create a cache instance pointing at a temp directory."""
    import importlib
    # Patch settings before importing cache
    os.environ["CACHE_DIR"] = str(tmp_path / "cache")
    os.environ["CACHE_TTL_SECONDS"] = "10"
    os.environ["STALE_SERVE_TTL_SECONDS"] = "60"
    # Re-import with fresh settings
    import cache
    import importlib
    importlib.reload(cache)
    return cache


class TestCache:
    def test_miss_returns_none(self, tmp_path):
        c = _make_cache(tmp_path)
        assert c.get("amazon", "not stored") is None

    def test_set_then_get_fresh(self, tmp_path):
        c = _make_cache(tmp_path)
        c.set("amazon", "mouse", [{"title": "Mouse", "price": 299}])
        entry = c.get("amazon", "mouse")
        assert entry is not None
        assert entry.is_fresh is True

    def test_stats_track_hits(self, tmp_path):
        c = _make_cache(tmp_path)
        c.set("amazon", "mouse", [])
        c.get("amazon", "mouse")
        stats = c.get_stats()
        assert stats["hits_fresh"] >= 1

    def test_clear_empties_cache(self, tmp_path):
        c = _make_cache(tmp_path)
        c.set("amazon", "mouse", [])
        count = c.clear()
        assert count >= 1
        assert c.get("amazon", "mouse") is None
