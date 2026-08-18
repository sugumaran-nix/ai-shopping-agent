"""
Myntra search scraper with direct API, browser, and bounded provider fallbacks.
"""
from __future__ import annotations

import json
import logging
import re

import httpx

from models import Product, ScrapeStatus, Source, SourceResult
from services.browser_manager import render_page_html
from utils.headers import extract_image_url, normalize_image_url
from utils.http_client import ProviderCredentials, fetch_html

logger = logging.getLogger("scraper.myntra")

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

    async def search(self, query: str, provider_credentials: ProviderCredentials | None = None) -> SourceResult:
        import cache as cache_module
        cached = cache_module.get(self.source.value, query)
        if cached and cached.is_fresh:
            products = self._filter_relevant_products(self._products_from_cache(cached), query)
            if products:
                logger.debug("Myntra: fresh cache hit for %s", query[:40])
                return SourceResult(source=self.source, status=ScrapeStatus.FRESH, products=products)

        try:
            products = await self._fetch(query, provider_credentials)
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

    async def _fetch(self, query: str, provider_credentials: ProviderCredentials | None = None) -> list[Product]:
        """
        Try multiple Myntra endpoints in order:
        1. Internal search API (fastest, often blocked)
        2. Shared provider fallback: ScrapingAnt, then Bright Data
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

        # Try 2: shared headless browser with a source-specific product container wait.
        try:
            from urllib.parse import quote_plus
            html = await render_page_html(
                f"{_BASE}/search?q={quote_plus(query.strip())}",
                wait_for_selectors=("li.product-base", "li[class*='product-base']", "body"),
                timeout_ms=45_000,
            )
            products = self._parse_html(html, query=query)
            relevant = self._filter_relevant_products(products, query)
            if relevant:
                logger.debug("Myntra: %d relevant products from Playwright", len(relevant))
                return relevant
        except Exception as exc:  # noqa: BLE001
            logger.debug("Myntra Playwright fallback failed: %s", exc)

        # Try 3: provider fallback through ScrapingAnt, then Bright Data.
        try:
            products = await self._try_provider_fallback(query, provider_credentials)
            relevant = self._filter_relevant_products(products, query)
            if relevant:
                logger.debug("Myntra: %d relevant products from provider fallback", len(relevant))
                return relevant
        except Exception as exc:  # noqa: BLE001
            logger.debug("Myntra provider fallback failed: %s", exc)

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

    async def _try_provider_fallback(self, query: str, provider_credentials: ProviderCredentials | None = None) -> list[Product]:
        """Fetch rendered Myntra HTML through the shared provider chain."""
        from urllib.parse import quote, quote_plus

        slug = re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")
        encoded_query = quote_plus(query.strip())
        target_urls = (
            f"{_BASE}/{quote(slug)}?rawQuery={encoded_query}",
            f"{_BASE}/search?q={encoded_query}",
        )
        last_error: Exception | None = None
        for target_url in target_urls:
            try:
                html = await fetch_html(
                    target_url,
                    credentials=provider_credentials,
                    render_js=True,
                    country_code="in",
                )
                products = self._parse_html(html, query=query)
                if products:
                    return products
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.debug("Myntra provider route failed for %s: %s", target_url, exc)

        if last_error:
            raise last_error
        return []

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
        aliases = {
            "phone": {"phone", "mobile", "smartphone", "cell", "case", "cover", "back"},
            "case": {"case", "cases", "cover", "covers", "back", "bumper", "flip", "wallet", "pouch"},
            "cover": {"cover", "covers", "case", "cases", "back", "bumper", "flip", "wallet", "pouch"},
            "kurti": {"kurti", "kurtis", "kurta", "kurtas", "tunic"},
            "kurta": {"kurti", "kurtis", "kurta", "kurtas", "tunic"},
            "earbuds": {"earbuds", "earbud", "buds", "airpods", "earphones"},
            "wireless": {"wireless", "bluetooth", "tws"},
            "shoes": {"shoes", "shoe", "sneakers", "trainers", "footwear"},
            "running": {"running", "jogging", "sports", "athletic"},
        }
        candidates = aliases.get(term, {term})
        if any(candidate in title_tokens or candidate in title for candidate in candidates):
            return True
        singular = term[:-1] if term.endswith("s") and len(term) > 3 else term
        return singular in title_tokens or any(token.rstrip("s") == singular for token in title_tokens)

    @classmethod
    def _filter_relevant_products(cls, products: list[Product], query: str) -> list[Product]:
        terms = cls._query_terms(query)
        if not terms:
            return products

        first_model_index = next((index for index, term in enumerate(terms) if any(char.isdigit() for char in term)), None)
        identity_terms = terms[: first_model_index + 1] if first_model_index is not None else []
        minimum_matches = len(terms)
        scored: list[tuple[int, int, Product]] = []
        for index, product in enumerate(products):
            title = re.sub(r"[^a-z0-9 ]+", " ", product.title.lower())
            title_tokens = set(title.split())
            matched_terms = [term for term in terms if cls._term_matches_title(term, title_tokens, title)]
            identity_matches = all(term in title_tokens for term in identity_terms)
            if identity_matches and len(matched_terms) >= minimum_matches:
                phrase_bonus = 2 if " ".join(terms) in title else 0
                scored.append((len(matched_terms) + phrase_bonus, -index, product))

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
            image = normalize_image_url(item.get("searchImage") or item.get("image") or item.get("imageUrl"), _BASE)
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

    def _parse_html(self, html: str, query: str | None = None) -> list[Product]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")

        # Myntra has used several embedded state names and formatting variants.
        # A page can contain recommendation/product lists before the actual query
        # list, so query-aware parsing must scan every state block before choosing.
        decoder = json.JSONDecoder()
        fallback_products: list[Product] = []
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
                if not products:
                    continue
                if not fallback_products:
                    fallback_products = products
                if query:
                    relevant = self._filter_relevant_products(products, query)
                    if relevant:
                        return relevant
                else:
                    return products

        # Rendered-card fallback for provider responses with JS executed.
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
                item["image"] = extract_image_url(image_el, _BASE)
            product = self._product_from_item(item)
            if product:
                products.append(product)

        parsed = self._products_from_items([p.model_dump() for p in products])
        if parsed:
            return self._filter_relevant_products(parsed, query) if query else parsed
        return self._filter_relevant_products(fallback_products, query) if query else fallback_products
