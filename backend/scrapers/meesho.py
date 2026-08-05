"""
Meesho search-results scraper.

Meesho's product grid is heavily client-side rendered (Next.js hydration),
so this scraper requests JS rendering from ScraperAPI (`render_js = True`).
That costs more ScraperAPI credits per request than a plain HTML fetch,
which is exactly why caching (cache.py) matters most for this source -
without it, Meesho searches would be both the slowest and the most
expensive part of every request.
"""
from __future__ import annotations

import json
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper


class MeeshoScraper(BaseScraper):
    source = Source.MEESHO
    render_js = True

    def build_search_url(self, query: str) -> str:
        return f"https://www.meesho.com/search?q={quote_plus(query)}"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Meesho embeds product data as JSON inside a Next.js data island.
        # Prefer this over scraping visible text: it's structured and far
        # less likely to break silently when only CSS classes change.
        script_tag = soup.select_one("script#__NEXT_DATA__")
        if script_tag and script_tag.string:
            try:
                data = json.loads(script_tag.string)
                products = self._extract_from_next_data(data)
                if products:
                    return products
            except (json.JSONDecodeError, KeyError, TypeError):
                pass  # fall through to the HTML-based fallback below

        # Fallback: plain card scraping if the JSON shape has changed.
        for card in soup.select("[data-testid='product-card'], div.ProductCard"):
            title_el = card.select_one("p, span")
            price_el = card.find(string=lambda s: s and "₹" in s)
            link_el = card.select_one("a")

            if not (title_el and price_el and link_el):
                continue

            try:
                price = float(price_el.strip().lstrip("₹").split()[0].replace(",", ""))
            except (ValueError, IndexError):
                continue

            href = link_el.get("href", "")
            full_url = href if href.startswith("http") else f"https://www.meesho.com{href}"

            results.append(
                {
                    "title": title_el.get_text(strip=True),
                    "price": price,
                    "currency": "INR",
                    "rating": None,
                    "review_count": None,
                    "url": full_url,
                    "image_url": None,
                }
            )

        return results

    @staticmethod
    def _extract_from_next_data(data: dict) -> list[dict]:
        """
        Walk the Next.js __NEXT_DATA__ payload for a products array.
        The exact path (props -> pageProps -> ...) is the single most
        likely thing to shift on a Meesho deploy - if this starts
        returning [] consistently, check the live payload shape first.
        """
        try:
            catalogs = data["props"]["pageProps"]["initialState"]["catalogs"]
        except (KeyError, TypeError):
            return []

        results = []
        for item in catalogs if isinstance(catalogs, list) else catalogs.values():
            title = item.get("name") or item.get("product_name")
            price = item.get("min_product_price") or item.get("price")
            slug = item.get("slug") or item.get("url_slug")
            if not (title and price and slug):
                continue
            try:
                price = float(price)
            except (ValueError, TypeError):
                continue
            results.append(
                {
                    "title": title,
                    "price": price,
                    "currency": "INR",
                    "rating": item.get("rating"),
                    "review_count": item.get("rating_count"),
                    "url": f"https://www.meesho.com/{slug}",
                    "image_url": item.get("image_url") or item.get("thumbnail"),
                }
            )
        return results
