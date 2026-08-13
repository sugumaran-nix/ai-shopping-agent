"""
BaseScraper — the shared scrape → validate → cache → fallback pipeline.

Subclasses implement only:
  build_search_url(query) → str
  parse(html)             → list[dict]

Everything else — fetching, validation, caching, fresh/stale/unavailable
classification — is handled once here and applies uniformly to every scraper.
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
        """Return the fully-formed search URL for this marketplace."""

    @abstractmethod
    def parse(self, html: str) -> list[dict]:
        """
        Parse raw HTML into a list of raw product dicts.
        Keys must match the Product model fields.
        Do NOT construct Product objects here — validation happens in search().
        """

    async def search(self, query: str) -> SourceResult:
        """
        Run a live scrape with fresh/stale/unavailable fallback.
        Never raises — always returns a SourceResult.
        """
        cached = cache_module.get(self.source.value, query)

        try:
            url = self.build_search_url(query)
            html = await fetch_html(url, render_js=self.render_js)
            raw_items = self.parse(html)

            validated: list[Product] = []
            rejected = 0
            for raw in raw_items:
                try:
                    validated.append(Product(source=self.source, **raw))
                except Exception as exc:  # noqa: BLE001
                    rejected += 1
                    logger.debug("%s: dropped item (validation): %s", self.source.value, exc)

            if rejected:
                logger.warning(
                    "%s: dropped %d/%d items that failed validation",
                    self.source.value, rejected, len(raw_items),
                )

            if not validated:
                raise FetchError(
                    f"{self.source.value}: 0 valid products returned "
                    f"(selectors may be stale — check /api/v1/health)"
                )

            cache_module.store(
                self.source.value, query,
                [p.model_dump(mode="json") for p in validated],
            )
            return SourceResult(
                source=self.source,
                status=ScrapeStatus.FRESH,
                products=validated,
            )

        except FetchError as exc:
            logger.error("%s: scrape failed: %s", self.source.value, exc)
            return self._from_cache_or_unavailable(cached, str(exc))

        except Exception as exc:  # noqa: BLE001
            logger.exception("%s: unexpected error", self.source.value)
            return self._from_cache_or_unavailable(
                cached, f"Unexpected error: {type(exc).__name__}"
            )

    def _from_cache_or_unavailable(
        self, cached: cache_module.CacheEntry | None, error: str
    ) -> SourceResult:
        if cached:
            logger.info(
                "%s: serving %s cache (age %.0fs)",
                self.source.value,
                "fresh" if cached.is_fresh else "stale",
                cached.age_seconds,
            )
            products = []
            for p in cached.data:
                try:
                    products.append(Product(**p))
                except Exception:  # noqa: BLE001
                    pass  # skip corrupted cache entries
            return SourceResult(
                source=self.source,
                status=ScrapeStatus.STALE,
                products=products,
                error=error,
            )
        return SourceResult(
            source=self.source,
            status=ScrapeStatus.UNAVAILABLE,
            products=[],
            error=error,
        )
