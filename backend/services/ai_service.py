"""
Gemini-based buying recommendation.

Key fix vs. the old version: the prompt is built ONLY from products that
passed validation and are explicitly labeled fresh/stale, and the model is
instructed to reason strictly from that data and to say so plainly if the
data is too thin - instead of Gemini being handed a pile of possibly-broken
scraped text and asked to "recommend the best deal" regardless.
"""
from __future__ import annotations

import logging

import google.generativeai as genai

from config import get_settings
from models import Product, ScrapeStatus, SourceResult

logger = logging.getLogger("ai")

settings = get_settings()

if settings.gemini_enabled:
    genai.configure(api_key=settings.gemini_api_key)

_MODEL_NAME = "gemini-2.0-flash"


def _format_products_for_prompt(results: list[SourceResult]) -> str:
    lines = []
    for result in results:
        if result.status == ScrapeStatus.UNAVAILABLE:
            lines.append(f"\n{result.source.value.upper()}: unavailable ({result.error})")
            continue

        freshness = "current" if result.status == ScrapeStatus.FRESH else "STALE / last-known data, may be outdated"
        lines.append(f"\n{result.source.value.upper()} ({freshness}):")
        for p in result.products[:10]:
            rating_str = f", rating {p.rating}/5" if p.rating else ""
            lines.append(f"  - {p.title} — {p.currency} {p.price:.2f}{rating_str} ({p.url})")

    return "\n".join(lines) if lines else "No product data available from any source."


async def generate_recommendation(query: str, results: list[SourceResult]) -> tuple[str | None, str | None]:
    """Returns (recommendation, error) - exactly one will be non-None."""
    if not settings.gemini_enabled:
        return None, "GEMINI_API_KEY not configured"

    has_any_products = any(r.products for r in results)
    if not has_any_products:
        return None, "No valid product data was available to analyze (all sources failed or returned no valid results)"

    product_block = _format_products_for_prompt(results)

    prompt = f"""You are a shopping assistant. A user searched for: "{query}"

Below is REAL product data scraped/fetched just now from multiple retailers.
Some sources may be marked STALE (couldn't be freshly checked, showing last
known data) or unavailable - factor that into your confidence, and say so.

{product_block}

Give a short (3-5 sentence) buying recommendation based ONLY on the data
above. Name the specific best-value option(s) with their actual price.
If the data is too limited or too stale to recommend confidently, say that
directly instead of making something up."""

    try:
        model = genai.GenerativeModel(_MODEL_NAME)
        response = await model.generate_content_async(prompt)
        return response.text.strip(), None
    except Exception as exc:  # noqa: BLE001
        logger.error("Gemini request failed: %s", exc)
        return None, f"AI analysis failed: {exc}"
