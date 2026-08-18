"""
Meesho search scraper.

Routes through ScraperAPI with JS rendering.
Tries multiple data extraction strategies in order of reliability.
"""
from __future__ import annotations

import json
import logging
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper
from utils.headers import clean_price, extract_image_url, make_absolute_url, normalize_image_url

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

        # Strategy 1: __NEXT_DATA__ JSON
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                data = json.loads(script.string)
                products = self._from_next_data(data)
                if products:
                    logger.debug("Meesho: %d from __NEXT_DATA__", len(products))
                    return products
            except Exception as exc:  # noqa: BLE001
                logger.debug("Meesho __NEXT_DATA__ failed: %s", exc)

        # Strategy 2: inline JSON scripts
        for script_tag in soup.find_all("script", type="application/json"):
            try:
                data = json.loads(script_tag.string or "")
                products = self._from_next_data(data)
                if products:
                    logger.debug("Meesho: %d from inline JSON", len(products))
                    return products
            except Exception:  # noqa: BLE001
                continue

        # Strategy 3: HTML card parsing with many selector fallbacks
        results = []
        card_selectors = [
            "div[data-testid='product-card']",
            "div.ProductCard",
            "div[class*='ProductCard']",
            "div[class*='product-card']",
            "div[class*='NewProductCard']",
        ]
        cards = []
        for sel in card_selectors:
            cards = soup.select(sel)
            if cards:
                logger.debug("Meesho: %d cards with '%s'", len(cards), sel)
                break

        for card in cards:
            # Title
            title_el = (
                card.select_one("p[class*='Text__StyledText']")
                or card.select_one("p[class*='text']")
                or card.select_one("p")
                or card.select_one("h4")
            )
            # Price — look for ₹ sign
            price_text = None
            for el in card.find_all(string=True):
                if "₹" in str(el):
                    price_text = str(el)
                    break

            link_el = card.select_one("a[href]")
            if not title_el or not price_text:
                continue

            title = title_el.get_text(strip=True)
            price = clean_price(price_text)
            if not title or not price:
                continue

            href = link_el.get("href", "") if link_el else ""
            url = make_absolute_url(href, _BASE) if href else _BASE
            img_el = card.select_one("img")
            image_url = extract_image_url(img_el, _BASE)

            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": None,
                "review_count": None,
                "url": url,
                "image_url": image_url,
            })

        logger.debug("Meesho: %d from HTML", len(results))
        return results

    @staticmethod
    def _from_next_data(data: dict) -> list[dict]:
        results = []
        try:
            page_props = data.get("props", {}).get("pageProps", {})
            # Try all known paths
            catalogs = (
                page_props.get("data", {}).get("catalog_list_data", [])
                or page_props.get("initialData", {}).get("catalog_list_data", [])
                or page_props.get("searchResults", {}).get("catalogs", [])
                or page_props.get("catalogs", [])
                or data.get("catalogs", [])
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
                    "image_url": normalize_image_url(item.get("cover_image") or item.get("image_url"), _BASE),
                })
        except Exception:  # noqa: BLE001
            pass
        return results
