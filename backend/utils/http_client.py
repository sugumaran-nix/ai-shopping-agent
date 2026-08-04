"""
Centralized HTTP client for all scraping requests.

Routes all traffic through ScraperAPI (proxy rotation + anti-bot bypass).
Applies exponential-backoff retries via tenacity.
All failures surface as FetchError with a specific, actionable message.
"""
from __future__ import annotations

import logging

import httpx
from tenacity import (
    before_sleep_log,
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


def _make_retry_decorator():
    return retry(
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        stop=stop_after_attempt(settings.max_retries + 1),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


async def fetch_html(target_url: str, *, render_js: bool = False) -> str:
    """
    Fetch `target_url` through ScraperAPI and return the raw HTML.
    Raises FetchError with a specific message on failure.
    """
    if not settings.scraperapi_key:
        raise FetchError(
            "SCRAPERAPI_KEY is not configured. "
            "Set it in your .env file. Get a key at https://www.scraperapi.com/"
        )

    params: dict = {
        "api_key": settings.scraperapi_key,
        "url": target_url,
    }
    if render_js:
        params["render"] = "true"

    @_make_retry_decorator()
    async def _get(client: httpx.AsyncClient) -> httpx.Response:
        response = await client.get(
            SCRAPERAPI_ENDPOINT,
            params=params,
            timeout=settings.request_timeout_seconds,
        )
        response.raise_for_status()
        return response

    try:
        async with httpx.AsyncClient() as client:
            response = await _get(client)
            return response.text
    except httpx.HTTPStatusError as exc:
        raise FetchError(
            f"ScraperAPI returned HTTP {exc.response.status_code} for {target_url}"
        ) from exc
    except RETRYABLE_EXCEPTIONS as exc:
        raise FetchError(
            f"Network error fetching {target_url} after {settings.max_retries + 1} attempt(s): {exc}"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise FetchError(f"Unexpected error fetching {target_url}: {exc}") from exc
