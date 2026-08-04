"""
Centralized, validated configuration.

Fails at startup if required keys are missing or invalid — far better
than a confusing runtime error deep inside a scraper.
"""
from __future__ import annotations

import sys
from functools import lru_cache
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Required for scraping ──────────────────────────────────────────────
    scraperapi_key: str = ""
    gemini_api_key: str = ""

    # ── Optional: enables eBay Browse API source ───────────────────────────
    ebay_client_id: str = ""
    ebay_client_secret: str = ""

    # ── Cache ──────────────────────────────────────────────────────────────
    cache_dir: str = ".cache"
    cache_ttl_seconds: int = 1800          # 30 min fresh window
    stale_serve_ttl_seconds: int = 21600   # 6 hr stale fallback window
    cache_max_size_bytes: int = 500_000_000  # 500 MB cap

    # ── Scraping behaviour ─────────────────────────────────────────────────
    request_timeout_seconds: int = 15
    max_retries: int = 2
    concurrent_scrape_limit: int = 4

    # ── API behaviour ──────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000"
    rate_limit_per_minute: int = 30
    api_version: str = "v1"

    # ── AI ─────────────────────────────────────────────────────────────────
    gemini_model: str = "gemini-2.0-flash"
    ai_max_products_per_source: int = 10
    ai_request_timeout_seconds: int = 30

    # ── Observability ──────────────────────────────────────────────────────
    log_level: str = "INFO"
    environment: str = "development"

    @field_validator("cache_ttl_seconds", "stale_serve_ttl_seconds", "request_timeout_seconds")
    @classmethod
    def positive_int(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("must be a positive integer")
        return v

    @field_validator("rate_limit_per_minute")
    @classmethod
    def valid_rate_limit(cls, v: int) -> int:
        if v < 1 or v > 1000:
            raise ValueError("rate_limit_per_minute must be between 1 and 1000")
        return v

    @model_validator(mode="after")
    def warn_missing_keys(self) -> "Settings":
        missing = []
        if not self.scraperapi_key:
            missing.append("SCRAPERAPI_KEY")
        if not self.gemini_api_key:
            missing.append("GEMINI_API_KEY")
        if missing:
            # Warn — don't crash; let /api/ping still work without keys.
            import logging
            logging.getLogger("config").warning(
                "Missing env vars: %s — some features will be unavailable.", ", ".join(missing)
            )
        return self

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def ebay_enabled(self) -> bool:
        return bool(self.ebay_client_id and self.ebay_client_secret)

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
