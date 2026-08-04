"""
Runs every source concurrently (bounded by CONCURRENT_SCRAPE_LIMIT so we
don't hammer ScraperAPI or trip rate limits), collects whatever comes back -
fresh, stale, or unavailable per source - and hands the whole picture to the
AI service. Nothing here ever substitutes missing data with placeholder
values; a source that fails is reported as failed.
"""
from __future__ import annotations

import asyncio

from config import get_settings
from models import SearchResponse, SourceResult
from scrapers.amazon import AmazonScraper
from scrapers.flipkart import FlipkartScraper
from scrapers.meesho import MeeshoScraper
from scrapers.myntra import MyntraScraper
from services.ai_service import generate_recommendation
from services.ebay_service import search_ebay

settings = get_settings()

_SCRAPERS = [AmazonScraper(), FlipkartScraper(), MeeshoScraper(), MyntraScraper()]

_semaphore = asyncio.Semaphore(settings.concurrent_scrape_limit)


async def _bounded(coro):
    async with _semaphore:
        return await coro


async def search_all_sources(query: str) -> list[SourceResult]:
    tasks = [_bounded(scraper.search(query)) for scraper in _SCRAPERS]
    tasks.append(_bounded(search_ebay(query)))
    return await asyncio.gather(*tasks)


async def run_search(query: str) -> SearchResponse:
    results = await search_all_sources(query)
    recommendation, ai_error = await generate_recommendation(query, results)
    return SearchResponse(
        query=query,
        results=results,
        ai_recommendation=recommendation,
        ai_error=ai_error,
    )
