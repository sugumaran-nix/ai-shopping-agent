"""
Flipkart search scraper — curl_cffi Chrome TLS impersonation.
Flipkart uses Cloudflare; success rate ~60% from datacenter IPs.

Structural anchor: <a href containing '/p/'> is more durable than
class names which Flipkart A/B-tests frequently.
"""
from __future__ import annotations
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from models import Source
from scrapers.base import BaseScraper


class FlipkartScraper(BaseScraper):
    source = Source.FLIPKART

    _HEADERS = {
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    }

    def build_url(self, query: str) -> str:
        return (
            f"https://www.flipkart.com/search?q={quote_plus(query)}"
            f"&sort=relevance&otracker=search&iid=en_mQpfT"
        )

    async def _fetch(self, url: str) -> str:
        from utils.http_client import fetch_html
        return await fetch_html(url, headers=self._HEADERS)

    def parse(self, html: str) -> list[dict]:
        soup    = BeautifulSoup(html, "lxml")
        results = []
        seen    = set()

        for anchor in soup.select("a[href*='/p/']"):
            href = anchor.get("href", "")
            url  = href if href.startswith("http") else f"https://www.flipkart.com{href}"
            # De-duplicate
            base_url = url.split("?")[0]
            if base_url in seen:
                continue
            seen.add(base_url)

            container = anchor.find_parent("div")
            if not container:
                continue

            # Title — prefer the anchor's title attribute
            title = anchor.get("title") or anchor.get_text(strip=True)
            if not title or len(title.strip()) < 3:
                continue

            # Price — first ₹-prefixed string in container
            price_text = container.find(
                string=lambda s: s and s.strip().startswith("₹")
            )
            if not price_text:
                continue
            try:
                price = float(re.sub(r"[^\d.]", "", price_text.strip()))
                if price <= 0:
                    continue
            except ValueError:
                continue

            # MRP / original price — second ₹-prefixed string greater than price
            original_price = None
            for s in container.find_all(
                string=lambda t: t and t.strip().startswith("₹")
            ):
                try:
                    op = float(re.sub(r"[^\d.]", "", s.strip()))
                    if op > price:
                        original_price = op
                        break
                except ValueError:
                    pass

            # Rating
            rating = None
            for cls in ["._3LWZlK", ".XQDdHH", "._1lRcqv"]:
                el = container.select_one(cls)
                if el:
                    try:
                        rating = float(el.get_text(strip=True))
                        break
                    except ValueError:
                        pass

            # Image
            img    = container.select_one("img")
            img_url = img.get("src") if img else None

            results.append({
                "title":          title.strip(),
                "price":          price,
                "original_price": original_price,
                "currency":       "INR",
                "rating":         rating,
                "url":            url,
                "image_url":      img_url,
            })

        return results
