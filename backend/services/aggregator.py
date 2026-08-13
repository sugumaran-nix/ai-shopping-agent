"""
Runs every source concurrently (bounded by CONCURRENT_SCRAPE_LIMIT),
collects results, and hands the combined picture to the AI service.

Changes vs. original:
  - Semaphore is created fresh each call (no shared-instance concurrency issue)
  - Each scraper task is individually exception-safe (one failure can't
    cancel sibling tasks)
  - eBay is only included when the service is actually configured
  - Basic timing logged per source
"""
from __future__ import annotations

import asyncio
import logging
import time

from config import get_settings
from models import SearchResponse, ScrapeStatus, Source, SourceResult
from scrapers.amazon import AmazonScraper
from scrapers.flipkart import FlipkartScraper
from scrapers.meesho import MeeshoScraper
from scrapers.myntra import MyntraScraper
from services.ai_service import generate_recommendation
from services.ebay_service import search_ebay

logger = logging.getLogger("aggregator")
settings = get_settings()

# Instantiate scrapers once at module level (they are stateless)
_SCRAPERS = [
    AmazonScraper(),
    FlipkartScraper(),
    MeeshoScraper(),
    MyntraScraper(),
]


async def _bounded_search(scraper, query: str, sem: asyncio.Semaphore) -> SourceResult:
    """Run one scraper with timing logged, inside the shared semaphore."""
    async with sem:
        t0 = time.monotonic()
        try:
            result = await scraper.search(query)
        except Exception as exc:  # noqa: BLE001 — belt-and-suspenders
            logger.exception("Scraper %s raised unexpectedly: %s", scraper.source.value, exc)
            result = SourceResult(
                source=scraper.source,
                status=ScrapeStatus.UNAVAILABLE,
                products=[],
                error=f"Unexpected error: {type(exc).__name__}",
            )
        elapsed = round((time.monotonic() - t0) * 1000)
        logger.info(
            "%s: %s, %d products (%dms)",
            scraper.source.value, result.status.value, len(result.products), elapsed,
        )
        return result


async def search_all_sources(query: str) -> list[SourceResult]:
    sem = asyncio.Semaphore(settings.concurrent_scrape_limit)

    tasks = [_bounded_search(scraper, query, sem) for scraper in _SCRAPERS]

    if settings.ebay_enabled:
        async def _ebay():
            async with sem:
                return await search_ebay(query)
        tasks.append(_ebay())

    return await asyncio.gather(*tasks)


async def run_search(query: str) -> SearchResponse:
    t0 = time.monotonic()
    results = await search_all_sources(query)
    elapsed = round((time.monotonic() - t0) * 1000)

    fresh_count = sum(1 for r in results if r.status == ScrapeStatus.FRESH)
    logger.info(
        "search '%s': %d/%d sources fresh (%dms)",
        query[:50], fresh_count, len(results), elapsed,
    )

    recommendation, ai_error = await generate_recommendation(query, results)
    return SearchResponse(
        query=query,
        results=results,
        ai_recommendation=recommendation,
        ai_error=ai_error,
    )
