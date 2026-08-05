"""
Canary health checks.

Runs one real, representative search per scraper and reports whether it
returned any validated products. This is what turns "a scraper silently
broke three weeks ago and users have been seeing empty results ever since"
into "the /health endpoint has been red since Tuesday."

Wire this into a scheduled job (cron, GitHub Actions, Render cron job - see
render.yaml) that hits GET /health and alerts you (e.g. via a webhook) if
any source is unhealthy.
"""
from __future__ import annotations

from models import HealthCheckResult, ScrapeStatus
from scrapers.amazon import AmazonScraper
from scrapers.flipkart import FlipkartScraper
from scrapers.meesho import MeeshoScraper
from scrapers.myntra import MyntraScraper

# One realistic, popular-enough query per source that should reliably return
# results if the scraper is working. Pick queries that are unlikely to ever
# have zero genuine matches.
_CANARY_QUERY = "wireless mouse"

_SCRAPERS = {
    "amazon": AmazonScraper(),
    "flipkart": FlipkartScraper(),
    "meesho": MeeshoScraper(),
    "myntra": MyntraScraper(),
}


async def run_health_check() -> list[HealthCheckResult]:
    results = []
    for name, scraper in _SCRAPERS.items():
        result = await scraper.search(_CANARY_QUERY)
        healthy = result.status == ScrapeStatus.FRESH and len(result.products) > 0
        results.append(
            HealthCheckResult(
                source=result.source,
                healthy=healthy,
                products_found=len(result.products),
                error=result.error,
            )
        )
    return results
