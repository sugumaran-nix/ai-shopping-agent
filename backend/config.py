from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    gemini_api_key: str
    scraper_api_key: Optional[str] = None  # Optional — scrapers fall back gracefully if not set
    allowed_origins: str = "*"
    rate_limit_per_minute: int = 10
    cache_ttl_seconds: int = 600

    class Config:
        env_file = ".env"

settings = Settings()
