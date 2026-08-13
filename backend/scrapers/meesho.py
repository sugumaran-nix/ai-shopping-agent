"""
Meesho search-results scraper.

Meesho's product grid is client-rendered (Next.js), so JS rendering is
requested from ScraperAPI. Prefers the JSON data island embedded by Next.js
(__NEXT_DATA__) over CSS-class scraping — more durable when only the CSS changes.

JS rendering costs more ScraperAPI credits, which is exactly why caching
matters most for this source.
"""
from __future__ import annotations

import json
import logging
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper
from utils.headers import clean_price, make_absolute_url

_BASE = "https://www.meesho.com"
logger = logging.getLogger("scraper.meesho")


class MeeshoScraper(BaseScraper):
    source = Source.MEESHO
    render_js = True

    def build_search_url(self, query: str) -> str:
        return f"{_BASE}/search?q={quote_plus(query)}"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")

        # Prefer structured JSON if available
        script_tag = soup.select_one("script#__NEXT_DATA__")
        if script_tag and script_tag.string:
            try:
                data = json.loads(script_tag.string)
                products = self._extract_from_next_data(data)
                if products:
                    return products
            except (json.JSONDecodeError, KeyError, TypeError) as exc:
                logger.debug("Meesho __NEXT_DATA__ parse failed, falling back to HTML: %s", exc)

        # HTML fallback
        results = []
        for card in soup.select("[data-testid='product-card'], div.ProductCard"):
            title_el = card.select_one("p, span")
            price_el = card.find(string=lambda s: s and "₹" in s)
            link_el = card.select_one("a")

            if not (title_el and price_el and link_el):
                continue

            title = title_el.get_text(strip=True)
            price = clean_price(price_el.strip())
            if not title or price is None:
                continue

            href = link_el.get("href", "")
            full_url = make_absolute_url(href, _BASE)

            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": None,
                "review_count": None,
                "url": full_url,
                "image_url": None,
            })

        return results

    @staticmethod
    def _extract_from_next_data(data: dict) -> list[dict]:
        """
        Walk the Next.js __NEXT_DATA__ payload for a products array.
        The exact path is the most likely thing to shift on a Meesho deploy —
        if this starts returning [] consistently, inspect the live __NEXT_DATA__
        payload first.
        """
        try:
            catalogs = data["props"]["pageProps"]["initialState"]["catalogs"]
        except (KeyError, TypeError):
            return []

        results = []
        items = catalogs if isinstance(catalogs, list) else list(catalogs.values())
        for item in items:
            title = item.get("name") or item.get("product_name")
            price_raw = item.get("min_product_price") or item.get("price")
            slug = item.get("slug") or item.get("url_slug")
            if not (title and price_raw and slug):
                continue
            try:
                price = float(price_raw)
            except (ValueError, TypeError):
                continue
            if price <= 0:
                continue
            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": item.get("rating"),
                "review_count": item.get("rating_count"),
                "url": f"{_BASE}/{slug}",
                "image_url": item.get("image_url") or item.get("thumbnail"),
            })
        return results
