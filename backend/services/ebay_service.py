"""
Official eBay Browse API client.

This is the one source in the app that is NOT scraped - it's a real,
documented, authenticated API (OAuth2 client-credentials grant). It exists
to give the app one channel that can never break because of an HTML/CSS
change, and to act as a canary: if every scraper's success rate drops but
this one is fine, you know the problem is scraper drift, not your network,
cache, or ScraperAPI account.

It's optional - the app runs fine without EBAY_CLIENT_ID/SECRET set, it just
won't include an eBay column in results.
"""
from __future__ import annotations

import time
from typing import Optional

import httpx

from config import get_settings
from models import Product, ScrapeStatus, Source, SourceResult

settings = get_settings()

OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
BROWSE_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"

_token_cache: dict[str, float | str] = {"token": "", "expires_at": 0.0}


async def _get_access_token(client: httpx.AsyncClient) -> str:
    if _token_cache["token"] and time.time() < float(_token_cache["expires_at"]):
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
    _token_cache["expires_at"] = time.time() + payload.get("expires_in", 7200) - 60
    return str(_token_cache["token"])


async def search_ebay(query: str, limit: int = 10) -> SourceResult:
    if not settings.ebay_enabled:
        return SourceResult(
            source=Source.EBAY,
            status=ScrapeStatus.UNAVAILABLE,
            products=[],
            error="eBay API not configured (set EBAY_CLIENT_ID / EBAY_CLIENT_SECRET to enable)",
        )

    try:
        async with httpx.AsyncClient() as client:
            token = await _get_access_token(client)
            response = await client.get(
                BROWSE_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
                },
                params={"q": query, "limit": limit},
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
                    rating=None,
                    review_count=None,
                    url=item["itemWebUrl"],
                    image_url=(item.get("image") or {}).get("imageUrl"),
                )
                products.append(product)
            except (KeyError, ValueError, TypeError):
                continue  # malformed item from the API itself - skip, don't guess

        return SourceResult(source=Source.EBAY, status=ScrapeStatus.FRESH, products=products)

    except httpx.HTTPStatusError as exc:
        return SourceResult(
            source=Source.EBAY,
            status=ScrapeStatus.UNAVAILABLE,
            products=[],
            error=f"eBay API returned HTTP {exc.response.status_code}",
        )
    except Exception as exc:  # noqa: BLE001
        return SourceResult(
            source=Source.EBAY,
            status=ScrapeStatus.UNAVAILABLE,
            products=[],
            error=f"eBay API request failed: {exc}",
        )
