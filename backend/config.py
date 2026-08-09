"""
Central configuration — no API keys required.
The app runs entirely free with zero external API dependencies.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Cache
    cache_dir:         str = "/tmp/.cache"
    cache_ttl_seconds: int = 1800
    stale_ttl_seconds: int = 21600

    # HTTP
    request_timeout: int = 20
    max_retries:     int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()
