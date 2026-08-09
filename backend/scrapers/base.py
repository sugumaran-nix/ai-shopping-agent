"""
BaseScraper — the only place where the scrape → validate → cache →
stale-fallback flow lives.  Subclasses implement two methods only:
  • build_url(query)  → str
  • parse(html/data)  → list[dict]  (raw, pre-validation dicts)

Every dict must contain at minimum: title, price, url.
Anything that fails Product() validation is dropped, counted, and logged.
"""
from __future__ import annotations
import logging
from abc import ABC, abstractmethod

import cache as cache_module
from models import Product, Source, Status, SourceResult
from utils.http_client import FetchError, fetch_html

log = logging.getLogger("scraper")


class BaseScraper(ABC):
    source: Source

    @abstractmethod
    def build_url(self, query: str) -> str: ...

    @abstractmethod
    def parse(self, content: str) -> list[dict]: ...

    async def _fetch(self, url: str) -> str:
        return await fetch_html(url)

    async def search(self, query: str) -> SourceResult:
        cached = cache_module.get(self.source.value, query)

        # Serve from fresh cache — skip network entirely
        if cached and cached.is_fresh:
            products = [Product(**p) for p in cached.data]
            log.info("%s: cache hit (%d products)", self.source.value, len(products))
            return SourceResult(source=self.source, status=Status.FRESH, products=products)

        # Attempt live scrape
        try:
            url  = self.build_url(query)
            html = await self._fetch(url)
            raw  = self.parse(html)

            validated, dropped = [], 0
            for item in raw:
                try:
                    validated.append(
                        Product(source=self.source, **item)
                    )
                except Exception:
                    dropped += 1

            if dropped:
                log.warning("%s: dropped %d/%d items (validation failed)",
                            self.source.value, dropped, len(raw))

            if not validated:
                raise FetchError(
                    f"{self.source.value}: 0 valid products parsed "
                    f"(selectors may need updating)"
                )

            cache_module.set(
                self.source.value, query,
                [p.model_dump(mode="json") for p in validated]
            )
            log.info("%s: live scrape OK (%d products)", self.source.value, len(validated))
            return SourceResult(source=self.source, status=Status.FRESH, products=validated)

        except FetchError as exc:
            log.error("%s: %s", self.source.value, exc)

            # Stale fallback — real old data beats no data
            if cached:
                products = [Product(**p) for p in cached.data]
                log.warning("%s: serving stale cache (%d products)", self.source.value, len(products))
                return SourceResult(
                    source=self.source,
                    status=Status.STALE,
                    products=products,
                    error=str(exc),
                )

            return SourceResult(
                source=self.source,
                status=Status.UNAVAILABLE,
                products=[],
                error=str(exc),
            )
