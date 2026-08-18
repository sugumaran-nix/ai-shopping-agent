"""Jiomart scraper with direct HTML, browser, then ScraperAPI fallbacks."""
from __future__ import annotations

import logging
import re
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup

import cache as cache_module
from config import get_settings
from models import Product, ScrapeStatus, Source, SourceResult
from services.browser_manager import render_page_html
from utils.headers import clean_price, extract_image_url, make_absolute_url
from utils.http_client import fetch_html

_BASE = "https://www.jiomart.com"
logger = logging.getLogger("scraper.jiomart")
settings = get_settings()
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": f"{_BASE}/",
}


class JiomartScraper:
    source = Source.JIOMART
    country_code = "in"

    def build_search_url(self, query: str) -> str:
        return f"{_BASE}/search/{quote(query.strip())}"

    async def search(self, query: str, scraperapi_key: str | None = None) -> SourceResult:
        cached = cache_module.get(self.source.value, query)
        if cached and cached.is_fresh:
            products = self._products_from_cache(cached)
            if products:
                logger.debug("Jiomart: fresh cache hit for %s", query[:40])
                return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)

        try:
            products = await self._fetch(query, scraperapi_key)
            if not products:
                raise ValueError("0 valid products returned from Jiomart")
            cache_module.store(self.source.value, query, [product.model_dump(mode="json") for product in products])
            return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)
        except Exception as exc:  # noqa: BLE001
            logger.error("Jiomart failed: %s", exc)
            if cached:
                products = self._products_from_cache(cached)
                if products:
                    return SourceResult(source=self.source, status=ScrapeStatus.STALE, products=products, error=str(exc))
            return SourceResult(source=self.source, status=ScrapeStatus.UNAVAILABLE, products=[], error=str(exc))

    async def _fetch(self, query: str, scraperapi_key: str | None = None) -> list[Product]:
        # Plan A: direct HTTP + BeautifulSoup, as requested for Jiomart.
        try:
            async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=_HEADERS) as client:
                response = await client.get(self.build_search_url(query))
                response.raise_for_status()
                products = self._validated(self._parse_html(response.text))
            if products:
                logger.info("Jiomart: %d products from direct HTTP", len(products))
                return products
        except Exception as exc:  # noqa: BLE001
            logger.debug("Jiomart direct HTTP failed: %s", exc)

        # Plan B: shared browser, only after direct HTML returns no products.
        try:
            html = await render_page_html(
                self.build_search_url(query),
                wait_for_selectors=("a[href*='/p/']", "[class*='product']", "body"),
                timeout_ms=45_000,
            )
            products = self._validated(self._parse_html(html))
            if products:
                logger.info("Jiomart: %d products from Playwright", len(products))
                return products
        except Exception as exc:  # noqa: BLE001
            logger.debug("Jiomart Playwright fallback failed: %s", exc)

        # Plan C: ScraperAPI is the final source-specific fallback.
        if scraperapi_key or settings.scraperapi_key:
            html = await fetch_html(self.build_search_url(query), api_key=scraperapi_key, render_js=False, country_code=self.country_code)
            products = self._validated(self._parse_html(html))
            if products:
                logger.info("Jiomart: %d products from ScraperAPI", len(products))
                return products
        return []

    def _parse_html(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select(
            "a[href*='/p/'], a[href*='/product/'], "
            "[data-testid*='product'], [class*='product-card'], [class*='ProductCard'], "
            "[class*='plp-card'], [class*='listing-card']"
        )
        results: list[dict] = []
        seen: set[str] = set()
        for card in cards:
            link = card if card.name == "a" else card.select_one("a[href]")
            href = link.get("href", "") if link else ""
            if not href:
                continue
            url = make_absolute_url(href, _BASE)
            if url in seen:
                continue
            text = card.get_text(" ", strip=True)
            price_match = re.search(r"(?:₹|Rs\.?)[\s₹]*[\d,]+(?:\.\d+)?", text, re.IGNORECASE)
            if not price_match:
                continue
            price = clean_price(price_match.group(0))
            if not price:
                continue
            title_el = card.select_one("h2, h3, h4, [class*='title'], [class*='name'], [class*='product']")
            title = title_el.get_text(" ", strip=True) if title_el else ""
            title = re.sub(r"\s+", " ", title).strip()
            if len(title) < 3:
                title = re.sub(r"\s+", " ", text.split(price_match.group(0), 1)[0]).strip()
            if len(title) < 3:
                continue
            rating_match = re.search(r"(?:^|\s)([0-5](?:\.\d)?)\s*(?:\(|★|star)", text, re.IGNORECASE)
            review_match = re.search(r"([\d,.]+)\s*(?:reviews?|ratings?)", text, re.IGNORECASE)
            image_url = extract_image_url(card.select_one("img"), _BASE)
            results.append({
                "title": title[:500],
                "price": price,
                "currency": "INR",
                "rating": float(rating_match.group(1)) if rating_match else None,
                "review_count": int(float(review_match.group(1).replace(",", ""))) if review_match else None,
                "url": url,
                "image_url": image_url,
            })
            seen.add(url)
        return results

    def _validated(self, raw_items: list[dict]) -> list[Product]:
        products: list[Product] = []
        for raw in raw_items:
            try:
                products.append(Product(source=self.source, **raw))
            except Exception as exc:  # noqa: BLE001
                logger.debug("Jiomart: dropped invalid product: %s", exc)
        return products

    @staticmethod
    def _products_from_cache(cached: cache_module.CacheEntry) -> list[Product]:
        products: list[Product] = []
        for item in cached.data:
            try:
                products.append(Product(**item))
            except Exception:  # noqa: BLE001
                continue
        return products
