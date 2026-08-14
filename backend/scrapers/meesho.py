"""
Meesho search scraper.

Meesho heavily blocks scrapers. Instead of scraping the website directly,
we use Meesho's internal search API which is what their mobile app uses.
This is far more reliable than scraping the JS-rendered page.
"""
from __future__ import annotations

import json
import logging

import httpx

from config import get_settings
from models import Source, ScrapeStatus, SourceResult, Product
from utils.headers import get_headers

logger = logging.getLogger("scraper.meesho")
settings = get_settings()

_API_URL = "https://meesho.com/api/v1/products/search"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Origin": "https://www.meesho.com",
    "Referer": "https://www.meesho.com/",
    "X-Requested-With": "XMLHttpRequest",
}


class MeeshoScraper:
    source = Source.MEESHO

    async def search(self, query: str) -> SourceResult:
        import cache as cache_module
        cached = cache_module.get(self.source.value, query)

        try:
            products = await self._fetch(query)
            if not products:
                raise ValueError("0 products returned from Meesho API")

            cache_module.store(
                self.source.value, query,
                [p.model_dump(mode="json") for p in products],
            )
            return SourceResult(
                source=self.source,
                status=ScrapeStatus.FRESH,
                products=products,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Meesho failed: %s", exc)
            if cached:
                prods = []
                for p in cached.data:
                    try:
                        prods.append(Product(**p))
                    except Exception:  # noqa: BLE001
                        pass
                return SourceResult(source=self.source, status=ScrapeStatus.STALE, products=prods, error=str(exc))
            return SourceResult(source=self.source, status=ScrapeStatus.UNAVAILABLE, products=[], error=str(exc))

    async def _fetch(self, query: str) -> list[Product]:
        payload = {
            "query": query,
            "page": 1,
            "page_size": 20,
            "filters": [],
            "sort_order": "POPULARITY",
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                _API_URL,
                json=payload,
                headers=_HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()

        products = []
        catalogs = data.get("catalogs", []) or data.get("data", {}).get("catalogs", [])
        for item in catalogs:
            try:
                name = item.get("name") or item.get("product_name", "")
                price_raw = item.get("min_product_price") or item.get("price", 0)
                slug = item.get("slug") or item.get("product_slug") or ""
                if not name or not price_raw:
                    continue
                price = float(str(price_raw).replace(",", ""))
                if price <= 0:
                    continue
                products.append(Product(
                    source=self.source,
                    title=name,
                    price=price,
                    currency="INR",
                    rating=item.get("rating"),
                    review_count=item.get("rating_count"),
                    url=f"https://www.meesho.com/{slug}" if slug else "https://www.meesho.com",
                    image_url=item.get("cover_image") or item.get("image_url"),
                ))
            except Exception:  # noqa: BLE001
                continue
        return products
