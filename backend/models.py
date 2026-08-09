"""
Strict data contracts.  Every scraped item must pass through Product()
before it reaches the cache, the AI, or the frontend.
Anything that fails validation is dropped — never patched or guessed at.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class Source(str, Enum):
    AMAZON   = "amazon"
    FLIPKART = "flipkart"
    AJIO     = "ajio"
    SNAPDEAL = "snapdeal"
    CROMA    = "croma"


class Status(str, Enum):
    FRESH       = "fresh"        # live scrape succeeded
    STALE       = "stale"        # live failed, serving cached result
    UNAVAILABLE = "unavailable"  # live failed, no usable cache


class Product(BaseModel):
    source:       Source
    title:        str
    price:        float          = Field(gt=0)
    original_price: Optional[float] = Field(default=None, gt=0)
    currency:     str            = "INR"
    discount_pct: Optional[int]  = Field(default=None, ge=0, le=100)
    rating:       Optional[float]= Field(default=None, ge=0, le=5)
    review_count: Optional[int]  = Field(default=None, ge=0)
    url:          str
    image_url:    Optional[str]  = None
    brand:        Optional[str]  = None
    fetched_at:   datetime       = Field(default_factory=datetime.utcnow)

    @field_validator("title")
    @classmethod
    def title_meaningful(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("title too short")
        return v

    @field_validator("url")
    @classmethod
    def url_absolute(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("url must be absolute")
        return v

    @model_validator(mode="after")
    def compute_discount(self) -> "Product":
        if (
            self.discount_pct is None
            and self.original_price
            and self.original_price > self.price
        ):
            self.discount_pct = round(
                (1 - self.price / self.original_price) * 100
            )
        return self


class SourceResult(BaseModel):
    source:   Source
    status:   Status
    products: list[Product]     = Field(default_factory=list)
    error:    Optional[str]     = None


class SearchResponse(BaseModel):
    query:              str
    results:            list[SourceResult]
    ai_recommendation:  Optional[str] = None
    ai_error:           Optional[str] = None
    total_products:     int           = 0

    @model_validator(mode="after")
    def compute_total(self) -> "SearchResponse":
        self.total_products = sum(len(r.products) for r in self.results)
        return self
