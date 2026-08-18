"""Shared headless browser lifecycle for scraper fallbacks."""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Sequence

logger = logging.getLogger("scraper.browser")

_browser_init_lock = asyncio.Lock()
_playwright = None
_browser = None
_stealth = None

_DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
)


async def _get_browser():
    global _playwright, _browser, _stealth
    if _browser is not None:
        return _browser

    async with _browser_init_lock:
        if _browser is not None:
            return _browser
        try:
            from playwright.async_api import async_playwright
            from playwright_stealth import Stealth
        except ImportError as exc:  # pragma: no cover - exercised in deployment
            raise RuntimeError("Playwright fallback is not installed") from exc

        _playwright = await async_playwright().start()
        executable_path = os.getenv("PLAYWRIGHT_EXECUTABLE_PATH") or ("/usr/bin/chromium" if os.path.exists("/usr/bin/chromium") else None)
        _browser = await _playwright.chromium.launch(
            headless=True,
            executable_path=executable_path,
            args=["--disable-dev-shm-usage", "--no-sandbox"],
        )
        _stealth = Stealth()
        logger.info("Shared Playwright browser started")
        return _browser


async def render_page_html(
    url: str,
    *,
    wait_for_selectors: Sequence[str] = (),
    timeout_ms: int = 30_000,
    user_agent: str = _DEFAULT_USER_AGENT,
) -> str:
    """Render a page in a short-lived context while reusing one browser process."""
    browser = await _get_browser()
    context = await browser.new_context(
        user_agent=user_agent,
        locale="en-IN",
        timezone_id="Asia/Kolkata",
        viewport={"width": 390, "height": 844},
        extra_http_headers={
            "Accept-Language": "en-IN,en;q=0.9",
            "Referer": url.split("/search", 1)[0] + "/",
        },
    )
    page = await context.new_page()
    try:
        if _stealth is not None:
            await _stealth.apply_stealth_async(context)
        await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        for selector in wait_for_selectors:
            try:
                await page.wait_for_selector(selector, state="attached", timeout=timeout_ms)
                break
            except Exception:  # noqa: BLE001
                continue
        await page.wait_for_timeout(500)
        return await page.content()
    finally:
        await context.close()


async def close_browser() -> None:
    """Close the shared browser and Playwright runtime during app shutdown."""
    global _playwright, _browser, _stealth
    async with _browser_init_lock:
        if _browser is not None:
            await _browser.close()
            _browser = None
        if _playwright is not None:
            await _playwright.stop()
            _playwright = None
        _stealth = None
        logger.info("Shared Playwright browser stopped")
