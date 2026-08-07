"""
Snapdeal search scraper.
Snapdeal is server-rendered with no aggressive bot protection —
plain curl_cffi fetch works reliably from any IP.
"""
from __future__ import annotations
import re
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from models import Source
from scrapers.base import BaseScraper


class SnapdealScraper(BaseScraper):
    source = Source.SNAPDEAL

    def build_url(self, query: str) -> str:
        return f"https://www.snapdeal.com/search?keyword={quote_plus(query)}&sort=rlvncy"

    def parse(self, html: str) -> list[dict]:
        soup    = BeautifulSoup(html, "lxml")
        results = []

        for card in soup.select("div.product-tuple-listing, div.col-xs-6.favDp"):
            # Title
            title_el = card.select_one("p.product-title, a.dp-widget-link")
            if not title_el:
                continue
            title = title_el.get("title") or title_el.get_text(strip=True)
            if not title or len(title) < 3:
                continue

            # Price
            price_el = card.select_one("span.product-price")
            if not price_el:
                continue
            try:
                price = float(re.sub(r"[^\d.]", "", price_el.get_text()))
            except ValueError:
                continue

            # Original price (strikethrough)
            mrp_el = card.select_one("span.product-desc-price.strike")
            original_price = None
            if mrp_el:
                try:
                    original_price = float(re.sub(r"[^\d.]", "", mrp_el.get_text()))
                except ValueError:
                    pass

            # Rating
            rating_el = card.select_one("p.filled-stars")
            rating = None
            if rating_el:
                width = rating_el.get("style", "")
                m = re.search(r"width:\s*([\d.]+)%", width)
                if m:
                    rating = round(float(m.group(1)) / 20, 1)  # 100% = 5 stars

            # URL
            link = card.select_one("a.dp-widget-link") or card.select_one("a[href*='snapdeal.com']")
            if not link:
                continue
            url = link.get("href", "")
            if not url.startswith("http"):
                url = f"https://www.snapdeal.com{url}"

            # Image
            img    = card.select_one("img.product-image")
            img_url = (img.get("src") or img.get("data-src")) if img else None

            results.append({
                "title":          title,
                "price":          price,
                "original_price": original_price,
                "currency":       "INR",
                "rating":         rating,
                "url":            url,
                "image_url":      img_url,
            })

        return results
