"""
Gemini-based buying recommendation via REST API (not gRPC SDK).

Supports two key sources in priority order:
  1. User-supplied key (passed per request from frontend)
  2. Server GEMINI_API_KEY env var (fallback)

This lets the system work even when the server key is exhausted —
users can supply their own free Gemini key.
"""
from __future__ import annotations

import asyncio
import logging

import httpx

from config import get_settings
from models import ScrapeStatus, SourceResult

logger = logging.getLogger("ai")
settings = get_settings()

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)

_PROMPT_TEMPLATE = """\
You are a concise shopping assistant. A user searched for: "{query}"

Below is REAL product data fetched right now from multiple retailers.
Sources marked STALE show last-known data (live fetch failed).
Sources marked UNAVAILABLE returned nothing.

{product_block}

Write a 3-5 sentence buying recommendation using ONLY the data above:
- Cite specific product names and their exact prices.
- If data is too sparse or stale to recommend confidently, say so directly.
- Never invent products, prices, or ratings not listed above.
- Never recommend from UNAVAILABLE sources."""


def _format_products(results: list[SourceResult]) -> str:
    lines: list[str] = []
    for result in results:
        if result.status == ScrapeStatus.UNAVAILABLE:
            lines.append(f"\n{result.source.value.upper()}: UNAVAILABLE")
            continue
        label = "current" if result.status == ScrapeStatus.FRESH else "STALE"
        lines.append(f"\n{result.source.value.upper()} ({label}):")
        for p in result.products[: settings.ai_max_products_per_source]:
            stars = f", {p.rating}/5 stars" if p.rating is not None else ""
            lines.append(f"  - {p.title} — {p.currency} {p.price:.0f}{stars}")
    return "\n".join(lines) or "No product data available."


def _fallback_recommendation(query: str, results: list[SourceResult]) -> str | None:
    """Give a transparent, deterministic summary when the optional AI provider is busy."""
    products = [
        product
        for result in results
        if result.status != ScrapeStatus.UNAVAILABLE
        for product in result.products
    ]
    if not products:
        return None

    cheapest = min(products, key=lambda product: product.price)
    rated = [product for product in products if product.rating is not None]
    best_rated = max(rated, key=lambda product: product.rating) if rated else None
    sources = sorted({product.source.value.title() for product in products})

    recommendation = (
        f"For {query}, the lowest listed price is {cheapest.currency} {cheapest.price:.0f} "
        f"for {cheapest.title} on {cheapest.source.value.title()}."
    )
    if best_rated and best_rated.url != cheapest.url:
        recommendation += (
            f" The highest visible rating is {best_rated.rating:.1f}/5 for "
            f"{best_rated.title} on {best_rated.source.value.title()} at "
            f"{best_rated.currency} {best_rated.price:.0f}."
        )
    recommendation += (
        f" I compared {len(products)} listed products across {', '.join(sources)}. "
        "Prices and availability can change, so verify the retailer page before buying."
    )
    return recommendation


async def generate_recommendation(
    query: str,
    results: list[SourceResult],
    user_gemini_key: str | None = None,
) -> tuple[str | None, str | None]:
    """
    Returns (recommendation_text, error_message).
    Tries user_gemini_key first, then falls back to server key.
    """
    # Pick which key to use
    key = (user_gemini_key or "").strip() or settings.gemini_api_key

    if not any(r.products for r in results):
        return None, "No product data available to analyse"

    fallback = _fallback_recommendation(query, results)
    if not key:
        return fallback, "AI provider not configured — showing a data-based summary"

    prompt = _PROMPT_TEMPLATE.format(
        query=query,
        product_block=_format_products(results),
    )

    url = _GEMINI_URL.format(model=settings.gemini_model, key=key)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 512,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=settings.ai_request_timeout_seconds) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in (429, 500, 502, 503, 504):
                logger.warning("Gemini transient HTTP error %d; retrying once", resp.status_code)
                await asyncio.sleep(1)
                resp = await client.post(url, json=payload)

        if resp.status_code == 400:
            logger.warning("Gemini 400: %s", resp.text[:200])
            return fallback, "Invalid Gemini request — showing a data-based summary"

        if resp.status_code == 403:
            return fallback, "Gemini key is unavailable — showing a data-based summary"

        if resp.status_code in (429, 500, 502, 503, 504):
            logger.warning("Gemini remained unavailable after retry: %d", resp.status_code)
            return fallback, "Gemini is temporarily busy — showing a data-based summary"

        resp.raise_for_status()
        data = resp.json()

        candidates = data.get("candidates") or []
        if not candidates:
            block_reason = (data.get("promptFeedback") or {}).get("blockReason")
            if block_reason:
                return fallback, "Gemini could not answer this search — showing a data-based summary"
            return fallback, "Gemini returned no text — showing a data-based summary"

        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "\n".join(
            part.get("text", "").strip()
            for part in parts
            if isinstance(part, dict) and part.get("text") and not part.get("thought")
        ).strip()

        if not text:
            return fallback, "Gemini returned no text — showing a data-based summary"

        return text, None

    except httpx.TimeoutException:
        logger.warning("Gemini timed out after %ds", settings.ai_request_timeout_seconds)
        return fallback, "Gemini timed out — showing a data-based summary"
    except httpx.HTTPStatusError as exc:
        logger.warning("Gemini HTTP error %d: %s", exc.response.status_code, exc.response.text[:100])
        return fallback, "Gemini is temporarily unavailable — showing a data-based summary"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini error: %s", type(exc).__name__)
        return fallback, "Gemini is temporarily unavailable — showing a data-based summary"
