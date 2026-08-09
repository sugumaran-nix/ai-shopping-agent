"""
Croma.com scraper — India's largest electronics retail chain.
Server-rendered search results, light bot protection, reliable from any IP.
Best for electronics category (phones, laptops, TVs, audio).
"""
from __future__ import annotations
import json
import re
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from models import Source
from scrapers.base import BaseScraper


class CromaScraper(BaseScraper):
    source = Source.CROMA

    def build_url(self, query: str) -> str:
        return f"https://www.croma.com/searchB?q={quote_plus(query)}%3Arelevance&inStockFilter=false"

    def parse(self, html: str) -> list[dict]:
        soup    = BeautifulSoup(html, "lxml")
        results = []

        # Croma embeds product JSON in a Next.js script tag
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                data = json.loads(script.string)
                items = (
                    data.get("props", {})
                        .get("pageProps", {})
                        .get("productListingData", {})
                        .get("catalog", {})
                        .get("products", [])
                )
                if items:
                    return self._parse_json(items)
            except (json.JSONDecodeError, KeyError, TypeError):
                pass  # fall through to HTML parsing

        # HTML fallback
        for card in soup.select("li.product-item, div[class*='product-list']"):
            title_el = card.select_one("h3.product-title, a.product-title")
            price_el = card.select_one("span.amount, span[class*='price']")
            link_el  = card.select_one("a[href*='/p/']") or card.select_one("a[href]")

            if not (title_el and price_el and link_el):
                continue

            title = title_el.get_text(strip=True)
            try:
                price = float(re.sub(r"[^\d.]", "", price_el.get_text()))
            except ValueError:
                continue

            href = link_el.get("href", "")
            url  = href if href.startswith("http") else f"https://www.croma.com{href}"

            img    = card.select_one("img")
            img_url = (img.get("src") or img.get("data-src")) if img else None

            results.append({
                "title":    title,
                "price":    price,
                "currency": "INR",
                "url":      url,
                "image_url": img_url,
            })

        return results

    def _parse_json(self, items: list) -> list[dict]:
        results = []
        for item in items:
            try:
                name  = item.get("name", "").strip()
                price = float(item.get("prices", {}).get("offerPrice", 0))
                mrp   = float(item.get("prices", {}).get("mrpPrice", 0) or 0)
                slug  = item.get("productUrl") or item.get("slug", "")
                imgs  = item.get("images", [])
                img_url = imgs[0].get("large") or imgs[0].get("small") if imgs else None
                brand = item.get("brandName", "")

                if not name or price <= 0 or not slug:
                    continue

                results.append({
                    "title":          name,
                    "price":          price,
                    "original_price": mrp if mrp > price else None,
                    "currency":       "INR",
                    "brand":          brand or None,
                    "url":            slug if slug.startswith("http") else f"https://www.croma.com{slug}",
                    "image_url":      img_url,
                })
            except Exception:
                continue
        return results
