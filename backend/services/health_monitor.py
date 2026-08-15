"""Canary health checks — one real search per source."""
from __future__ import annotations

import asyncio
import logging
import time

from models import HealthCheckResult, ScrapeStatus, Source, SourceResult
from scrapers.amazon import AmazonScraper
from scrapers.flipkart import FlipkartScraper
from scrapers.meesho import MeeshoScraper
from scrapers.myntra import MyntraScraper
from services.ebay_service import search_ebay

logger = logging.getLogger("health")

_SCRAPERS = [
    (AmazonScraper(),   "wireless mouse"),
    (FlipkartScraper(), "wireless mouse"),
    (MeeshoScraper(),   "kurti"),
    (MyntraScraper(),   "sneakers"),
]


async def _check(scraper, query: str) -> HealthCheckResult:
    t0 = time.monotonic()
    try:
        result: SourceResult = await scraper.search(query)
    except Exception as exc:  # noqa: BLE001
        result = SourceResult(source=scraper.source, status=ScrapeStatus.UNAVAILABLE, products=[], error=str(exc))
    elapsed = round((time.monotonic() - t0) * 1000)
    healthy = result.status == ScrapeStatus.FRESH and len(result.products) > 0
    logger.info("Health %s: %s | %d products | %dms",
                scraper.source.value, "OK" if healthy else "FAIL", len(result.products), elapsed)
    return HealthCheckResult(
        source=result.source,
        healthy=healthy,
        products_found=len(result.products),
        error=result.error,
    )


async def run_health_check() -> list[HealthCheckResult]:
    tasks = [_check(scraper, query) for scraper, query in _SCRAPERS]

    async def _ebay():
        t0 = time.monotonic()
        result = await search_ebay("wireless mouse")
        elapsed = round((time.monotonic() - t0) * 1000)
        healthy = result.status == ScrapeStatus.FRESH and len(result.products) > 0
        logger.info("Health ebay: %s | %d products | %dms", "OK" if healthy else "FAIL", len(result.products), elapsed)
        return HealthCheckResult(source=Source.EBAY, healthy=healthy, products_found=len(result.products), error=result.error)

    tasks.append(_ebay())
    return list(await asyncio.gather(*tasks))
