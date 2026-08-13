"""
Canary health checks.

Runs one real, representative search per scraper and reports whether
it returned any validated products.

Wire to a scheduled job (e.g. Render cron every 6h) that hits
GET /api/v1/health and alerts on failures. Do NOT use this endpoint
as a load-balancer health check — use /api/ping instead.
"""
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

# Popular, stable queries likely to return results from each source
_CANARY_QUERIES: dict[str, str] = {
    "amazon": "wireless mouse",
    "flipkart": "wireless mouse",
    "meesho": "kurti",     # Meesho skews toward fashion
    "myntra": "sneakers",  # Myntra skews toward fashion/footwear
}

_SCRAPERS = {
    "amazon": AmazonScraper(),
    "flipkart": FlipkartScraper(),
    "meesho": MeeshoScraper(),
    "myntra": MyntraScraper(),
}


async def _check_one(name: str, scraper) -> HealthCheckResult:
    query = _CANARY_QUERIES.get(name, "wireless mouse")
    t0 = time.monotonic()
    try:
        result: SourceResult = await scraper.search(query)
    except Exception as exc:  # noqa: BLE001
        logger.error("Health check for %s raised: %s", name, exc)
        result = SourceResult(
            source=scraper.source,
            status=ScrapeStatus.UNAVAILABLE,
            products=[],
            error=str(exc),
        )
    elapsed = round((time.monotonic() - t0) * 1000)
    healthy = result.status == ScrapeStatus.FRESH and len(result.products) > 0
    logger.info(
        "Health %s: %s | %d products | %dms",
        name, "OK" if healthy else "FAIL", len(result.products), elapsed,
    )
    return HealthCheckResult(
        source=result.source,
        healthy=healthy,
        products_found=len(result.products),
        error=result.error,
    )


async def run_health_check() -> list[HealthCheckResult]:
    tasks = [_check_one(name, scraper) for name, scraper in _SCRAPERS.items()]

    # eBay health check
    async def _ebay_check() -> HealthCheckResult:
        t0 = time.monotonic()
        result = await search_ebay("wireless mouse")
        elapsed = round((time.monotonic() - t0) * 1000)
        healthy = result.status == ScrapeStatus.FRESH and len(result.products) > 0
        logger.info("Health ebay: %s | %d products | %dms", "OK" if healthy else "FAIL", len(result.products), elapsed)
        return HealthCheckResult(
            source=Source.EBAY,
            healthy=healthy,
            products_found=len(result.products),
            error=result.error,
        )

    tasks.append(_ebay_check())
    return await asyncio.gather(*tasks)
