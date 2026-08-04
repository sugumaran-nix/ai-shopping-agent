"""
Official eBay Browse API client (OAuth2 client-credentials).

The one source in this app that is NOT scraped. Exists to:
  1. Provide a channel that cannot break from HTML/CSS changes
  2. Act as a canary — if scrapers are failing but eBay is fine,
     the problem is scraper drift, not network/ScraperAPI

Optional — the app runs fine without EBAY_CLIENT_ID/SECRET.
"""
from __future__ import annotations

import logging
import time

import httpx

from config import get_settings
from models import Product, ScrapeStatus, Source, SourceResult

logger = logging.getLogger("ebay")
settings = get_settings()

OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
BROWSE_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"

# Module-level token cache (process-lifetime, not shared across workers)
_token_cache: dict[str, float | str] = {"token": "", "expires_at": 0.0}


async def _get_access_token(client: httpx.AsyncClient) -> str:
    now = time.time()
    if _token_cache["token"] and now < float(_token_cache["expires_at"]):
        return str(_token_cache["token"])

    response = await client.post(
        OAUTH_URL,
        data={
            "grant_type": "client_credentials",
            "scope": "https://api.ebay.com/oauth/api_scope",
        },
        auth=(settings.ebay_client_id, settings.ebay_client_secret),
        timeout=settings.request_timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    _token_cache["token"] = payload["access_token"]
    _token_cache["expires_at"] = now + payload.get("expires_in", 7200) - 60
    logger.debug("eBay OAuth token refreshed")
    return str(_token_cache["token"])


def _unavailable(reason: str) -> SourceResult:
    return SourceResult(
        source=Source.EBAY,
        status=ScrapeStatus.UNAVAILABLE,
        products=[],
        error=reason,
    )


async def search_ebay(query: str, limit: int = 10) -> SourceResult:
    if not settings.ebay_enabled:
        return _unavailable("eBay API not configured (set EBAY_CLIENT_ID / EBAY_CLIENT_SECRET)")

    try:
        async with httpx.AsyncClient() as client:
            token = await _get_access_token(client)
            response = await client.get(
                BROWSE_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
                },
                params={"q": query, "limit": min(limit, 50)},
                timeout=settings.request_timeout_seconds,
            )
            response.raise_for_status()
            data = response.json()

        products: list[Product] = []
        for item in data.get("itemSummaries", []):
            price_info = item.get("price") or {}
            try:
                product = Product(
                    source=Source.EBAY,
                    title=item["title"],
                    price=float(price_info["value"]),
                    currency=price_info.get("currency", "USD"),
                    url=item["itemWebUrl"],
                    image_url=(item.get("image") or {}).get("imageUrl"),
                )
                products.append(product)
            except (KeyError, ValueError, TypeError) as exc:
                logger.debug("eBay: skipped malformed item: %s", exc)
                continue

        logger.info("eBay: %d products found for '%s'", len(products), query[:50])
        return SourceResult(source=Source.EBAY, status=ScrapeStatus.FRESH, products=products)

    except httpx.HTTPStatusError as exc:
        logger.warning("eBay API HTTP error %d", exc.response.status_code)
        return _unavailable(f"eBay API returned HTTP {exc.response.status_code}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("eBay API error: %s", exc)
        return _unavailable("eBay API request failed")
