"""
Meesho search-results scraper.

Meesho is JS-rendered. Uses ScraperAPI render=true.
Falls back to HTML parsing if __NEXT_DATA__ is not present.
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
    country_code = "in"

    def build_search_url(self, query: str) -> str:
        return f"{_BASE}/search?q={quote_plus(query)}&searchType=manual"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")

        # Try __NEXT_DATA__ first
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                data = json.loads(script.string)
                products = self._from_next_data(data)
                if products:
                    logger.debug("Meesho: got %d products from __NEXT_DATA__", len(products))
                    return products
            except Exception as exc:  # noqa: BLE001
                logger.debug("Meesho __NEXT_DATA__ failed: %s", exc)

        # HTML fallback — multiple selector attempts
        results = []
        selectors = [
            "div[data-testid='product-card']",
            "div.ProductCard",
            "div.sc-dkrFOg",
            "div[class*='ProductCard']",
        ]
        cards = []
        for sel in selectors:
            cards = soup.select(sel)
            if cards:
                break

        logger.debug("Meesho: found %d HTML cards", len(cards))

        for card in cards:
            title_el = card.select_one("p[class*='Text']") or card.select_one("p") or card.select_one("span")
            price_text = card.find(string=lambda s: s and "₹" in str(s))
            link_el = card.select_one("a")

            if not title_el or not price_text or not link_el:
                continue

            title = title_el.get_text(strip=True)
            price = clean_price(str(price_text))
            if not title or not price:
                continue

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
    def _from_next_data(data: dict) -> list[dict]:
        results = []
        try:
            # Try multiple known paths in Meesho's Next.js data
            products = (
                data.get("props", {}).get("pageProps", {}).get("data", {}).get("catalog_list_data", [])
                or data.get("props", {}).get("pageProps", {}).get("initialData", {}).get("data", {}).get("catalog_list_data", [])
            )
            for item in products:
                name = item.get("name") or item.get("product_name", "")
                price_raw = item.get("min_product_price") or item.get("price", 0)
                slug = item.get("slug") or item.get("url_slug", "")
                if not name or not price_raw:
                    continue
                try:
                    price = float(str(price_raw).replace(",", ""))
                except (ValueError, TypeError):
                    continue
                if price <= 0:
                    continue
                results.append({
                    "title": name,
                    "price": price,
                    "currency": "INR",
                    "rating": item.get("rating"),
                    "review_count": item.get("rating_count"),
                    "url": f"{_BASE}/{slug}" if slug else _BASE,
                    "image_url": item.get("cover_image") or item.get("image_url"),
                })
        except Exception:  # noqa: BLE001
            pass
        return results
