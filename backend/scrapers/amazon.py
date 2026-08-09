"""
Amazon.in scraper — curl_cffi Chrome TLS impersonation.
No proxy, no paid service. Success rate ~65% from datacenter IPs.

When blocked (403/429), BaseScraper automatically falls back to the
last cached result (labeled STALE) instead of showing an error.
"""
from __future__ import annotations
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper


class AmazonScraper(BaseScraper):
    source = Source.AMAZON

    # Extra headers that help pass Amazon's bot checks alongside TLS impersonation
    _HEADERS = {
        "Accept":           "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language":  "en-IN,en;q=0.9",
        "Accept-Encoding":  "gzip, deflate, br",
        "Cache-Control":    "no-cache",
        "Pragma":           "no-cache",
        "Upgrade-Insecure-Requests": "1",
    }

    def build_url(self, query: str) -> str:
        return f"https://www.amazon.in/s?k={quote_plus(query)}&ref=nb_sb_noss"

    async def _fetch(self, url: str) -> str:
        from utils.http_client import fetch_html
        return await fetch_html(url, headers=self._HEADERS)

    def parse(self, html: str) -> list[dict]:
        soup    = BeautifulSoup(html, "lxml")
        results = []

        for card in soup.select("div[data-component-type='s-search-result']"):
            # Title
            title_el = card.select_one("h2 a span") or card.select_one("h2 span")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)

            # Price
            whole = card.select_one("span.a-price-whole")
            if not whole:
                continue
            try:
                price = float(re.sub(r"[^\d.]", "", whole.get_text()))
                if price <= 0:
                    continue
            except ValueError:
                continue

            # Original / MRP
            orig_el = card.select_one("span.a-text-price span.a-offscreen")
            original_price = None
            if orig_el:
                try:
                    op = float(re.sub(r"[^\d.]", "", orig_el.get_text()))
                    if op > price:
                        original_price = op
                except ValueError:
                    pass

            # Rating
            rating_el = card.select_one("span.a-icon-alt")
            rating = None
            if rating_el:
                try:
                    rating = float(rating_el.get_text(strip=True).split()[0])
                except (ValueError, IndexError):
                    pass

            # Review count
            review_el = card.select_one("span.a-size-base.s-underline-text")
            review_count = None
            if review_el:
                d = re.sub(r"[^\d]", "", review_el.get_text())
                review_count = int(d) if d else None

            # URL
            link = card.select_one("h2 a")
            if not link:
                continue
            href = link.get("href", "")
            url  = href if href.startswith("http") else f"https://www.amazon.in{href}"
            # Remove affiliate/tracking params — keep clean URL
            url = url.split("?")[0] if "/dp/" in url else url

            # Image
            img    = card.select_one("img.s-image")
            img_url = img.get("src") if img else None

            results.append({
                "title":          title,
                "price":          price,
                "original_price": original_price,
                "currency":       "INR",
                "rating":         rating,
                "review_count":   review_count,
                "url":            url,
                "image_url":      img_url,
            })

        return results
