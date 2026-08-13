"""
Gemini-based buying recommendation.

Returns (recommendation, error) — exactly one is always non-None.
Internal error details are logged but never surfaced to callers.
"""
from __future__ import annotations

import asyncio
import logging

import google.generativeai as genai

from config import get_settings
from models import ScrapeStatus, SourceResult

logger = logging.getLogger("ai")
settings = get_settings()

if settings.gemini_enabled:
    genai.configure(api_key=settings.gemini_api_key)

_PROMPT_TEMPLATE = """\
You are a concise shopping assistant. A user searched for: "{query}"

Below is REAL product data fetched right now from multiple retailers.
Sources marked STALE show last-known data (live fetch failed).
Sources marked UNAVAILABLE returned nothing.

{product_block}

Write a 3–5 sentence buying recommendation using ONLY the data above:
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
            stars = f", {p.rating}/5★" if p.rating is not None else ""
            lines.append(f"  • {p.title} — {p.currency} {p.price:.2f}{stars}")
    return "\n".join(lines) or "No product data available."


async def generate_recommendation(
    query: str, results: list[SourceResult]
) -> tuple[str | None, str | None]:
    if not settings.gemini_enabled:
        return None, "AI recommendations unavailable (GEMINI_API_KEY not configured)"

    if not any(r.products for r in results):
        return None, "No product data available to analyse"

    prompt = _PROMPT_TEMPLATE.format(
        query=query,
        product_block=_format_products(results),
    )

    try:
        model = genai.GenerativeModel(settings.gemini_model)
        response = await asyncio.wait_for(
            model.generate_content_async(prompt),
            timeout=settings.ai_request_timeout_seconds,
        )
        text = (response.text or "").strip()
        if not text:
            return None, "AI returned an empty response"
        return text, None

    except asyncio.TimeoutError:
        logger.warning("Gemini timed out after %ds", settings.ai_request_timeout_seconds)
        return None, "AI analysis timed out — try again shortly"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini error: %s", exc)
        return None, "AI analysis temporarily unavailable"
