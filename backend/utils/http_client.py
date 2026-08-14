"""
Centralized HTTP client for all scraping.

Routes traffic through ScraperAPI. Uses country_code=in for Indian marketplaces
to get correct regional content. JS rendering enabled per-scraper when needed.
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
_RETRYABLE = (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError)


class FetchError(Exception):
    """Raised when a URL could not be fetched after all retries."""


_retry = retry(
    retry=retry_if_exception_type(_RETRYABLE),
    stop=stop_after_attempt(settings.max_retries + 1),
    wait=wait_exponential(multiplier=1, min=2, max=8),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)


async def fetch_html(
    target_url: str,
    *,
    render_js: bool = False,
    country_code: str = "in",
) -> str:
    if not settings.scraperapi_key:
        raise FetchError(
            "SCRAPERAPI_KEY is not set. Add it to your .env file. "
            "Free tier at https://www.scraperapi.com/"
        )

    params: dict[str, str] = {
        "api_key": settings.scraperapi_key,
        "url": target_url,
        "country_code": country_code,
    }
    if render_js:
        params["render"] = "true"

    @_retry
    async def _get(client: httpx.AsyncClient) -> str:
        response = await client.get(
            SCRAPERAPI_ENDPOINT,
            params=params,
            timeout=settings.request_timeout_seconds,
        )
        response.raise_for_status()
        return response.text

    try:
        async with httpx.AsyncClient() as client:
            return await _get(client)
    except httpx.HTTPStatusError as exc:
        raise FetchError(
            f"ScraperAPI returned HTTP {exc.response.status_code} for {target_url}"
        ) from exc
    except _RETRYABLE as exc:
        raise FetchError(
            f"Network error after {settings.max_retries + 1} attempts for {target_url}: {exc}"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise FetchError(f"Unexpected fetch error for {target_url}: {exc}") from exc
