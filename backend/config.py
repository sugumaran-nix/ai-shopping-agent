from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    gemini_api_key: str
    scraper_api_key: str
    allowed_origins: List[str] = ["http://localhost:3000"]
    rate_limit_per_minute: int = 10
    cache_ttl_seconds: int = 600  # 10 minutes

    class Config:
        env_file = ".env"

settings = Settings()
