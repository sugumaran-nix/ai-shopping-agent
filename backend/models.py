"""
Data contracts.

The old scraper had no validation step: whatever BeautifulSoup pulled out of a
malformed or A/B-tested page went straight to the frontend and into the Gemini
prompt. That's the direct cause of "false info" - a price scraped from the
wrong <span>, a title that's actually a banner ad, etc.

`Product.validated()` is the gate every scraped item must pass through before
it is cached, shown, or sent to the AI. Anything that fails is dropped, not
patched or guessed at.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class Source(str, Enum):
    AMAZON = "amazon"
    FLIPKART = "flipkart"
    MEESHO = "meesho"
    MYNTRA = "myntra"
    EBAY = "ebay"  # real API-backed source, not scraped


class ScrapeStatus(str, Enum):
    FRESH = "fresh"        # scraped successfully just now
    STALE = "stale"        # scrape failed, serving last-known-good cache
    UNAVAILABLE = "unavailable"  # scrape failed and no usable cache exists


class Product(BaseModel):
    source: Source
    title: str
    price: float = Field(gt=0)
    currency: str = "INR"
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    review_count: Optional[int] = Field(default=None, ge=0)
    url: str
    image_url: Optional[str] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("title")
    @classmethod
    def title_must_be_meaningful(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("title too short to be a real product name")
        return v

    @field_validator("url")
    @classmethod
    def url_must_look_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("product url is not a valid absolute URL")
        return v


class SourceResult(BaseModel):
    source: Source
    status: ScrapeStatus
    products: list[Product] = Field(default_factory=list)
    error: Optional[str] = None
    fetched_at: Optional[datetime] = None


class SearchResponse(BaseModel):
    query: str
    results: list[SourceResult]
    ai_recommendation: Optional[str] = None
    ai_error: Optional[str] = None


class HealthCheckResult(BaseModel):
    source: Source
    healthy: bool
    products_found: int
    error: Optional[str] = None
    checked_at: datetime = Field(default_factory=datetime.utcnow)
