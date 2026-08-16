"""
Myntra search scraper.

Myntra heavily blocks scrapers including ScraperAPI's standard JS rendering.
Strategy: use ScraperAPI with ultra_premium=true which routes through residential
proxies — costs more credits but actually gets through Myntra's anti-bot.

If that also fails, we return unavailable rather than wasting time retrying.
"""
from __future__ import annotations

import json
import logging
import re

import httpx

from config import get_settings
from models import Product, ScrapeStatus, Source, SourceResult

logger = logging.getLogger("scraper.myntra")
settings = get_settings()

_BASE = "https://www.myntra.com"

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://www.myntra.com/",
    "Origin": "https://www.myntra.com",
    "X-Myntra-Abtest": "true",
}


class MyntraScraper:
    source = Source.MYNTRA

    async def search(self, query: str) -> SourceResult:
        import cache as cache_module
        cached = cache_module.get(self.source.value, query)

        try:
            products = await self._fetch(query)
            if not products:
                raise ValueError("0 products returned from Myntra")

            cache_module.store(
                self.source.value, query,
                [p.model_dump(mode="json") for p in products],
            )
            return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)

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
        """
        Try multiple Myntra endpoints in order:
        1. Internal search API (fastest, often blocked)
        2. ScraperAPI with ultra_premium residential proxy
        """
        # Try 1: Myntra internal search API directly
        try:
            products = await self._try_internal_api(query)
            if products:
                logger.debug("Myntra: %d from internal API", len(products))
                return products
        except Exception as exc:  # noqa: BLE001
            logger.debug("Myntra internal API failed: %s", exc)

        # Try 2: ScraperAPI ultra_premium (residential proxy, bypasses Myntra's bot detection)
        if settings.scraperapi_key:
            try:
                products = await self._try_scraperapi_premium(query)
                if products:
                    logger.debug("Myntra: %d from ScraperAPI premium", len(products))
                    return products
            except Exception as exc:  # noqa: BLE001
                logger.debug("Myntra ScraperAPI premium failed: %s", exc)

        return []

    async def _try_internal_api(self, query: str) -> list[Product]:
        """Myntra's internal XHR search API."""
        from urllib.parse import quote
        url = f"https://www.myntra.com/gateway/v2/search/{quote(query)}"
        params = {"p": 1, "rows": 20, "o": 0, "plaEnabled": "false"}

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=_HEADERS)
            resp.raise_for_status()
            text = resp.text.strip()
            if not text:
                raise ValueError("Empty response")
            data = resp.json()

        return self._parse_api_response(data)

    async def _try_scraperapi_premium(self, query: str) -> list[Product]:
        """ScraperAPI with ultra_premium=true (residential proxy)."""
        from urllib.parse import urlencode
        search_url = f"{_BASE}/search?q={query.strip().replace(' ', '+')}"
        params = {
            "api_key": settings.scraperapi_key,
            "url": search_url,
            "render": "true",
            "ultra_premium": "true",
            "country_code": "in",
        }
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.get("https://api.scraperapi.com/", params=params)
            resp.raise_for_status()
            html = resp.text

        if not html.strip():
            raise ValueError("Empty HTML from ScraperAPI")

        return self._parse_html(html)

    def _parse_api_response(self, data: dict) -> list[Product]:
        products = []
        items = (
            data.get("products", [])
            or data.get("response", {}).get("products", [])
        )
        for item in items:
            try:
                brand = item.get("brand", "")
                name = item.get("product", "") or item.get("name", "")
                title = f"{brand} {name}".strip() if brand else name
                price_raw = item.get("discountedPrice") or item.get("price")
                landing = item.get("landingPageUrl") or item.get("slugV2", "")
                if not title or not price_raw:
                    continue
                products.append(Product(
                    source=self.source,
                    title=title,
                    price=float(price_raw),
                    currency="INR",
                    rating=item.get("rating"),
                    review_count=item.get("ratingCount"),
                    url=f"{_BASE}/{landing}" if landing else _BASE,
                    image_url=item.get("searchImage"),
                ))
            except Exception:  # noqa: BLE001
                continue
        return products

    def _parse_html(self, html: str) -> list[Product]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        products = []

        # Try window.__myx
        for script in soup.find_all("script"):
            text = script.string or ""
            match = re.search(r"window\.__myx\s*=\s*(\{.*?\});", text, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(1))
                    items = (
                        data.get("searchData", {}).get("results", {}).get("products", [])
                        or data.get("data", {}).get("products", [])
                    )
                    for item in items:
                        try:
                            brand = item.get("brand", "")
                            name = item.get("product", "") or item.get("name", "")
                            title = f"{brand} {name}".strip() if brand else name
                            price_raw = item.get("discountedPrice") or item.get("price")
                            landing = item.get("landingPageUrl") or item.get("slugV2", "")
                            if not title or not price_raw:
                                continue
                            products.append(Product(
                                source=self.source,
                                title=title,
                                price=float(price_raw),
                                currency="INR",
                                rating=item.get("rating"),
                                review_count=item.get("ratingCount"),
                                url=f"{_BASE}/{landing}" if landing else _BASE,
                                image_url=item.get("searchImage"),
                            ))
                        except Exception:  # noqa: BLE001
                            continue
                    if products:
                        return products
                except Exception:  # noqa: BLE001
                    pass

        # HTML fallback
        cards = (
            soup.select("li.product-base")
            or soup.select("div[class*='product-base']")
            or soup.select("li[class*='results-base']")
        )
        for card in cards:
            try:
                brand_el = card.select_one("h3.product-brand")
                name_el = card.select_one("h4.product-product") or card.select_one("h4")
                price_el = (
                    card.select_one("span.product-discountedPrice")
                    or card.select_one("div.product-price span")
                )
                link_el = card.select_one("a[href]")
                if not name_el or not price_el:
                    continue
                price_text = re.sub(r"[^\d.]", "", price_el.get_text(strip=True))
                price = float(price_text) if price_text else None
                if not price:
                    continue
                brand = brand_el.get_text(strip=True) if brand_el else ""
                name = name_el.get_text(strip=True)
                title = f"{brand} {name}".strip() if brand else name
                href = link_el.get("href", "") if link_el else ""
                url = f"{_BASE}/{href}" if href and not href.startswith("http") else href or _BASE
                img_el = card.select_one("img")
                products.append(Product(
                    source=self.source,
                    title=title,
                    price=price,
                    currency="INR",
                    url=url,
                    image_url=img_el.get("src") if img_el else None,
                ))
            except Exception:  # noqa: BLE001
                continue

        return products
