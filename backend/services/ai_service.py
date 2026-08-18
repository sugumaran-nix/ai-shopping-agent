"""Grounded shopping recommendations through user-configurable text providers."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging

import httpx

from cache import get as cache_get
from cache import store as cache_store
from config import get_settings
from models import ScrapeStatus, SourceResult

logger = logging.getLogger("ai")
settings = get_settings()
_singleflight_guard = asyncio.Lock()
_singleflight: dict[str, asyncio.Future] = {}

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

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
    """Give a transparent, deterministic summary when cloud AI is unavailable."""
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


def _result_cache_query(query: str, results: list[SourceResult], provider: str) -> str:
    fingerprint = hashlib.sha256(
        json.dumps(
            [
                {
                    "source": result.source.value,
                    "status": result.status.value,
                    "products": [
                        {"title": p.title, "price": p.price, "rating": p.rating}
                        for p in result.products[: settings.ai_max_products_per_source]
                    ],
                }
                for result in results
            ],
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    model = settings.gemini_model if provider == "gemini" else settings.openrouter_model
    return f"{provider}:{model}:{query.strip().lower()}:{fingerprint}"


def _extract_gemini_text(data: dict) -> tuple[str | None, str | None]:
    candidates = data.get("candidates") or []
    if not candidates:
        block_reason = (data.get("promptFeedback") or {}).get("blockReason")
        if block_reason:
            return None, "Gemini could not answer this search"
        return None, "Gemini returned no text"

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "\n".join(
        part.get("text", "").strip()
        for part in parts
        if isinstance(part, dict) and part.get("text") and not part.get("thought")
    ).strip()
    return (text, None) if text else (None, "Gemini returned no text")


def _extract_openrouter_text(data: dict) -> tuple[str | None, str | None]:
    choices = data.get("choices") or []
    content = ((choices[0].get("message") or {}).get("content") if choices else None)
    if isinstance(content, list):
        content = "\n".join(item.get("text", "") for item in content if isinstance(item, dict))
    text = str(content or "").strip()
    return (text, None) if text else (None, "OpenRouter returned no text")


async def _call_provider(provider: str, key: str, prompt: str) -> tuple[str | None, str | None]:
    if provider == "gemini":
        url = _GEMINI_URL.format(model=settings.gemini_model, key=key)
        headers = None
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512},
        }
    else:
        url = _OPENROUTER_URL
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "X-Title": "AI Shopping Agent",
        }
        payload = {
            "model": settings.openrouter_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 512,
        }

    try:
        async with httpx.AsyncClient(timeout=settings.ai_request_timeout_seconds) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code in (429, 500, 502, 503, 504):
                logger.warning("%s transient provider error %d; retrying once", provider, resp.status_code)
                await asyncio.sleep(1)
                resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code in (400, 401, 403):
            logger.warning("%s rejected the request with status %d", provider, resp.status_code)
            return None, f"{provider.title()} is unavailable"
        if resp.status_code in (429, 500, 502, 503, 504):
            logger.warning("%s remained unavailable after retry: %d", provider, resp.status_code)
            return None, f"{provider.title()} is temporarily busy"

        resp.raise_for_status()
        return _extract_gemini_text(resp.json()) if provider == "gemini" else _extract_openrouter_text(resp.json())
    except httpx.TimeoutException:
        logger.warning("%s timed out after %ds", provider, settings.ai_request_timeout_seconds)
        return None, f"{provider.title()} timed out"
    except httpx.HTTPStatusError as exc:
        logger.warning("%s returned an HTTP error %d", provider, exc.response.status_code)
        return None, f"{provider.title()} is temporarily unavailable"
    except Exception as exc:  # noqa: BLE001
        logger.warning("%s error: %s", provider, type(exc).__name__)
        return None, f"{provider.title()} is temporarily unavailable"


async def _cached_provider_call(
    provider: str,
    key: str,
    cache_query: str,
    prompt: str,
) -> tuple[str | None, str | None]:
    """Share one in-flight provider call for each result/provider fingerprint."""
    async with _singleflight_guard:
        future = _singleflight.get(cache_query)
        leader = future is None
        if leader:
            future = asyncio.get_running_loop().create_future()
            _singleflight[cache_query] = future

    if not leader:
        return await future

    try:
        cached = cache_get("ai-recommendation", cache_query)
        if cached is not None and cached.data:
            result = (str(cached.data), None)
        else:
            result = await _call_provider(provider, key, prompt)
            if result[0]:
                try:
                    cache_store("ai-recommendation", cache_query, result[0])
                except Exception as exc:  # noqa: BLE001
                    logger.debug("AI cache write skipped: %s", type(exc).__name__)
        future.set_result(result)
        return result
    except BaseException as exc:
        if not future.done():
            future.set_exception(exc)
        raise
    finally:
        async with _singleflight_guard:
            if _singleflight.get(cache_query) is future:
                _singleflight.pop(cache_query, None)


async def generate_recommendation(
    query: str,
    results: list[SourceResult],
    user_gemini_key: str | None = None,
    user_openrouter_key: str | None = None,
) -> tuple[str | None, str | None]:
    """Try Gemini, then optional OpenRouter, then return a transparent data summary."""
    if not any(r.products for r in results):
        return None, "No product data available to analyse"

    fallback = _fallback_recommendation(query, results)
    gemini_key = (user_gemini_key or "").strip() or settings.gemini_api_key
    openrouter_key = (user_openrouter_key or "").strip() or settings.openrouter_api_key
    providers = [("gemini", gemini_key)] if gemini_key else []
    if openrouter_key:
        providers.append(("openrouter", openrouter_key))
    if not providers:
        return fallback, "AI provider not configured — showing a data-based summary"

    last_error = "AI providers unavailable"
    for provider, key in providers:
        cache_query = _result_cache_query(query, results, provider)
        prompt = _PROMPT_TEMPLATE.format(query=query, product_block=_format_products(results))
        text, provider_error = await _cached_provider_call(provider, key, cache_query, prompt)
        if text:
            return text, None
        last_error = provider_error or last_error
        if len(providers) > 1:
            logger.warning("%s did not produce a recommendation; trying next provider", provider)

    if len(providers) > 1:
        last_error = "AI providers are temporarily unavailable"
    return fallback, f"{last_error} — showing a data-based summary"
