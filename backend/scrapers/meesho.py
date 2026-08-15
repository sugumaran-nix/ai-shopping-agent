"""
Meesho search scraper.

Routes through ScraperAPI (same as Amazon/Flipkart) since direct requests
get blocked or rate-limited. Uses render=true for JS execution.
Falls back to parsing the search page HTML.
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

        # Try __NEXT_DATA__ JSON blob first
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                data = json.loads(script.string)
                products = self._from_next_data(data)
                if products:
                    logger.debug("Meesho: %d products from __NEXT_DATA__", len(products))
                    return products
            except Exception as exc:  # noqa: BLE001
                logger.debug("Meesho __NEXT_DATA__ failed: %s", exc)

        # Try any inline JSON that looks like product data
        for script in soup.find_all("script", type="application/json"):
            try:
                data = json.loads(script.string or "")
                products = self._from_next_data(data)
                if products:
                    return products
            except Exception:  # noqa: BLE001
                continue

        # HTML fallback
        results = []
        card_selectors = [
            "div[data-testid='product-card']",
            "div.ProductCard",
            "div[class*='ProductCard']",
            "div[class*='product-card']",
        ]
        cards = []
        for sel in card_selectors:
            cards = soup.select(sel)
            if cards:
                logger.debug("Meesho: found %d cards with selector '%s'", len(cards), sel)
                break

        for card in cards:
            title_el = (
                card.select_one("p[class*='Text']")
                or card.select_one("p")
                or card.select_one("h4")
            )
            price_text = card.find(string=lambda s: s and "₹" in str(s))
            link_el = card.select_one("a[href]")

            if not title_el or not price_text:
                continue

            title = title_el.get_text(strip=True)
            price = clean_price(str(price_text))
            if not title or not price:
                continue

            href = link_el.get("href", "") if link_el else ""
            url = make_absolute_url(href, _BASE) if href else _BASE
            img_el = card.select_one("img")

            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": None,
                "review_count": None,
                "url": url,
                "image_url": img_el.get("src") if img_el else None,
            })

        logger.debug("Meesho: %d products from HTML fallback", len(results))
        return results

    @staticmethod
    def _from_next_data(data: dict) -> list[dict]:
        results = []
        try:
            # Walk known paths in Meesho's Next.js page data
            page_props = data.get("props", {}).get("pageProps", {})
            catalogs = (
                page_props.get("data", {}).get("catalog_list_data", [])
                or page_props.get("initialData", {}).get("catalog_list_data", [])
                or page_props.get("searchResults", {}).get("catalogs", [])
                or page_props.get("catalogs", [])
            )
            for item in catalogs:
                name = item.get("name") or item.get("product_name", "")
                price_raw = item.get("min_product_price") or item.get("price", 0)
                slug = item.get("slug") or item.get("product_slug") or item.get("url_slug", "")
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
