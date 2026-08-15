"""
Centralized HTTP client for all scraping.

Two separate fetch functions:
  fetch_html()        — fast, no JS, 1 retry  (Amazon, Flipkart)
  fetch_html_js()     — JS rendering, 0 retry (Meesho, Myntra — slow, don't retry)

Keeping retries low prevents a single slow scraper from blocking results
for 45+ seconds when it's just going to fail anyway.
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
    """Raised when a URL could not be fetched."""


# Fast scraper: 1 retry, short wait (Amazon, Flipkart)
_retry_fast = retry(
    retry=retry_if_exception_type(_RETRYABLE),
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=3),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)

# JS scraper: no retry — JS rendering already takes 15-30s, retrying doubles the wait
_retry_js = retry(
    retry=retry_if_exception_type(_RETRYABLE),
    stop=stop_after_attempt(1),
    reraise=True,
)


def _build_params(target_url: str, api_key: str, render_js: bool, country_code: str) -> dict:
    params: dict[str, str] = {
        "api_key": api_key,
        "url": target_url,
        "country_code": country_code,
    }
    if render_js:
        params["render"] = "true"
        params["wait_for_selector"] = "body"  # wait until page body loads
    return params


async def fetch_html(
    target_url: str,
    *,
    render_js: bool = False,
    country_code: str = "in",
) -> str:
    """Fetch HTML via ScraperAPI. Uses appropriate retry/timeout based on render_js."""
    key = settings.scraperapi_key
    if not key:
        raise FetchError(
            "SCRAPERAPI_KEY is not set. "
            "Free tier at https://www.scraperapi.com/"
        )

    params = _build_params(target_url, key, render_js, country_code)

    # JS rendering needs much longer timeout
    timeout = 60 if render_js else 20
    retry_decorator = _retry_js if render_js else _retry_fast

    @retry_decorator
    async def _get(client: httpx.AsyncClient) -> str:
        response = await client.get(
            SCRAPERAPI_ENDPOINT,
            params=params,
            timeout=timeout,
        )
        response.raise_for_status()
        if not response.text.strip():
            raise FetchError(f"Empty response from ScraperAPI for {target_url}")
        return response.text

    try:
        async with httpx.AsyncClient() as client:
            return await _get(client)
    except httpx.HTTPStatusError as exc:
        raise FetchError(
            f"ScraperAPI HTTP {exc.response.status_code} for {target_url}"
        ) from exc
    except FetchError:
        raise
    except _RETRYABLE as exc:
        raise FetchError(f"Network error for {target_url}: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        raise FetchError(f"Unexpected error for {target_url}: {exc}") from exc
