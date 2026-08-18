"""Canary health checks — one real search per source."""
from __future__ import annotations

import asyncio
import logging
import time

from models import HealthCheckResult, ScrapeStatus, SourceResult
from scrapers.amazon import AmazonScraper
from scrapers.flipkart import FlipkartScraper
from scrapers.meesho import MeeshoScraper
from scrapers.myntra import MyntraScraper
from scrapers.jiomart import JiomartScraper

logger = logging.getLogger("health")

_SCRAPERS = [
    (AmazonScraper(),   "wireless mouse"),
    (FlipkartScraper(), "wireless mouse"),
    (MeeshoScraper(),   "kurti"),
    (MyntraScraper(),   "sneakers"),
    (JiomartScraper(),   "wireless mouse"),
]


async def _check(scraper, query: str) -> HealthCheckResult:
    t0 = time.monotonic()
    try:
        result: SourceResult = await scraper.search(query)
    except Exception as exc:  # noqa: BLE001
        result = SourceResult(source=scraper.source, status=ScrapeStatus.UNAVAILABLE,
                              products=[], error=str(exc))
    elapsed = round((time.monotonic() - t0) * 1000)
    healthy = result.status == ScrapeStatus.FRESH and len(result.products) > 0
    logger.info("Health %s: %s | %d products | %dms",
                scraper.source.value, "OK" if healthy else "FAIL",
                len(result.products), elapsed)
    return HealthCheckResult(
        source=result.source,
        healthy=healthy,
        products_found=len(result.products),
        error=result.error,
    )


async def run_health_check() -> list[HealthCheckResult]:
    return list(await asyncio.gather(*[_check(s, q) for s, q in _SCRAPERS]))
