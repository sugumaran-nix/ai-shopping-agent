"""
Myntra search-results scraper.

Like Meesho, Myntra's results grid is client-rendered, so this requests JS
rendering. Myntra also embeds a `window.__myx` (or similar) JSON blob with
structured product data on many page variants - preferred over CSS-class
scraping for the same durability reason as meesho.py.
"""
from __future__ import annotations

import json
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper

_WINDOW_DATA_RE = re.compile(r"window\.__myx\s*=\s*(\{.*?\});", re.DOTALL)


class MyntraScraper(BaseScraper):
    source = Source.MYNTRA
    render_js = True

    def build_search_url(self, query: str) -> str:
        return f"https://www.myntra.com/{quote_plus(query.replace(' ', '-'))}"

    def parse(self, html: str) -> list[dict]:
        match = _WINDOW_DATA_RE.search(html)
        if match:
            try:
                data = json.loads(match.group(1))
                products = self._extract_from_window_data(data)
                if products:
                    return products
            except json.JSONDecodeError:
                pass  # fall through to HTML fallback

        soup = BeautifulSoup(html, "lxml")
        results = []
        for card in soup.select("li.product-base"):
            brand_el = card.select_one("h3.product-brand")
            name_el = card.select_one("h4.product-product")
            price_el = card.select_one("span.product-discountedPrice") or card.select_one(
                "div.product-price span"
            )
            link_el = card.select_one("a")
            img_el = card.select_one("img")

            if not (name_el and price_el and link_el):
                continue

            price_text = re.sub(r"[^\d.]", "", price_el.get_text(strip=True))
            if not price_text:
                continue
            try:
                price = float(price_text)
            except ValueError:
                continue

            title = f"{brand_el.get_text(strip=True)} {name_el.get_text(strip=True)}" if brand_el else name_el.get_text(strip=True)
            href = link_el.get("href", "")
            full_url = href if href.startswith("http") else f"https://www.myntra.com/{href}"

            results.append(
                {
                    "title": title,
                    "price": price,
                    "currency": "INR",
                    "rating": None,
                    "review_count": None,
                    "url": full_url,
                    "image_url": img_el.get("src") if img_el else None,
                }
            )

        return results

    @staticmethod
    def _extract_from_window_data(data: dict) -> list[dict]:
        try:
            items = data["searchData"]["results"]["products"]
        except (KeyError, TypeError):
            return []

        results = []
        for item in items:
            title = f"{item.get('brand', '')} {item.get('product', '')}".strip()
            price = item.get("discountedPrice") or item.get("price")
            landing = item.get("landingPageUrl")
            if not (title and price and landing):
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
                    "review_count": item.get("ratingCount"),
                    "url": f"https://www.myntra.com/{landing}",
                    "image_url": item.get("searchImage"),
                }
            )
        return results
