"""
Flipkart search-results scraper.

Flipkart reuses generic class names across A/B tests. Matching on structural
anchors (an <a> with href containing '/p/') is more durable than betting on
a specific class string.
"""
from __future__ import annotations

from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper
from utils.headers import clean_price, clean_rating, extract_image_url, make_absolute_url

_BASE = "https://www.flipkart.com"


class FlipkartScraper(BaseScraper):
    source = Source.FLIPKART

    def build_search_url(self, query: str) -> str:
        return f"{_BASE}/search?q={quote_plus(query)}"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        seen_urls: set[str] = set()
        results = []

        for anchor in soup.select("a[href*='/p/']"):
            container = anchor.find_parent("div")
            if container is None:
                continue

            title = anchor.get("title") or anchor.get_text(strip=True)
            if not title or len(title) < 3:
                continue

            price_el = container.find(string=lambda s: s and s.strip().startswith("₹"))
            if not price_el:
                continue
            price = clean_price(price_el.strip())
            if price is None:
                continue

            href = anchor.get("href", "")
            full_url = make_absolute_url(href, _BASE)
            if not full_url or full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            rating_el = container.select_one("div._3LWZlK, div.XQDdHH")
            rating = clean_rating(rating_el.get_text(strip=True)) if rating_el else None

            img_el = container.select_one("img")
            image_url = extract_image_url(img_el, _BASE)

            results.append({
                "title": title,
                "price": price,
                "currency": "INR",
                "rating": rating,
                "review_count": None,
                "url": full_url,
                "image_url": image_url,
            })

        return results
