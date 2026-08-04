"""
Amazon.in search-results scraper.

Amazon changes its result-page markup frequently and varies it by region
and experiment. The selectors below are a current baseline — check
/api/v1/health when this starts returning zero results.

Uses shared utility functions from utils/headers.py instead of duplicating
price/rating parsing logic.
"""
from __future__ import annotations

from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper
from utils.headers import clean_price, clean_rating, clean_reviews, make_absolute_url

_BASE = "https://www.amazon.in"


class AmazonScraper(BaseScraper):
    source = Source.AMAZON

    def build_search_url(self, query: str) -> str:
        return f"{_BASE}/s?k={quote_plus(query)}"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        results = []

        for card in soup.select("div[data-component-type='s-search-result']"):
            # ── Title ──────────────────────────────────────────────────────
            title_el = card.select_one("h2 a span") or card.select_one("h2 span")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)

            # ── Price ──────────────────────────────────────────────────────
            price_el = card.select_one("span.a-price-whole")
            if not price_el:
                continue
            price = clean_price(price_el.get_text(strip=True))
            if price is None:
                continue

            # ── URL ────────────────────────────────────────────────────────
            link_el = card.select_one("h2 a")
            if not link_el:
                continue
            href = link_el.get("href", "")
            full_url = make_absolute_url(href, _BASE)
            if not full_url:
                continue

            # ── Rating ─────────────────────────────────────────────────────
            rating_el = card.select_one("span.a-icon-alt")
            rating = clean_rating(rating_el.get_text(strip=True)) if rating_el else None

            # ── Review count ───────────────────────────────────────────────
            review_el = (
                card.select_one("span[aria-label][dir='auto']")
                or card.select_one("span.a-size-base.s-underline-text")
            )
            review_count = clean_reviews(review_el.get_text(strip=True)) if review_el else None

            # ── Image ──────────────────────────────────────────────────────
            img_el = card.select_one("img.s-image")
            image_url = img_el.get("src") if img_el else None

            # ── Currency ───────────────────────────────────────────────────
            symbol_el = card.select_one("span.a-price-symbol")
            currency = "USD" if symbol_el and symbol_el.get_text(strip=True) == "$" else "INR"

            results.append({
                "title": title,
                "price": price,
                "currency": currency,
                "rating": rating,
                "review_count": review_count,
                "url": full_url,
                "image_url": image_url,
            })

        return results
