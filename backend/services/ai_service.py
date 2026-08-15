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

    if not key:
        return None, "AI recommendations unavailable — no Gemini API key configured"

    if not any(r.products for r in results):
        return None, "No product data available to analyse"

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

        if resp.status_code == 400:
            logger.warning("Gemini 400: %s", resp.text[:200])
            return None, "Invalid Gemini API key — please check your key and try again"

        if resp.status_code == 429:
            return None, "Gemini quota exceeded — try again later or use your own API key"

        if resp.status_code == 403:
            return None, "Gemini API key is invalid or has no access — please check your key"

        resp.raise_for_status()
        data = resp.json()

        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )

        if not text:
            return None, "AI returned an empty response"

        return text, None

    except httpx.TimeoutException:
        logger.warning("Gemini timed out after %ds", settings.ai_request_timeout_seconds)
        return None, "AI analysis timed out — try again shortly"
    except httpx.HTTPStatusError as exc:
        logger.warning("Gemini HTTP error %d: %s", exc.response.status_code, exc.response.text[:100])
        return None, "AI analysis temporarily unavailable"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini error: %s", type(exc).__name__)
        return None, "AI analysis temporarily unavailable"
