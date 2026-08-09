"""
AJIO scraper — calls AJIO's internal product catalog JSON API directly.

AJIO's search page loads products via XHR to:
  https://www.ajio.com/api/search?text={query}&pageSize=45&currentPage=0
  &format=json&query={query}%3Arelevance&sortBy=relevance

This returns clean, structured JSON — no HTML parsing, no fragile selectors,
no Cloudflare, no TLS issues.  Most reliable source in the entire app.
"""
from __future__ import annotations
import logging
from urllib.parse import quote_plus
from models import Source, Status, SourceResult
from utils.http_client import fetch_json, FetchError
import cache as cache_module
from models import Product

log = logging.getLogger("scraper.ajio")

_HEADERS = {
    "Accept":          "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Origin":          "https://www.ajio.com",
    "Referer":         "https://www.ajio.com/",
}

_API = (
    "https://www.ajio.com/api/search"
    "?text={q}&pageSize=45&currentPage=0"
    "&format=json&query={q}%3Arelevance&sortBy=relevance"
)


class AjioScraper:
    """
    AjioScraper does not extend BaseScraper because it calls a JSON API
    directly rather than fetching HTML — it manages its own cache lifecycle.
    """
    source = Source.AJIO

    async def search(self, query: str) -> SourceResult:
        cached = cache_module.get(self.source.value, query)
        if cached and cached.is_fresh:
            return SourceResult(
                source=self.source,
                status=Status.FRESH,
                products=[Product(**p) for p in cached.data],
            )

        url = _API.format(q=quote_plus(query))
        try:
            data = await fetch_json(url, headers=_HEADERS)
        except FetchError as exc:
            log.error("ajio: %s", exc)
            if cached:
                return SourceResult(
                    source=self.source,
                    status=Status.STALE,
                    products=[Product(**p) for p in cached.data],
                    error=str(exc),
                )
            return SourceResult(
                source=self.source,
                status=Status.UNAVAILABLE,
                products=[],
                error=str(exc),
            )

        products = self._parse(data)
        if not products:
            error = "AJIO returned 0 products — API shape may have changed"
            log.warning("ajio: %s", error)
            if cached:
                return SourceResult(
                    source=self.source,
                    status=Status.STALE,
                    products=[Product(**p) for p in cached.data],
                    error=error,
                )
            return SourceResult(
                source=self.source,
                status=Status.UNAVAILABLE,
                products=[],
                error=error,
            )

        cache_module.set(
            self.source.value, query,
            [p.model_dump(mode="json") for p in products],
        )
        log.info("ajio: %d products", len(products))
        return SourceResult(source=self.source, status=Status.FRESH, products=products)

    def _parse(self, data: dict) -> list[Product]:
        products = []
        items = (
            data.get("searchresult", {})
                .get("products", {})
                .get("entries", [])
            or data.get("products", {}).get("entries", [])
            or []
        )
        for item in items:
            try:
                price     = float(item.get("price", {}).get("value", 0))
                mrp       = float(item.get("wasPriceData", {}).get("value", 0) or 0)
                name      = item.get("name", "").strip()
                brand     = item.get("fnlColorVariantData", [{}])[0].get("brandname") if item.get("fnlColorVariantData") else item.get("brandname", "")
                slug      = item.get("url", "")
                img_list  = item.get("images", [])
                img_url   = img_list[0].get("url") if img_list else None

                if not name or price <= 0 or not slug:
                    continue

                products.append(Product(
                    source=self.source,
                    title=name,
                    price=price,
                    original_price=mrp if mrp > price else None,
                    currency="INR",
                    brand=brand or None,
                    url=f"https://www.ajio.com{slug}",
                    image_url=img_url,
                ))
            except Exception:
                continue
        return products
