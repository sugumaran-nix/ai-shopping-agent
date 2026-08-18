"""Centralized, validated application configuration."""
from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Optional server-side provider credentials. Users may override these per request.
    scraperapi_key: str = ""
    scrapingant_api_key: str = ""
    brightdata_api_key: str = ""
    brightdata_zone: str = "web_unlocker1"

    # CORS
    allowed_origins: str = "http://localhost:3000"

    # Cache
    cache_dir: str = ".cache"
    redis_url: str = ""
    cache_ttl_seconds: int = 1800
    stale_serve_ttl_seconds: int = 21600
    cache_max_size_bytes: int = 500_000_000

    # Scraping
    request_timeout_seconds: int = 20
    max_retries: int = 1
    concurrent_scrape_limit: int = 4

    # Observability
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
        if not self.scrapingant_api_key and not self.brightdata_api_key:
            logging.getLogger("config").warning(
                "No scraping provider key configured; live marketplace results may be unavailable."
            )
        if self.environment == "production" and self.allowed_origins == "http://localhost:3000":
            logging.getLogger("config").error(
                "ALLOWED_ORIGINS is still localhost in production — CORS will block browser requests."
            )
        else:
            logging.getLogger("config").info("CORS allowed origins: %s", self.allowed_origins)
        return self

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
