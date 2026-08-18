"""Meesho scraper with direct HTTP, browser, then provider fallbacks."""
from __future__ import annotations

import json
import logging
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

import cache as cache_module
from models import Product, ScrapeStatus, Source, SourceResult
from scrapers.base import BaseScraper
from services.browser_manager import render_page_html
from utils.headers import clean_price, extract_image_url, make_absolute_url, normalize_image_url
from utils.http_client import ProviderCredentials, fetch_html

_BASE = "https://www.meesho.com"
logger = logging.getLogger("scraper.meesho")
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": f"{_BASE}/",
    "Origin": _BASE,
}


class MeeshoScraper(BaseScraper):
    source = Source.MEESHO
    render_js = True
    country_code = "in"

    def build_search_url(self, query: str) -> str:
        return f"{_BASE}/search?q={quote_plus(query)}&searchType=manual"

    async def search(self, query: str, provider_credentials: ProviderCredentials | None = None) -> SourceResult:
        cached = cache_module.get(self.source.value, query)
        if cached and cached.is_fresh:
            products = self._products_from_cache(cached)
            if products:
                logger.debug("Meesho: fresh cache hit for %s", query[:40])
                return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)

        try:
            products = await self._fetch(query, provider_credentials)
            if not products:
                raise ValueError("0 valid products returned from Meesho")
            cache_module.store(self.source.value, query, [product.model_dump(mode="json") for product in products])
            return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)
        except Exception as exc:  # noqa: BLE001
            logger.error("Meesho failed: %s", exc)
            if cached:
                products = self._products_from_cache(cached)
                if products:
                    return SourceResult(source=self.source, status=ScrapeStatus.STALE, products=products, error=str(exc))
            return SourceResult(source=self.source, status=ScrapeStatus.UNAVAILABLE, products=[], error=str(exc))

    async def _fetch(self, query: str, provider_credentials: ProviderCredentials | None = None) -> list[Product]:
        # Plan A: direct internal JSON endpoint(s), without paid-provider credits.
        try:
            products = self._validated(await self._try_internal_api(query))
            if products:
                logger.info("Meesho: %d products from direct internal API", len(products))
                return products
        except Exception as exc:  # noqa: BLE001
            logger.debug("Meesho direct API failed: %s", exc)

        # Plan B: one shared headless browser process, with a new isolated context.
        try:
            html = await render_page_html(
                self.build_search_url(query),
                wait_for_selectors=("[data-testid='product-card']", "[class*='ProductCard']", "body"),
                timeout_ms=45_000,
            )
            products = self._validated(self.parse(html))
            if products:
                logger.info("Meesho: %d products from Playwright", len(products))
                return products
        except Exception as exc:  # noqa: BLE001
            logger.debug("Meesho Playwright fallback failed: %s", exc)

        # Plan C: bounded ScrapingAnt → Bright Data fallback.
        html = await fetch_html(
            self.build_search_url(query),
            credentials=provider_credentials,
            render_js=True,
            country_code=self.country_code,
        )
        products = self._validated(self.parse(html))
        if products:
            logger.info("Meesho: %d products from provider fallback", len(products))
            return products
        return []

    async def _try_internal_api(self, query: str) -> list[dict]:
        """Try known Meesho JSON route patterns; return empty on HTML/captcha responses."""
        import httpx

        candidates = (
            f"{_BASE}/api/v1/products/search",
            f"{_BASE}/api/v1/search",
            f"{_BASE}/api/v1/search/products",
        )
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=_HEADERS) as client:
            for endpoint in candidates:
                response = await client.get(endpoint, params={"q": query, "query": query, "page": 1, "limit": 20})
                if response.status_code >= 400 or "json" not in response.headers.get("content-type", "").lower():
                    continue
                data = response.json()
                products = self._from_next_data(data)
                if products:
                    return products
        return []

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                products = self._from_next_data(json.loads(script.string))
                if products:
                    return products
            except Exception as exc:  # noqa: BLE001
                logger.debug("Meesho __NEXT_DATA__ failed: %s", exc)

        for script_tag in soup.find_all("script", type="application/json"):
            try:
                products = self._from_next_data(json.loads(script_tag.string or ""))
                if products:
                    return products
            except Exception:  # noqa: BLE001
                continue

        results: list[dict] = []
        card_selectors = (
            "div[data-testid='product-card']",
            "div.ProductCard",
            "div[class*='ProductCard']",
            "div[class*='product-card']",
            "div[class*='NewProductCard']",
        )
        cards = []
        for selector in card_selectors:
            cards = soup.select(selector)
            if cards:
                break

        for card in cards:
            title_el = (
                card.select_one("p[class*='Text__StyledText']")
                or card.select_one("p[class*='text']")
                or card.select_one("p")
                or card.select_one("h4")
            )
            price_text = next((str(value) for value in card.find_all(string=True) if "₹" in str(value)), None)
            link_el = card.select_one("a[href]")
            if not title_el or not price_text:
                continue
            title = title_el.get_text(strip=True)
            price = clean_price(price_text)
            if not title or not price:
                continue
            href = link_el.get("href", "") if link_el else ""
            image_url = extract_image_url(card.select_one("img"), _BASE)
            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": None,
                "review_count": None,
                "url": make_absolute_url(href, _BASE) if href else _BASE,
                "image_url": image_url,
            })
        return results

    @staticmethod
    def _from_next_data(data: dict) -> list[dict]:
        results: list[dict] = []
        page_props = data.get("props", {}).get("pageProps", {}) if isinstance(data, dict) else {}
        catalogs = (
            page_props.get("data", {}).get("catalog_list_data", [])
            or page_props.get("initialData", {}).get("catalog_list_data", [])
            or page_props.get("searchResults", {}).get("catalogs", [])
            or page_props.get("catalogs", [])
            or data.get("catalogs", []) if isinstance(data, dict) else []
        )
        for item in catalogs if isinstance(catalogs, list) else []:
            if not isinstance(item, dict):
                continue
            name = item.get("name") or item.get("product_name") or ""
            price_raw = item.get("min_product_price") or item.get("price") or 0
            slug = item.get("slug") or item.get("product_slug") or item.get("url_slug") or ""
            price = clean_price(price_raw)
            if not name or not price or price <= 0:
                continue
            results.append({
                "title": str(name),
                "price": price,
                "currency": "INR",
                "rating": item.get("rating"),
                "review_count": item.get("rating_count"),
                "url": f"{_BASE}/{slug}" if slug else _BASE,
                "image_url": normalize_image_url(item.get("cover_image") or item.get("image_url"), _BASE),
            })
        return results

    def _validated(self, raw_items: list[dict | Product]) -> list[Product]:
        products: list[Product] = []
        seen: set[str] = set()
        for raw in raw_items:
            try:
                product = raw if isinstance(raw, Product) else Product(source=self.source, **raw)
            except Exception as exc:  # noqa: BLE001
                logger.debug("Meesho: dropped invalid product: %s", exc)
                continue
            if product.url not in seen:
                seen.add(product.url)
                products.append(product)
        return products
