"""
Runs all sources concurrently (bounded semaphore created inside the async
function — NOT at module level, which would break on import before an event
loop exists) and hands the full picture to the AI service.
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


async def search_all_sources(query: str) -> list[SourceResult]:
    # Semaphore created here, inside async context — safe
    semaphore = asyncio.Semaphore(settings.concurrent_scrape_limit)

    async def bounded(coro):
        async with semaphore:
            return await coro

    tasks = [bounded(scraper.search(query)) for scraper in _SCRAPERS]
    tasks.append(bounded(search_ebay(query)))
    return list(await asyncio.gather(*tasks))


async def run_search(query: str) -> SearchResponse:
    results = await search_all_sources(query)
    recommendation, ai_error = await generate_recommendation(query, results)
    return SearchResponse(
        query=query,
        results=results,
        ai_recommendation=recommendation,
        ai_error=ai_error,
    )
