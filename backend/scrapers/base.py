"""
BaseScraper centralizes the behaviour every site-specific scraper needs:

  1. Try a live scrape.
  2. Validate every parsed product through the Pydantic model - anything
     malformed is dropped, never patched or guessed at.
  3. On success, cache the validated results and return them as FRESH.
  4. On failure (network error, selectors found nothing, site layout
     changed), fall back to the last real cached result and return it as
     STALE - clearly labeled, never silently mixed with fresh data.
  5. If there's no usable cache either, return UNAVAILABLE with the
     specific error, instead of an empty list that looks like "no results"
     when it actually means "we couldn't check."

Each subclass only implements `build_search_url()` and `parse(html)`.
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
    render_js: bool = False  # set True in subclasses whose results are JS-rendered

    @abstractmethod
    def build_search_url(self, query: str) -> str:
        """Return the fully-formed search URL for this site."""

    @abstractmethod
    def parse(self, html: str) -> list[dict]:
        """
        Parse raw HTML into a list of dicts with keys matching the `Product`
        model. Do NOT construct `Product` objects here - validation happens
        centrally in `search()` so every scraper is held to the same
        standard and failures are handled uniformly.
        """

    async def search(self, query: str) -> SourceResult:
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
                except Exception:  # noqa: BLE001 - deliberately broad: any bad record is dropped
                    rejected += 1

            if rejected:
                logger.warning(
                    "%s: dropped %d/%d parsed items that failed validation",
                    self.source.value, rejected, len(raw_products),
                )

            if not validated:
                # The page loaded but selectors matched nothing usable - almost
                # always means the site's layout changed. Treat as a failure,
                # not as "zero products exist", and fall back to cache below.
                raise FetchError(
                    f"{self.source.value}: parsed 0 valid products "
                    f"(selectors may be out of date for this page layout)"
                )

            cache_module.set(self.source.value, query, [p.model_dump(mode="json") for p in validated])
            return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=validated)

        except FetchError as exc:
            logger.error("%s: live scrape failed: %s", self.source.value, exc)
            if cached:
                products = [Product(**p) for p in cached.data]
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
