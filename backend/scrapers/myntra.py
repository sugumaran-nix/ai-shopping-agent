"""
Myntra search-results scraper.

Like Meesho, Myntra's results are client-rendered. Prefers the window.__myx
JSON blob embedded in the page over CSS-class scraping.
"""
from __future__ import annotations

import json
import logging
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper
from utils.headers import clean_price, make_absolute_url

_BASE = "https://www.myntra.com"
_WINDOW_DATA_RE = re.compile(r"window\.__myx\s*=\s*(\{.*?\});", re.DOTALL)
logger = logging.getLogger("scraper.myntra")


class MyntraScraper(BaseScraper):
    source = Source.MYNTRA
    render_js = True

    def build_search_url(self, query: str) -> str:
        slug = quote_plus(query.replace(" ", "-"))
        return f"{_BASE}/{slug}"

    def parse(self, html: str) -> list[dict]:
        # Prefer window.__myx JSON
        match = _WINDOW_DATA_RE.search(html)
        if match:
            try:
                data = json.loads(match.group(1))
                products = self._extract_from_window_data(data)
                if products:
                    return products
            except json.JSONDecodeError as exc:
                logger.debug("Myntra window.__myx parse failed, falling back to HTML: %s", exc)

        # HTML fallback
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

            price = clean_price(re.sub(r"[^\d.]", "", price_el.get_text(strip=True)))
            if price is None:
                continue

            brand = brand_el.get_text(strip=True) if brand_el else ""
            name = name_el.get_text(strip=True)
            title = f"{brand} {name}".strip() if brand else name

            href = link_el.get("href", "")
            full_url = make_absolute_url(href, _BASE)

            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": None,
                "review_count": None,
                "url": full_url,
                "image_url": img_el.get("src") if img_el else None,
            })

        return results

    @staticmethod
    def _extract_from_window_data(data: dict) -> list[dict]:
        try:
            items = data["searchData"]["results"]["products"]
        except (KeyError, TypeError):
            return []

        results = []
        for item in items:
            brand = item.get("brand", "")
            product = item.get("product", "")
            title = f"{brand} {product}".strip() if brand else product
            price_raw = item.get("discountedPrice") or item.get("price")
            landing = item.get("landingPageUrl")
            if not (title and price_raw and landing):
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
                "review_count": item.get("ratingCount"),
                "url": f"{_BASE}/{landing}",
                "image_url": item.get("searchImage"),
            })
        return results
