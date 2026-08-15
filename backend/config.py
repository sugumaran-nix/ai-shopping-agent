"""Centralized, validated application configuration."""
from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Required ───────────────────────────────────────────────────────────
    scraperapi_key: str = ""
    gemini_api_key: str = ""

    # ── Optional ───────────────────────────────────────────────────────────
    ebay_client_id: str = ""
    ebay_client_secret: str = ""

    # ── CORS ───────────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000"

    # ── Cache ──────────────────────────────────────────────────────────────
    cache_dir: str = ".cache"
    cache_ttl_seconds: int = 1800
    stale_serve_ttl_seconds: int = 21600
    cache_max_size_bytes: int = 500_000_000

    # ── Scraping ───────────────────────────────────────────────────────────
    # Note: actual timeouts are set per-request in http_client.py
    # (20s for plain HTML, 60s for JS rendering)
    request_timeout_seconds: int = 20
    max_retries: int = 1          # reduced — retrying slow JS scrapers wastes time
    concurrent_scrape_limit: int = 4

    # ── AI ─────────────────────────────────────────────────────────────────
    gemini_model: str = "gemini-2.0-flash"
    ai_max_products_per_source: int = 10
    ai_request_timeout_seconds: int = 30

    # ── Observability ──────────────────────────────────────────────────────
    log_level: str = "INFO"
    environment: str = "development"

    @field_validator("cache_ttl_seconds", "stale_serve_ttl_seconds", "request_timeout_seconds")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("must be a positive integer")
        return v

    @model_validator(mode="after")
    def warn_on_startup(self) -> "Settings":
        missing = [k for k, v in [
            ("SCRAPERAPI_KEY", self.scraperapi_key),
            ("GEMINI_API_KEY", self.gemini_api_key),
        ] if not v]
        if missing:
            logging.getLogger("config").warning(
                "Missing env vars: %s — some features will be unavailable.", ", ".join(missing)
            )
        if self.environment == "production" and self.allowed_origins == "http://localhost:3000":
            logging.getLogger("config").error(
                "ALLOWED_ORIGINS is still localhost in production — CORS will block all browser requests."
            )
        else:
            logging.getLogger("config").info("CORS allowed origins: %s", self.allowed_origins)
        return self

    @property
    def allowed_origins_list(self) -> list[str]:
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
