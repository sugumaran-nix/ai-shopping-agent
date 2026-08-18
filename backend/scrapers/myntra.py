"""
Myntra search scraper.

Myntra heavily blocks scrapers including ScraperAPI's standard JS rendering.
Strategy: use ScraperAPI with ultra_premium=true which routes through residential
proxies — costs more credits but actually gets through Myntra's anti-bot.

If that also fails, we return unavailable rather than wasting time retrying.
"""
from __future__ import annotations

import json
import logging
import re

import httpx

from config import get_settings
from models import Product, ScrapeStatus, Source, SourceResult

logger = logging.getLogger("scraper.myntra")
settings = get_settings()

_BASE = "https://www.myntra.com"

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://www.myntra.com/",
    "Origin": "https://www.myntra.com",
    "X-Myntra-Abtest": "true",
}


class MyntraScraper:
    source = Source.MYNTRA

    async def search(self, query: str, scraperapi_key: str | None = None) -> SourceResult:
        import cache as cache_module
        cached = cache_module.get(self.source.value, query)
        if cached and cached.is_fresh:
            products = self._filter_relevant_products(self._products_from_cache(cached), query)
            if products:
                logger.debug("Myntra: fresh cache hit for %s", query[:40])
                return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)

        try:
            products = await self._fetch(query, scraperapi_key)
            if not products:
                raise ValueError("0 relevant products returned from Myntra")

            cache_module.store(
                self.source.value, query,
                [p.model_dump(mode="json") for p in products],
            )
            return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)

        except Exception as exc:  # noqa: BLE001
            logger.error("Myntra failed: %s", exc)
            if cached:
                prods = self._filter_relevant_products(self._products_from_cache(cached), query)
                if prods:
                    return SourceResult(source=self.source, status=ScrapeStatus.STALE, products=prods, error=str(exc))
            return SourceResult(source=self.source, status=ScrapeStatus.UNAVAILABLE, products=[], error=str(exc))

    @staticmethod
    def _products_from_cache(cached: cache_module.CacheEntry) -> list[Product]:
        products: list[Product] = []
        for item in cached.data:
            try:
                products.append(Product(**item))
            except Exception:  # noqa: BLE001
                continue
        return products

    async def _fetch(self, query: str, scraperapi_key: str | None = None) -> list[Product]:
        """
        Try multiple Myntra endpoints in order:
        1. Internal search API (fastest, often blocked)
        2. ScraperAPI with ultra_premium residential proxy
        """
        # Try 1: Myntra internal search API directly
        try:
            products = await self._try_internal_api(query)
            relevant = self._filter_relevant_products(products, query)
            if relevant:
                logger.debug("Myntra: %d relevant products from internal API", len(relevant))
                return relevant
        except Exception as exc:  # noqa: BLE001
            logger.debug("Myntra internal API failed: %s", exc)

        # Try 2: ScraperAPI rendered HTML. The ultra_premium option is plan-dependent
        # and returns 403 for otherwise valid keys, so keep the request portable.
        if scraperapi_key or settings.scraperapi_key:
            try:
                products = await self._try_scraperapi_premium(query, scraperapi_key)
                relevant = self._filter_relevant_products(products, query)
                if relevant:
                    logger.debug("Myntra: %d relevant products from ScraperAPI premium", len(relevant))
                    return relevant
            except Exception as exc:  # noqa: BLE001
                logger.debug("Myntra ScraperAPI premium failed: %s", exc)

        return []

    async def _try_internal_api(self, query: str) -> list[Product]:
        """Myntra's internal XHR search API."""
        from urllib.parse import quote
        url = f"https://www.myntra.com/gateway/v2/search/{quote(query)}"
        params = {"p": 1, "rows": 20, "o": 0, "plaEnabled": "false"}

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=_HEADERS)
            resp.raise_for_status()
            text = resp.text.strip()
            if not text:
                raise ValueError("Empty response")
            data = resp.json()

        return self._parse_api_response(data)

    async def _try_scraperapi_premium(self, query: str, scraperapi_key: str | None = None) -> list[Product]:
        """Fetch rendered Myntra HTML through the standard ScraperAPI plan."""
        from urllib.parse import urlencode
        search_url = f"{_BASE}/search?q={query.strip().replace(' ', '+')}"
        params = {
            "api_key": scraperapi_key or settings.scraperapi_key,
            "url": search_url,
            "render": "true",
            "country_code": "in",
        }
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.get("https://api.scraperapi.com/", params=params)
            resp.raise_for_status()
            html = resp.text

        if not html.strip():
            raise ValueError("Empty HTML from ScraperAPI")

        return self._parse_html(html)

    @staticmethod
    def _find_product_dicts(value) -> list[dict]:
        """Find product-like dicts inside Myntra's changing nested response shapes."""
        found: list[dict] = []

        def walk(node) -> None:
            if isinstance(node, dict):
                has_title = any(node.get(k) for k in ("product", "name", "title"))
                has_price = any(node.get(k) is not None for k in ("discountedPrice", "price", "mrp", "finalPrice"))
                if has_title and has_price:
                    found.append(node)
                for child in node.values():
                    walk(child)
            elif isinstance(node, list):
                for child in node:
                    walk(child)

        walk(value)
        return found

    @staticmethod
    def _query_terms(query: str) -> list[str]:
        stopwords = {"a", "an", "and", "for", "in", "of", "on", "the", "to", "with", "buy", "best", "online"}
        return [term for term in re.findall(r"[a-z0-9]+", query.lower()) if len(term) > 1 and term not in stopwords]

    @staticmethod
    def _term_matches_title(term: str, title_tokens: set[str], title: str) -> bool:
        if term in title_tokens or term in title:
            return True
        singular = term[:-1] if term.endswith("s") and len(term) > 3 else term
        return singular in title_tokens or any(token.rstrip("s") == singular for token in title_tokens)

    @classmethod
    def _filter_relevant_products(cls, products: list[Product], query: str) -> list[Product]:
        terms = cls._query_terms(query)
        if not terms:
            return products

        scored: list[tuple[int, int, Product]] = []
        for index, product in enumerate(products):
            title = re.sub(r"[^a-z0-9 ]+", " ", product.title.lower())
            title_tokens = set(title.split())
            matched = sum(cls._term_matches_title(term, title_tokens, title) for term in terms)
            if matched:
                phrase_bonus = 2 if " ".join(terms) in title else 0
                scored.append((matched + phrase_bonus, -index, product))

        scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return [product for _, _, product in scored]

    def _product_from_item(self, item: dict) -> Product | None:
        brand = str(item.get("brand") or "").strip()
        name = str(item.get("product") or item.get("name") or item.get("title") or "").strip()
        title = f"{brand} {name}".strip() if brand and brand.lower() not in name.lower() else name
        price_raw = item.get("discountedPrice") or item.get("price") or item.get("finalPrice") or item.get("mrp")
        if not title or price_raw in (None, "", 0):
            return None
        try:
            price = float(re.sub(r"[^\d.]", "", str(price_raw)))
            if price <= 0:
                return None
            landing = item.get("landingPageUrl") or item.get("url") or item.get("slugV2") or item.get("slug") or ""
            url = landing if str(landing).startswith("http") else f"{_BASE}/{str(landing).lstrip('/')}" if landing else _BASE
            image = item.get("searchImage") or item.get("image") or item.get("imageUrl")
            return Product(
                source=self.source,
                title=title,
                price=price,
                currency="INR",
                rating=item.get("rating") or item.get("rating_score"),
                review_count=item.get("ratingCount") or item.get("rating_count"),
                url=url,
                image_url=image,
            )
        except (TypeError, ValueError):
            return None

    def _products_from_items(self, items: list[dict]) -> list[Product]:
        products: list[Product] = []
        seen: set[str] = set()
        for item in items:
            product = self._product_from_item(item)
            if product and product.url not in seen:
                seen.add(product.url)
                products.append(product)
        return products

    def _parse_api_response(self, data: dict) -> list[Product]:
        return self._products_from_items(self._find_product_dicts(data))

    def _parse_html(self, html: str) -> list[Product]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")

        # Myntra has used several embedded state names and formatting variants.
        decoder = json.JSONDecoder()
        for script in soup.find_all("script"):
            text = script.get_text() or ""
            for marker in ("window.__myx", "window.__INITIAL_STATE__", "__PRELOADED_STATE__"):
                start = text.find(marker)
                if start < 0:
                    continue
                equals = text.find("=", start)
                if equals < 0:
                    continue
                raw = text[equals + 1:].lstrip()
                try:
                    data, _ = decoder.raw_decode(raw)
                except (TypeError, ValueError):
                    continue
                products = self._products_from_items(self._find_product_dicts(data))
                if products:
                    return products

        # Rendered-card fallback for ScraperAPI responses with JS executed.
        cards = soup.select(
            "li.product-base, li[class*='product-base'], li[class*='results-base'], "
            "div[class*='product-base']"
        )
        products: list[Product] = []
        for card in cards:
            brand_el = card.select_one("h3.product-brand, [class*='product-brand']")
            name_el = card.select_one("h4.product-product, h4, [class*='product-product']")
            price_el = card.select_one(
                "span.product-discountedPrice, div.product-price span, "
                "[class*='discountedPrice'], [class*='product-price'], [class*='price']"
            )
            link_el = card.select_one("a[href]")
            if not name_el or not price_el:
                continue
            item = {
                "brand": brand_el.get_text(" ", strip=True) if brand_el else "",
                "name": name_el.get_text(" ", strip=True),
                "price": price_el.get_text(" ", strip=True),
                "url": link_el.get("href", "") if link_el else "",
            }
            image_el = card.select_one("img")
            if image_el:
                item["image"] = image_el.get("src") or image_el.get("data-src")
            product = self._product_from_item(item)
            if product:
                products.append(product)

        return self._products_from_items([p.model_dump() for p in products])
