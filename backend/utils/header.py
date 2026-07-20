import random
from typing import Optional

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
    if not price_str:
        return None
    try:
        cleaned = (
            price_str
            .replace("₹", "")
            .replace(",", "")
            .replace(" ", "")
            .strip()
        )
        return float(cleaned)
    except (ValueError, AttributeError):
        return None

def clean_rating(rating_str: Optional[str]) -> Optional[float]:
    if not rating_str:
        return None
    try:
        return float(rating_str.split()[0].strip())
    except (ValueError, AttributeError, IndexError):
        return None

def clean_reviews(review_str: Optional[str]) -> Optional[int]:
    if not review_str:
        return None
    try:
        cleaned = (
            review_str
            .replace(",", "")
            .replace("(", "")
            .replace(")", "")
            .replace("ratings", "")
            .replace("reviews", "")
            .replace("Ratings", "")
            .strip()
        )
        return int(cleaned)
    except (ValueError, AttributeError):
        return None

def calculate_discount(price: float, original_price: float) -> Optional[int]:
    if not original_price or original_price <= price:
        return None
    try:
        return int(((original_price - price) / original_price) * 100)
    except ZeroDivisionError:
        return None
