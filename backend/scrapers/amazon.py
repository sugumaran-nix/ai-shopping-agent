"""
Amazon.in search-results scraper.

IMPORTANT: Amazon changes its result-page markup often and varies it by
region/experiment. The selectors below are a reasonable current baseline,
not a permanent guarantee. This is exactly why `BaseScraper` never lets a
selector failure look like "no results" - it's surfaced as an error and
caught by /health so you find out the day it breaks, not from a user
complaint.
"""
from __future__ import annotations

from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper


class AmazonScraper(BaseScraper):
    source = Source.AMAZON

    def build_search_url(self, query: str) -> str:
        return f"https://www.amazon.in/s?k={quote_plus(query)}"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        results = []

        for card in soup.select("div[data-component-type='s-search-result']"):
            title_el = card.select_one("h2 a span") or card.select_one("h2 span")
            price_whole = card.select_one("span.a-price-whole")
            price_symbol = card.select_one("span.a-price-symbol")
            rating_el = card.select_one("span.a-icon-alt")
            review_el = card.select_one("span[aria-label][dir='auto']") or card.select_one(
                "span.a-size-base.s-underline-text"
            )
            link_el = card.select_one("h2 a")
            img_el = card.select_one("img.s-image")

            if not (title_el and price_whole and link_el):
                # Missing a core field (e.g. a sponsored/ad card with a
                # different layout) - skip rather than guess.
                continue

            try:
                price = float(price_whole.get_text(strip=True).replace(",", "").rstrip("."))
            except ValueError:
                continue

            rating = None
            if rating_el:
                try:
                    rating = float(rating_el.get_text(strip=True).split(" ")[0])
                except (ValueError, IndexError):
                    rating = None

            review_count = None
            if review_el:
                digits = "".join(ch for ch in review_el.get_text(strip=True) if ch.isdigit())
                if digits:
                    review_count = int(digits)

            href = link_el.get("href", "")
            full_url = href if href.startswith("http") else f"https://www.amazon.in{href}"

            results.append(
                {
                    "title": title_el.get_text(strip=True),
                    "price": price,
                    "currency": "INR" if not price_symbol or price_symbol.get_text(strip=True) != "$" else "USD",
                    "rating": rating,
                    "review_count": review_count,
                    "url": full_url,
                    "image_url": img_el.get("src") if img_el else None,
                }
            )

        return results
