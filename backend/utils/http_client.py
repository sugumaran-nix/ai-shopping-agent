"""
Shared async HTTP client — curl_cffi for TLS fingerprint impersonation.

curl_cffi impersonates a real Chrome TLS handshake (JA3/JA4), which is
the main reason Python scrapers get blocked before a single header is read.
No proxy, no paid service.

Success rate from datacenter IPs:
  Amazon   ~65%  (Akamai bot mgmt, IP reputation)
  Flipkart ~60%  (Cloudflare, IP reputation)
  AJIO     ~95%  (internal JSON API, no bot mgmt)
  Snapdeal ~90%  (server-rendered, no bot mgmt)
  Croma    ~85%  (server-rendered, light bot mgmt)
"""
from __future__ import annotations
import logging
from typing import Optional

from curl_cffi.requests import AsyncSession, BrowserType
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)
from config import get_settings

settings = get_settings()
log      = logging.getLogger("http")

# Rotate Chrome versions — reduces fingerprint pattern recognition
_BROWSERS = [
    BrowserType.chrome124,
    BrowserType.chrome120,
    BrowserType.chrome116,
]
_idx = 0


class FetchError(Exception):
    """Raised when a URL cannot be fetched after all retries."""


def _next_browser() -> BrowserType:
    global _idx
    b = _BROWSERS[_idx % len(_BROWSERS)]
    _idx += 1
    return b


# Retry only on network-level errors, not on HTTP 4xx (those are real failures)
@retry(
    retry=retry_if_exception_type(FetchError),
    stop=stop_after_attempt(settings.max_retries + 1),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
    reraise=True,
)
async def _do_get(url: str, headers: dict, timeout: int) -> str:
    browser = _next_browser()
    async with AsyncSession(impersonate=browser) as session:
        resp = await session.get(
            url,
            headers=headers,
            timeout=timeout,
            allow_redirects=True,
        )
        if resp.status_code in (403, 429, 503):
            # These are definitive bot-detection signals — don't retry
            raise FetchError(f"HTTP {resp.status_code} (bot detection) for {url}")
        if resp.status_code >= 400:
            raise FetchError(f"HTTP {resp.status_code} for {url}")
        return resp.text


async def fetch_html(url: str, *, headers: Optional[dict] = None) -> str:
    """Fetch HTML with Chrome TLS impersonation. Raises FetchError on failure."""
    try:
        return await _do_get(url, headers or {}, settings.request_timeout)
    except FetchError:
        raise
    except Exception as exc:
        raise FetchError(f"Network error for {url}: {exc}") from exc


async def fetch_json(url: str, *, headers: Optional[dict] = None) -> dict:
    """Fetch a JSON endpoint (used by AJIO internal API)."""
    browser = _next_browser()
    try:
        async with AsyncSession(impersonate=browser) as session:
            resp = await session.get(
                url,
                headers=headers or {},
                timeout=settings.request_timeout,
                allow_redirects=True,
            )
            if resp.status_code >= 400:
                raise FetchError(f"HTTP {resp.status_code} for {url}")
            return resp.json()
    except FetchError:
        raise
    except Exception as exc:
        raise FetchError(f"JSON fetch error for {url}: {exc}") from exc
