"""
Centralized, validated application configuration.

All settings are read from environment variables (or a .env file in dev).
The app warns loudly at startup if required keys are missing rather than
failing silently inside a scraper minutes later.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Required ───────────────────────────────────────────────────────────
    scraperapi_key: str = ""
    gemini_api_key: str = ""

    # ── Optional: eBay Browse API ──────────────────────────────────────────
    ebay_client_id: str = ""
    ebay_client_secret: str = ""

    # ── Cache ──────────────────────────────────────────────────────────────
    cache_dir: str = ".cache"
    cache_ttl_seconds: int = 1800         # 30 min — serve from cache
    stale_serve_ttl_seconds: int = 21600  # 6 hr  — serve stale as fallback
    cache_max_size_bytes: int = 500_000_000  # 500 MB cap

    # ── Scraping ───────────────────────────────────────────────────────────
    request_timeout_seconds: int = 15
    max_retries: int = 2
    concurrent_scrape_limit: int = 4

    # ── API ────────────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000"
    rate_limit_per_minute: int = 30

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

    @field_validator("rate_limit_per_minute")
    @classmethod
    def valid_rate_limit(cls, v: int) -> int:
        if not 1 <= v <= 1000:
            raise ValueError("must be between 1 and 1000")
        return v

    @model_validator(mode="after")
    def warn_missing_keys(self) -> "Settings":
        import logging
        missing = [k for k, v in [
            ("SCRAPERAPI_KEY", self.scraperapi_key),
            ("GEMINI_API_KEY", self.gemini_api_key),
        ] if not v]
        if missing:
            logging.getLogger("config").warning(
                "Missing env vars: %s — some features will be unavailable.", ", ".join(missing)
            )
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
