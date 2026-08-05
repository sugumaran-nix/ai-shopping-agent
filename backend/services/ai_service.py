"""
Gemini AI recommendation service.

Fixes vs old code:
- Uses get_settings() not bare `settings` import
- Tries multiple model names in order (quota fallback)
- Async generate — doesn't block the event loop
- Prompt only uses validated, labeled data — no fabricated context
"""
from __future__ import annotations

import logging

import google.generativeai as genai

from config import get_settings
from models import ScrapeStatus, SourceResult

logger = logging.getLogger("ai")
settings = get_settings()

if settings.gemini_enabled:
    genai.configure(api_key=settings.gemini_api_key)

# Try newest first; fall back if quota exceeded
_MODEL_FALLBACKS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]


def _build_prompt(query: str, results: list[SourceResult]) -> str:
    lines = [f'User searched for: "{query}"\n']
    for r in results:
        if r.status == ScrapeStatus.UNAVAILABLE:
            lines.append(f"{r.source.value.upper()}: unavailable ({r.error})")
            continue
        freshness = "current data" if r.status == ScrapeStatus.FRESH else "STALE / may be outdated"
        lines.append(f"\n{r.source.value.upper()} ({freshness}):")
        for p in r.products[:10]:
            rating = f", rating {p.rating}/5" if p.rating else ""
            lines.append(f"  - {p.title} — ₹{p.price:,.0f}{rating}")

    product_block = "\n".join(lines) if lines else "No product data available."

    return f"""You are a shopping assistant. Analyze these REAL product results and give a 3-5 sentence buying recommendation.
Name specific products and prices. If any source is STALE, mention that those prices may have changed.
If data is too thin to recommend confidently, say so — do not invent details.

{product_block}"""


async def generate_recommendation(
    query: str, results: list[SourceResult]
) -> tuple[str | None, str | None]:
    """Returns (recommendation, error) — exactly one will be non-None."""
    if not settings.gemini_enabled:
        return None, "GEMINI_API_KEY not configured — set it in your .env file"

    if not any(r.products for r in results):
        return None, "No valid product data available to analyze"

    prompt = _build_prompt(query, results)

    for model_name in _MODEL_FALLBACKS:
        try:
            model = genai.GenerativeModel(model_name)
            response = await model.generate_content_async(prompt)
            return response.text.strip(), None
        except Exception as exc:  # noqa: BLE001
            err = str(exc)
            logger.warning("Gemini %s failed: %s", model_name, err[:120])
            if "429" in err or "quota" in err.lower() or "RESOURCE_EXHAUSTED" in err:
                continue  # try next model
            return None, f"AI analysis failed: {err}"

    return None, "All Gemini model quotas exhausted — try again later"
