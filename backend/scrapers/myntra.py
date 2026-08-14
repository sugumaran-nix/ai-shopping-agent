"""
Myntra search scraper.

Uses Myntra's internal search API (same one their website calls via XHR).
Much more reliable than scraping the JS-rendered page.
"""
from __future__ import annotations

import logging
from urllib.parse import quote

import httpx

from models import Source, ScrapeStatus, SourceResult, Product

logger = logging.getLogger("scraper.myntra")

_API_URL = "https://www.myntra.com/gateway/v2/search/{query}"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://www.myntra.com/",
    "Origin": "https://www.myntra.com",
    "X-Requested-With": "XMLHttpRequest",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
}


class MyntraScraper:
    source = Source.MYNTRA

    async def search(self, query: str) -> SourceResult:
        import cache as cache_module
        cached = cache_module.get(self.source.value, query)

        try:
            products = await self._fetch(query)
            if not products:
                raise ValueError("0 products returned from Myntra API")

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
            logger.error("Myntra failed: %s", exc)
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
        url = f"https://www.myntra.com/gateway/v2/search/{quote(query)}"
        params = {
            "p": 1,
            "rows": 20,
            "o": 0,
            "plaEnabled": False,
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params, headers=_HEADERS)
            resp.raise_for_status()
            data = resp.json()

        products = []
        items = (
            data.get("products", [])
            or data.get("response", {}).get("products", [])
        )
        for item in items:
            try:
                brand = item.get("brand") or item.get("brandName", "")
                name = item.get("product") or item.get("productName", "")
                title = f"{brand} {name}".strip() if brand else name
                price_raw = item.get("discountedPrice") or item.get("price", 0)
                landing = item.get("landingPageUrl") or item.get("slugV2", "")
                if not title or not price_raw:
                    continue
                price = float(price_raw)
                if price <= 0:
                    continue
                products.append(Product(
                    source=self.source,
                    title=title,
                    price=price,
                    currency="INR",
                    rating=item.get("rating"),
                    review_count=item.get("ratingCount"),
                    url=f"https://www.myntra.com/{landing}" if landing else "https://www.myntra.com",
                    image_url=item.get("searchImage"),
                ))
            except Exception:  # noqa: BLE001
                continue
        return products
