"""
Centralized, validated application configuration.

All settings are read from environment variables (or a .env file in dev).
"""
from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("config")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Required ───────────────────────────────────────────────────────────
    scraperapi_key: str = ""
    gemini_api_key: str = ""

    # ── Optional: eBay Browse API ──────────────────────────────────────────
    ebay_client_id: str = ""
    ebay_client_secret: str = ""

    # ── CORS ───────────────────────────────────────────────────────────────
    # Comma-separated list of allowed frontend origins.
    # In production on Render, set this to your Vercel URL, e.g.:
    #   ALLOWED_ORIGINS=https://ai-shopping-agent.vercel.app
    # For local dev the default covers localhost:3000.
    # "*" is intentionally NOT supported — we always require explicit origins.
    allowed_origins: str = "http://localhost:3000"

    # ── Cache ──────────────────────────────────────────────────────────────
    cache_dir: str = ".cache"
    cache_ttl_seconds: int = 1800
    stale_serve_ttl_seconds: int = 21600
    cache_max_size_bytes: int = 500_000_000

    # ── Scraping ───────────────────────────────────────────────────────────
    request_timeout_seconds: int = 15
    max_retries: int = 2
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
            logger.warning(
                "Missing env vars: %s — some features will be unavailable.",
                ", ".join(missing),
            )

        # Loudly warn if ALLOWED_ORIGINS looks like it hasn't been set for production
        if self.environment == "production" and self.allowed_origins == "http://localhost:3000":
            logger.error(
                "ALLOWED_ORIGINS is still set to localhost in a production environment! "
                "Set ALLOWED_ORIGINS to your Vercel URL in the Render dashboard. "
                "CORS will block all browser requests."
            )
        else:
            logger.info("CORS allowed origins: %s", self.allowed_origins)

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
