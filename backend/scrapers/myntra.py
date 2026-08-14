"""
Myntra search-results scraper.

Myntra is JS-rendered. Uses ScraperAPI render=true.
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
logger = logging.getLogger("scraper.myntra")


class MyntraScraper(BaseScraper):
    source = Source.MYNTRA
    render_js = True
    country_code = "in"

    def build_search_url(self, query: str) -> str:
        # Myntra uses slug-style URLs
        slug = re.sub(r"\s+", "-", query.strip().lower())
        return f"{_BASE}/{quote_plus(slug)}"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")

        # Try window.__myx JSON blob first
        for script in soup.find_all("script"):
            text = script.string or ""
            match = re.search(r"window\.__myx\s*=\s*(\{.*?\});", text, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(1))
                    products = self._from_window_myx(data)
                    if products:
                        logger.debug("Myntra: got %d products from window.__myx", len(products))
                        return products
                except Exception as exc:  # noqa: BLE001
                    logger.debug("Myntra window.__myx failed: %s", exc)

        # HTML fallback
        results = []
        cards = (
            soup.select("li.product-base")
            or soup.select("div[class*='product-base']")
            or soup.select("li[class*='results-base']")
        )

        logger.debug("Myntra: found %d HTML cards", len(cards))

        for card in cards:
            brand_el = card.select_one("h3.product-brand")
            name_el = card.select_one("h4.product-product") or card.select_one("h4")
            price_el = (
                card.select_one("span.product-discountedPrice")
                or card.select_one("div.product-price span")
                or card.select_one("span[class*='price']")
            )
            link_el = card.select_one("a")

            if not name_el or not price_el or not link_el:
                continue

            price_text = re.sub(r"[^\d.]", "", price_el.get_text(strip=True))
            price = clean_price(price_text)
            if not price:
                continue

            brand = brand_el.get_text(strip=True) if brand_el else ""
            name = name_el.get_text(strip=True)
            title = f"{brand} {name}".strip() if brand else name

            href = link_el.get("href", "")
            url = make_absolute_url(href, _BASE)
            img_el = card.select_one("img")

            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": None,
                "review_count": None,
                "url": url or _BASE,
                "image_url": img_el.get("src") if img_el else None,
            })

        return results

    @staticmethod
    def _from_window_myx(data: dict) -> list[dict]:
        results = []
        try:
            items = (
                data.get("searchData", {}).get("results", {}).get("products", [])
                or data.get("data", {}).get("products", [])
            )
            for item in items:
                brand = item.get("brand", "")
                product = item.get("product", "") or item.get("name", "")
                title = f"{brand} {product}".strip() if brand else product
                price_raw = item.get("discountedPrice") or item.get("price")
                landing = item.get("landingPageUrl", "")
                if not title or not price_raw:
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
                    "url": f"{_BASE}/{landing}" if landing else _BASE,
                    "image_url": item.get("searchImage"),
                })
        except Exception:  # noqa: BLE001
            pass
        return results
