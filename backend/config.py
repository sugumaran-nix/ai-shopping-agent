   from pydantic_settings import BaseSettings

   class Settings(BaseSettings):
       gemini_api_key: str
       scraper_api_key: str
       allowed_origins: str = "*"
       rate_limit_per_minute: int = 10
       cache_ttl_seconds: int = 600

       class Config:
           env_file = ".env"

   settings = Settings()
