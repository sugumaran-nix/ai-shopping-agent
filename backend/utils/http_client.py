"""
A single place that knows how to fetch a URL through ScraperAPI with retries.

The old code (implied by the bugs described) likely called httpx directly
per-scraper with no shared retry/backoff policy, so a single flaky response
from one site would just surface as a broken page. Centralizing this means
every scraper gets the same resilience for free, and it's the only place
that needs to change if the proxy provider changes.
"""
from __future__ import annotations

import logging

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import get_settings

logger = logging.getLogger("scraper.http")

settings = get_settings()

SCRAPERAPI_ENDPOINT = "https://api.scraperapi.com/"

RETRYABLE_EXCEPTIONS = (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError)


class FetchError(Exception):
    """Raised when a URL could not be fetched after all retries."""


@retry(
    retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
    stop=stop_after_attempt(settings.max_retries + 1),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    reraise=True,
)
async def _get(client: httpx.AsyncClient, url: str, params: dict) -> httpx.Response:
    response = await client.get(url, params=params, timeout=settings.request_timeout_seconds)
    response.raise_for_status()
    return response


async def fetch_html(target_url: str, *, render_js: bool = False) -> str:
    """
    Fetch `target_url` through ScraperAPI (which handles proxy rotation and
    anti-bot bypass) and return the raw HTML.

    Raises FetchError with a clear, specific message on failure instead of
    letting a raw httpx/connection exception bubble up to the caller.
    """
    if not settings.scraperapi_key:
        raise FetchError(
            "SCRAPERAPI_KEY is not configured - set it in your .env file. "
            "Get a key at https://www.scraperapi.com/"
        )

    params = {
        "api_key": settings.scraperapi_key,
        "url": target_url,
    }
    if render_js:
        params["render"] = "true"

    try:
        async with httpx.AsyncClient() as client:
            response = await _get(client, SCRAPERAPI_ENDPOINT, params)
            return response.text
    except httpx.HTTPStatusError as exc:
        raise FetchError(
            f"ScraperAPI returned HTTP {exc.response.status_code} for {target_url}"
        ) from exc
    except RETRYABLE_EXCEPTIONS as exc:
        raise FetchError(
            f"Network error fetching {target_url} after {settings.max_retries + 1} attempts: {exc}"
        ) from exc
