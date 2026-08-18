"""Shared provider client for marketplace HTML retrieval.

The client intentionally keeps provider attempts bounded: ScrapingAnt is tried
once, then Bright Data Web Unlocker is tried once. Direct HTTP and Playwright
paths remain owned by their individual scrapers and run before this Plan C
provider fallback.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

import httpx

from config import get_settings

logger = logging.getLogger("scraper.http")
settings = get_settings()

SCRAPINGANT_ENDPOINT = "https://api.scrapingant.com/v2/general"
BRIGHTDATA_ENDPOINT = "https://api.brightdata.com/request"
_RETRYABLE = (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError)


class FetchError(Exception):
    """Raised when neither configured scraping provider returns usable HTML."""


@dataclass(frozen=True)
class ProviderCredentials:
    scrapingant_key: str | None = None
    brightdata_key: str | None = None
    brightdata_zone: str | None = None

    @property
    def has_scrapingant(self) -> bool:
        return bool(self.scrapingant_key or settings.scrapingant_api_key)

    @property
    def has_brightdata(self) -> bool:
        return bool((self.brightdata_key or settings.brightdata_api_key) and (self.brightdata_zone or settings.brightdata_zone))

    @property
    def resolved_scrapingant_key(self) -> str:
        return self.scrapingant_key or settings.scrapingant_api_key

    @property
    def resolved_brightdata_key(self) -> str:
        return self.brightdata_key or settings.brightdata_api_key

    @property
    def resolved_brightdata_zone(self) -> str:
        return self.brightdata_zone or settings.brightdata_zone


async def _fetch_scrapingant(
    client: httpx.AsyncClient,
    target_url: str,
    credentials: ProviderCredentials,
    render_js: bool,
    country_code: str,
) -> str:
    params: dict[str, str | bool] = {
        "url": target_url,
        "x-api-key": credentials.resolved_scrapingant_key,
        "browser": render_js,
        "timeout": min(45 if render_js else settings.request_timeout_seconds, 60),
        "proxy_country": country_code,
    }
    if render_js:
        params["wait_for_selector"] = "body"
    else:
        params["return_page_source"] = True

    response = await client.get(SCRAPINGANT_ENDPOINT, params=params)
    response.raise_for_status()
    if not response.text.strip():
        raise FetchError("ScrapingAnt returned an empty response")
    return response.text


async def _fetch_brightdata(
    client: httpx.AsyncClient,
    target_url: str,
    credentials: ProviderCredentials,
    render_js: bool,
    country_code: str,
) -> str:
    payload: dict[str, str] = {
        "zone": credentials.resolved_brightdata_zone,
        "url": target_url,
        "format": "raw",
        "country": country_code,
    }
    if render_js:
        payload["render"] = "true"
    response = await client.post(
        BRIGHTDATA_ENDPOINT,
        headers={
            "Authorization": f"Bearer {credentials.resolved_brightdata_key}",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    response.raise_for_status()

    content_type = response.headers.get("content-type", "").lower()
    if "json" in content_type:
        data = response.json()
        body = data.get("body") if isinstance(data, dict) else None
        if isinstance(body, str) and body.strip():
            return body
        if isinstance(data, str) and data.strip():
            return data
    else:
        text = response.text
        if text.strip():
            return text

    # Some Bright Data responses omit a JSON content type while still returning
    # the documented {"body": "..."} envelope.
    try:
        data = json.loads(response.text)
        body = data.get("body") if isinstance(data, dict) else None
        if isinstance(body, str) and body.strip():
            return body
    except json.JSONDecodeError:
        pass
    raise FetchError("Bright Data returned an empty response")


async def fetch_html(
    target_url: str,
    *,
    credentials: ProviderCredentials | None = None,
    render_js: bool = False,
    country_code: str = "in",
) -> str:
    """Fetch HTML through ScrapingAnt, then Bright Data, with bounded attempts."""
    creds = credentials or ProviderCredentials()
    if not creds.has_scrapingant and not creds.has_brightdata:
        raise FetchError("No scraping provider is configured for this request")

    timeout = 50 if render_js else min(settings.request_timeout_seconds, 25)
    errors: list[str] = []
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        if creds.has_scrapingant:
            try:
                return await _fetch_scrapingant(client, target_url, creds, render_js, country_code)
            except httpx.HTTPStatusError as exc:
                errors.append(f"ScrapingAnt HTTP {exc.response.status_code}")
            except _RETRYABLE:
                errors.append("ScrapingAnt network timeout")
            except FetchError as exc:
                errors.append(str(exc))
            except Exception:  # noqa: BLE001
                errors.append("ScrapingAnt request failed")

        if creds.has_brightdata:
            try:
                return await _fetch_brightdata(client, target_url, creds, render_js, country_code)
            except httpx.HTTPStatusError as exc:
                errors.append(f"Bright Data HTTP {exc.response.status_code}")
            except _RETRYABLE:
                errors.append("Bright Data network timeout")
            except FetchError as exc:
                errors.append(str(exc))
            except Exception:  # noqa: BLE001
                errors.append("Bright Data request failed")

    raise FetchError("; ".join(errors) or "No scraping provider returned usable HTML")
