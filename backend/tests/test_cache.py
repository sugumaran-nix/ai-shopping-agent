"""Tests for the cache module."""
import os
import time
import pytest


@pytest.fixture
def cache_mod(tmp_path, monkeypatch):
    """Return a freshly-initialised cache module pointing at a temp dir."""
    monkeypatch.setenv("CACHE_DIR", str(tmp_path / "cache"))
    monkeypatch.setenv("CACHE_TTL_SECONDS", "10")
    monkeypatch.setenv("STALE_SERVE_TTL_SECONDS", "60")
    monkeypatch.setenv("SCRAPERAPI_KEY", "test")
    monkeypatch.setenv("GEMINI_API_KEY", "test")

    import importlib
    import cache
    import config

    # Reset singletons so the temp path is used
    config.get_settings.cache_clear()
    cache._cache_instance = None

    importlib.reload(cache)
    yield cache

    # Cleanup
    cache._cache_instance = None
    config.get_settings.cache_clear()


class TestCache:
    def test_miss_returns_none(self, cache_mod):
        assert cache_mod.get("amazon", "not-stored") is None

    def test_store_then_get_fresh(self, cache_mod):
        cache_mod.store("amazon", "mouse", [{"title": "Mouse", "price": 299}])
        entry = cache_mod.get("amazon", "mouse")
        assert entry is not None
        assert entry.is_fresh is True
        assert entry.data[0]["title"] == "Mouse"

    def test_stats_track_fresh_hit(self, cache_mod):
        cache_mod.store("amazon", "mouse", [])
        cache_mod.get("amazon", "mouse")
        stats = cache_mod.get_stats()
        assert stats["hits_fresh"] >= 1

    def test_stats_track_miss(self, cache_mod):
        cache_mod.get("amazon", "nothing")
        stats = cache_mod.get_stats()
        assert stats["misses"] >= 1

    def test_clear_all_empties_cache(self, cache_mod):
        cache_mod.store("amazon", "mouse", [])
        count = cache_mod.clear_all()
        assert count >= 1
        assert cache_mod.get("amazon", "mouse") is None

    def test_age_seconds_increases(self, cache_mod):
        cache_mod.store("amazon", "shoes", [])
        entry = cache_mod.get("amazon", "shoes")
        assert entry is not None
        assert entry.age_seconds >= 0


class TestRedisAdapter:
    def test_round_trips_values(self, monkeypatch):
        import pickle
        import redis
        import cache

        class FakeRedis:
            values = {}

            def ping(self):
                return True

            def get(self, key):
                return self.values.get(key)

            def set(self, key, value):
                self.values[key] = value

            def delete(self, *keys):
                for key in keys:
                    self.values.pop(key, None)

            def scan_iter(self, match=None, count=None):
                prefix = match.removesuffix("*") if match else ""
                return iter([key for key in self.values if key.startswith(prefix)])

        fake = FakeRedis()
        monkeypatch.setattr(redis.Redis, "from_url", lambda *args, **kwargs: fake)
        adapter = cache._RedisCache("redis://example.test/0")
        adapter.set("key", ("value", 123.0))

        assert adapter.get("key") == ("value", 123.0)
        assert len(adapter) == 1
        adapter.delete("key")
        assert adapter.get("key") is None
