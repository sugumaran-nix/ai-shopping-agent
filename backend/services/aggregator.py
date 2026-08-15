"""Runs every source concurrently and collects results."""
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

_SCRAPERS = [
    AmazonScraper(),
    FlipkartScraper(),
    MeeshoScraper(),
    MyntraScraper(),
]


async def _run_one(scraper, query: str, sem: asyncio.Semaphore) -> SourceResult:
    async with sem:
        t0 = time.monotonic()
        try:
            result = await scraper.search(query)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Scraper %s raised: %s", scraper.source.value, exc)
            result = SourceResult(
                source=scraper.source,
                status=ScrapeStatus.UNAVAILABLE,
                products=[],
                error=str(exc),
            )
        elapsed = round((time.monotonic() - t0) * 1000)
        logger.info("%s: %s, %d products (%dms)",
                    scraper.source.value, result.status.value, len(result.products), elapsed)
        return result


async def run_search(
    query: str,
    user_gemini_key: str | None = None,
    user_scraperapi_key: str | None = None,
) -> SearchResponse:
    sem = asyncio.Semaphore(settings.concurrent_scrape_limit)
    tasks = [_run_one(s, query, sem) for s in _SCRAPERS]

    if settings.ebay_enabled:
        async def _ebay():
            async with sem:
                return await search_ebay(query)
        tasks.append(_ebay())

    t0 = time.monotonic()
    results = list(await asyncio.gather(*tasks))
    elapsed = round((time.monotonic() - t0) * 1000)

    fresh = sum(1 for r in results if r.status == ScrapeStatus.FRESH)
    logger.info("search '%s': %d/%d fresh (%dms)", query[:50], fresh, len(results), elapsed)

    recommendation, ai_error = await generate_recommendation(
        query, results, user_gemini_key=user_gemini_key
    )
    return SearchResponse(
        query=query,
        results=results,
        ai_recommendation=recommendation,
        ai_error=ai_error,
    )
