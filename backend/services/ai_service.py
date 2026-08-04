"""
Gemini-based buying recommendation.

Improvements:
  - Model name is configurable via settings (not hardcoded)
  - Max products per source is configurable
  - Explicit timeout via asyncio.wait_for
  - AI errors logged at WARNING level (not ERROR) — a missing API key
    is expected in dev, not a service fault
  - Prompt structured as a reusable template
  - No internal details leaked in error messages returned to callers
"""
from __future__ import annotations

import asyncio
import logging

import google.generativeai as genai

from config import get_settings
from models import Product, ScrapeStatus, SourceResult

logger = logging.getLogger("ai")
settings = get_settings()

if settings.gemini_enabled:
    genai.configure(api_key=settings.gemini_api_key)

# ── Prompt template ───────────────────────────────────────────────────────────
_PROMPT_TEMPLATE = """\
You are a concise shopping assistant. A user searched for: "{query}"

Below is REAL product data fetched just now from multiple retailers.
Sources marked STALE show last-known data (couldn't be freshly checked).
Sources marked unavailable had errors and returned nothing.

{product_block}

Give a short (3–5 sentence) buying recommendation based ONLY on the data above.
- Name the specific best-value option(s) with their actual price.
- If data is too limited or too stale to recommend confidently, say that directly.
- Do not invent products, prices, or availability not shown above.
- Do not recommend from UNAVAILABLE sources."""


def _format_products_for_prompt(results: list[SourceResult]) -> str:
    lines = []
    for result in results:
        if result.status == ScrapeStatus.UNAVAILABLE:
            lines.append(f"\n{result.source.value.upper()}: unavailable")
            continue

        freshness = "current" if result.status == ScrapeStatus.FRESH else "STALE / may be outdated"
        lines.append(f"\n{result.source.value.upper()} ({freshness}):")
        for p in result.products[: settings.ai_max_products_per_source]:
            rating_str = f", {p.rating}/5 stars" if p.rating else ""
            lines.append(f"  - {p.title} — {p.currency} {p.price:.2f}{rating_str}")

    return "\n".join(lines) if lines else "No product data available from any source."


async def generate_recommendation(
    query: str, results: list[SourceResult]
) -> tuple[str | None, str | None]:
    """
    Returns (recommendation_text, error_message).
    Exactly one will be non-None.
    Internal error details are logged but never returned to callers.
    """
    if not settings.gemini_enabled:
        return None, "AI recommendations not available (GEMINI_API_KEY not configured)"

    has_products = any(r.products for r in results)
    if not has_products:
        return None, "No valid product data was available to analyze"

    product_block = _format_products_for_prompt(results)
    prompt = _PROMPT_TEMPLATE.format(query=query, product_block=product_block)

    try:
        model = genai.GenerativeModel(settings.gemini_model)
        response = await asyncio.wait_for(
            model.generate_content_async(prompt),
            timeout=settings.ai_request_timeout_seconds,
        )
        text = response.text.strip() if response.text else ""
        if not text:
            return None, "AI returned an empty response"
        return text, None

    except asyncio.TimeoutError:
        logger.warning("Gemini request timed out after %ds", settings.ai_request_timeout_seconds)
        return None, "AI analysis timed out — try again in a moment"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini request failed: %s", exc)
        return None, "AI analysis temporarily unavailable"
