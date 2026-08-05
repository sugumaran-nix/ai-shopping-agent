"""
Flipkart search-results scraper.

Same caveat as amazon.py: Flipkart's layout varies by product category
(electronics vs fashion vs generic grid). This covers the common grid/list
layout; category-specific edge cases are exactly what /health's canary
queries are for - run a few representative category queries daily and you'll
see this scraper's success rate drop before users report broken results.
"""
from __future__ import annotations

from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper


class FlipkartScraper(BaseScraper):
    source = Source.FLIPKART

    def build_search_url(self, query: str) -> str:
        return f"https://www.flipkart.com/search?q={quote_plus(query)}"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Flipkart reuses generic class names across A/B tests; matching on
        # structural anchors (an <a> with an href containing '/p/') is more
        # durable than betting on a specific class string.
        for anchor in soup.select("a[href*='/p/']"):
            container = anchor.find_parent("div")
            if container is None:
                continue

            title = anchor.get("title") or anchor.get_text(strip=True)
            price_el = container.find(string=lambda s: s and s.strip().startswith("₹"))
            if not title or not price_el:
                continue

            price_text = price_el.strip().lstrip("₹").replace(",", "")
            try:
                price = float(price_text)
            except ValueError:
                continue

            rating = None
            rating_el = container.select_one("div._3LWZlK, div.XQDdHH")
            if rating_el:
                try:
                    rating = float(rating_el.get_text(strip=True))
                except ValueError:
                    rating = None

            img_el = container.select_one("img")
            href = anchor.get("href", "")
            full_url = href if href.startswith("http") else f"https://www.flipkart.com{href}"

            results.append(
                {
                    "title": title,
                    "price": price,
                    "currency": "INR",
                    "rating": rating,
                    "review_count": None,
                    "url": full_url,
                    "image_url": img_el.get("src") if img_el else None,
                }
            )

        # De-duplicate: the anchor-based selector can match the same card twice
        # (image link + title link both contain '/p/').
        seen_urls = set()
        deduped = []
        for r in results:
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                deduped.append(r)

        return deduped
