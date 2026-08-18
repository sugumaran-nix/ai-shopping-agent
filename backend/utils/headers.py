"""
Shared HTTP utilities: user-agent rotation and text cleaning helpers.
These are used across scrapers to avoid duplicating parsing logic.
"""
from __future__ import annotations

import random
import re
from typing import Any, Optional

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]


def get_headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


def clean_price(price_str: Optional[str]) -> Optional[float]:
    """Extract a numeric price from strings like '₹1,299' or '$ 19.99'."""
    if not price_str:
        return None
    try:
        cleaned = (
            price_str
            .replace("₹", "")
            .replace("$", "")
            .replace(",", "")
            .replace(" ", "")
            .strip()
            .rstrip(".")
        )
        value = float(cleaned)
        return value if value > 0 else None
    except (ValueError, AttributeError):
        return None


def clean_rating(rating_str: Optional[str]) -> Optional[float]:
    """Extract a float rating from strings like '4.3 out of 5'."""
    if not rating_str:
        return None
    try:
        value = float(rating_str.split()[0].strip())
        return value if 0 <= value <= 5 else None
    except (ValueError, AttributeError, IndexError):
        return None


def clean_reviews(review_str: Optional[str]) -> Optional[int]:
    """Extract an integer review count from strings like '(1,234 ratings)'."""
    if not review_str:
        return None
    try:
        digits = "".join(ch for ch in review_str if ch.isdigit())
        return int(digits) if digits else None
    except (ValueError, AttributeError):
        return None


def make_absolute_url(href: str, base_domain: str) -> str:
    """
    Convert a relative URL to absolute. Handles:
      /path/to/page   → https://base_domain/path/to/page
      //cdn.example   → https://cdn.example
      https://...     → unchanged
    """
    if not href:
        return ""
    if href.startswith("http"):
        return href
    if href.startswith("//"):
        return f"https:{href}"
    base = base_domain.rstrip("/")
    path = href if href.startswith("/") else f"/{href}"
    return f"{base}{path}"


_IMAGE_PLACEHOLDER_RE = re.compile(r"(?:placeholder|transparent|spacer|pixel\.(?:gif|png)|data:image)", re.IGNORECASE)
_IMAGE_ATTRS = ("data-src", "data-lazy-src", "data-original", "data-image-url", "src")


def normalize_image_url(value: object, base_domain: str = "") -> str | None:
    """Return a usable absolute image URL, rejecting empty and placeholder values."""
    if isinstance(value, dict):
        for key in ("url", "src", "image", "image_url", "imageUrl", "secure_url"):
            if key in value:
                normalized = normalize_image_url(value[key], base_domain)
                if normalized:
                    return normalized
        return None
    if isinstance(value, (list, tuple)):
        for candidate in value:
            normalized = normalize_image_url(candidate, base_domain)
            if normalized:
                return normalized
        return None
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw or raw.startswith(("data:", "blob:")) or _IMAGE_PLACEHOLDER_RE.search(raw):
        return None
    absolute = make_absolute_url(raw, base_domain) if base_domain else raw
    return absolute if absolute.startswith(("http://", "https://")) else None


def extract_image_url(img_element: Any, base_domain: str = "") -> str | None:
    """Select the best non-placeholder URL from a BeautifulSoup image element."""
    if not img_element:
        return None
    for attr in _IMAGE_ATTRS:
        candidate = img_element.get(attr)
        normalized = normalize_image_url(candidate, base_domain)
        if normalized:
            return normalized
    srcset = img_element.get("srcset") or img_element.get("data-srcset")
    if srcset:
        for candidate in reversed(str(srcset).split(",")):
            normalized = normalize_image_url(candidate.strip().split(" ")[0], base_domain)
            if normalized:
                return normalized
    return None
