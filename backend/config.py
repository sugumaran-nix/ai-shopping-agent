"""
Centralized, validated configuration.

Every setting used to be scattered across modules as bare os.environ calls with
no validation - a missing key would surface as a confusing runtime error deep
inside a scraper instead of a clear startup failure. Loading it once, here,
with types and defaults fixes that.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Required for scraping to work at all
    scraperapi_key: str = ""
    gemini_api_key: str = ""

    # Optional - enables the eBay Browse API as a genuine, non-scraped source
    ebay_client_id: str = ""
    ebay_client_secret: str = ""

    # Cache
    cache_dir: str = ".cache"
    cache_ttl_seconds: int = 1800
    stale_serve_ttl_seconds: int = 21600

    # Scraping behaviour
    request_timeout_seconds: int = 15
    max_retries: int = 2
    concurrent_scrape_limit: int = 4

    # CORS - comma separated in the env var
    allowed_origins: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def ebay_enabled(self) -> bool:
        return bool(self.ebay_client_id and self.ebay_client_secret)

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
