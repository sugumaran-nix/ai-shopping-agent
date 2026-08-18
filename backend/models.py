"""
Data contracts.

`Product` is the gate every scraped item must pass before it is
cached, shown, or sent to the AI. Anything that fails is dropped, not patched.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Source(str, Enum):
    AMAZON = "amazon"
    FLIPKART = "flipkart"
    MEESHO = "meesho"
    MYNTRA = "myntra"
    JIOMART = "jiomart"


class ScrapeStatus(str, Enum):
    FRESH = "fresh"
    STALE = "stale"
    UNAVAILABLE = "unavailable"


class Product(BaseModel):
    source: Source
    title: str
    price: float = Field(gt=0, lt=10_000_000)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    review_count: Optional[int] = Field(default=None, ge=0)
    url: str
    image_url: Optional[str] = None
    fetched_at: datetime = Field(default_factory=_utcnow)

    @field_validator("title")
    @classmethod
    def title_must_be_meaningful(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("title too short to be a real product name")
        if len(v) > 500:
            raise ValueError("title suspiciously long — likely a parsing error")
        return v

    @field_validator("url")
    @classmethod
    def url_must_look_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("product url is not a valid absolute URL")
        if len(v) > 2000:
            raise ValueError("URL too long")
        return v

    @field_validator("image_url")
    @classmethod
    def image_url_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not v.startswith(("http://", "https://", "//")):
            return None
        return v or None


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
    request_id: Optional[str] = None


class HealthCheckResult(BaseModel):
    source: Source
    healthy: bool
    products_found: int
    error: Optional[str] = None
    checked_at: datetime = Field(default_factory=_utcnow)


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
