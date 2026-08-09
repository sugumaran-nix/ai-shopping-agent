"""
Aggregator — runs all scrapers concurrently, then calls the local
rule-based recommender. Zero external API calls.
"""
from __future__ import annotations
import asyncio
import logging

from models import SearchResponse, SourceResult
from scrapers import (
    AmazonScraper, FlipkartScraper,
    AjioScraper, SnapdealScraper, CromaScraper,
)
from services.recommender import generate_recommendation

log = logging.getLogger("aggregator")

_SCRAPERS = [
    AmazonScraper(),
    FlipkartScraper(),
    AjioScraper(),
    SnapdealScraper(),
    CromaScraper(),
]


async def search_all(query: str) -> list[SourceResult]:
    sem = asyncio.Semaphore(5)

    async def bounded(scraper):
        async with sem:
            return await scraper.search(query)

    return list(await asyncio.gather(*[bounded(s) for s in _SCRAPERS]))


async def run_search(query: str) -> SearchResponse:
    results  = await search_all(query)
    rec, err = generate_recommendation(query, results)
    return SearchResponse(
        query=query,
        results=results,
        ai_recommendation=rec,
        ai_error=err,
    )
