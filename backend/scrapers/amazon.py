"""
Amazon.in search-results scraper.

Uses multiple selector fallbacks since Amazon A/B tests layouts constantly.
If this returns 0 results, inspect provider-returned HTML and current selectors.
"""
from __future__ import annotations

import logging
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper
from utils.headers import clean_price, clean_rating, clean_reviews, extract_image_url, make_absolute_url

_BASE = "https://www.amazon.in"
logger = logging.getLogger("scraper.amazon")


class AmazonScraper(BaseScraper):
    source = Source.AMAZON

    def build_search_url(self, query: str) -> str:
        return (
            f"{_BASE}/s?k={quote_plus(query)}"
            f"&ref=nb_sb_noss"
        )

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Amazon uses several different card containers depending on layout
        cards = (
            soup.select("div[data-component-type='s-search-result']")
            or soup.select("div[data-asin]:not([data-asin=''])")
            or soup.select("div.s-result-item[data-asin]")
        )

        logger.debug("Amazon: found %d cards", len(cards))

        for card in cards:
            # Skip sponsored/ad cards without a proper asin
            asin = card.get("data-asin", "").strip()
            if not asin:
                continue

            # ── Title — multiple fallback selectors ────────────────────────
            title = ""
            for sel in [
                "h2 a span",
                "h2 span.a-text-normal",
                "h2 span",
                "span.a-text-normal",
                "[data-cy='title-recipe'] span",
            ]:
                el = card.select_one(sel)
                if el:
                    title = el.get_text(strip=True)
                    if len(title) > 3:
                        break
            if not title:
                continue

            # ── Price — multiple fallback selectors ────────────────────────
            price = None
            for sel in [
                "span.a-price > span.a-offscreen",   # most reliable — full price in offscreen span
                "span.a-price-whole",
                ".a-price .a-offscreen",
                "span[data-a-color='price'] span.a-offscreen",
            ]:
                el = card.select_one(sel)
                if el:
                    price = clean_price(el.get_text(strip=True))
                    if price:
                        break
            if not price:
                continue

            # ── URL ────────────────────────────────────────────────────────
            link_el = card.select_one("h2 a") or card.select_one("a.a-link-normal[href*='/dp/']")
            if not link_el:
                continue
            full_url = make_absolute_url(link_el.get("href", ""), _BASE)
            if not full_url:
                continue

            # ── Rating ─────────────────────────────────────────────────────
            rating = None
            for sel in ["span.a-icon-alt", "i.a-icon-star span.a-icon-alt"]:
                el = card.select_one(sel)
                if el:
                    rating = clean_rating(el.get_text(strip=True))
                    if rating:
                        break

            # ── Reviews ────────────────────────────────────────────────────
            review_count = None
            for sel in [
                "span[aria-label*='rating']",
                "span.a-size-base.s-underline-text",
                "a[href*='customerReviews'] span",
            ]:
                el = card.select_one(sel)
                if el:
                    review_count = clean_reviews(el.get_text(strip=True))
                    if review_count:
                        break

            # ── Image ──────────────────────────────────────────────────────
            img_el = card.select_one("img.s-image") or card.select_one("img[data-image-latency]")
            image_url = extract_image_url(img_el, _BASE)

            # ── Currency ───────────────────────────────────────────────────
            sym_el = card.select_one("span.a-price-symbol")
            currency = "USD" if sym_el and "$" in sym_el.get_text() else "INR"

            results.append({
                "title": title,
                "price": price,
                "currency": currency,
                "rating": rating,
                "review_count": review_count,
                "url": full_url,
                "image_url": image_url,
            })

        logger.debug("Amazon: parsed %d valid products", len(results))
        return results
