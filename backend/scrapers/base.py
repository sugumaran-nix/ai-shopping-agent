"""
BaseScraper: the shared scrape → validate → cache → fallback flow.

Each subclass only implements:
  - build_search_url(query) → str
  - parse(html) → list[dict]

Everything else (retry on error, Pydantic validation, fresh/stale/unavailable
classification, caching) is handled here once and applies uniformly.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

import cache as cache_module
from models import Product, ScrapeStatus, Source, SourceResult
from utils.http_client import FetchError, fetch_html

logger = logging.getLogger("scraper.base")


class BaseScraper(ABC):
    source: Source
    render_js: bool = False

    @abstractmethod
    def build_search_url(self, query: str) -> str:
        """Return the fully-formed search URL for this site."""

    @abstractmethod
    def parse(self, html: str) -> list[dict]:
        """
        Parse raw HTML into a list of dicts with keys matching the `Product`
        model. Do NOT construct `Product` objects here — validation is
        centralised in `search()` so every scraper is held to the same
        standard and failures are handled uniformly.
        """

    async def search(self, query: str) -> SourceResult:
        """
        Live scrape with full fresh/stale/unavailable fallback.
        Never raises — always returns a SourceResult.
        """
        cached = cache_module.get(self.source.value, query)

        try:
            url = self.build_search_url(query)
            html = await fetch_html(url, render_js=self.render_js)
            raw_products = self.parse(html)

            validated: list[Product] = []
            rejected = 0
            for raw in raw_products:
                try:
                    validated.append(Product(source=self.source, **raw))
                except Exception as exc:  # noqa: BLE001
                    rejected += 1
                    logger.debug("%s: dropped product during validation: %s", self.source.value, exc)

            if rejected:
                logger.warning(
                    "%s: dropped %d/%d items that failed validation",
                    self.source.value, rejected, len(raw_products),
                )

            if not validated:
                raise FetchError(
                    f"{self.source.value}: parsed 0 valid products "
                    f"(selectors may be out of date, or the page layout changed)"
                )

            cache_module.set(
                self.source.value, query,
                [p.model_dump(mode="json") for p in validated]
            )
            return SourceResult(
                source=self.source,
                status=ScrapeStatus.FRESH,
                products=validated,
            )

        except FetchError as exc:
            logger.error("%s: live scrape failed: %s", self.source.value, exc)
            if cached:
                freshness = "fresh" if cached.is_fresh else "stale"
                logger.info(
                    "%s: serving %s cache (age %.0fs)",
                    self.source.value, freshness, cached.age_seconds,
                )
                products = []
                for p in cached.data:
                    try:
                        products.append(Product(**p))
                    except Exception:  # noqa: BLE001
                        pass  # corrupted cache entry — skip
                return SourceResult(
                    source=self.source,
                    status=ScrapeStatus.STALE,
                    products=products,
                    error=str(exc),
                )
            return SourceResult(
                source=self.source,
                status=ScrapeStatus.UNAVAILABLE,
                products=[],
                error=str(exc),
            )
        except Exception as exc:  # noqa: BLE001
            # Catch-all so one broken scraper never kills the whole aggregation
            logger.exception("%s: unexpected error: %s", self.source.value, exc)
            if cached:
                products = []
                for p in cached.data:
                    try:
                        products.append(Product(**p))
                    except Exception:  # noqa: BLE001
                        pass
                return SourceResult(
                    source=self.source,
                    status=ScrapeStatus.STALE,
                    products=products,
                    error=f"Unexpected error: {type(exc).__name__}",
                )
            return SourceResult(
                source=self.source,
                status=ScrapeStatus.UNAVAILABLE,
                products=[],
                error=f"Unexpected error: {type(exc).__name__}",
            )
