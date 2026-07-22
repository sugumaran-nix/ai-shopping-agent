import httpx
from bs4 import BeautifulSoup
from typing import List
import os

from models import Product
from utils.headers import get_headers, clean_price, clean_rating, clean_reviews, calculate_discount

SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY")
SCRAPER_API_URL = "http://api.scraperapi.com"

def build_url(query: str) -> str:
    query_formatted = query.replace(" ", "+")
    return f"https://www.amazon.in/s?k={query_formatted}"

async def scrape_amazon(query: str) -> List[Product]:
    target_url = build_url(query)
    params = {
        "api_key": SCRAPER_API_KEY,
        "url": target_url,
        "country_code": "in",
        "device_type": "desktop",
    }
    products = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(SCRAPER_API_URL, params=params, headers=get_headers())
            if response.status_code != 200:
                print(f"[Amazon] ScraperAPI returned {response.status_code}")
                return []
            soup = BeautifulSoup(response.text, "lxml")
            results = soup.select("div[data-component-type='s-search-result']")
            for item in results[:8]:
                try:
                    title_tag = item.select_one("h2 span")
                    if not title_tag:
                        continue
                    title = title_tag.get_text(strip=True)
                    link_tag = item.select_one("h2 a")
                    if not link_tag:
                        continue
                    product_url = "https://www.amazon.in" + link_tag.get("href", "")
                    price_tag = item.select_one("span.a-price > span.a-offscreen")
                    price = clean_price(price_tag.get_text() if price_tag else None)
                    if not price:
                        continue
                    original_tag = item.select_one("span.a-price.a-text-price > span.a-offscreen")
                    original_price = clean_price(original_tag.get_text() if original_tag else None)
                    discount = calculate_discount(price, original_price) if original_price else None
                    rating_tag = item.select_one("span.a-icon-alt")
                    rating = clean_rating(rating_tag.get_text() if rating_tag else None)
                    reviews_tag = item.select_one("span.a-size-base.s-underline-text")
                    reviews = clean_reviews(reviews_tag.get_text() if reviews_tag else None)
                    img_tag = item.select_one("img.s-image")
                    image_url = img_tag.get("src") if img_tag else None
                    products.append(Product(
                        title=title, price=price, original_price=original_price,
                        discount=discount, rating=rating, reviews=reviews,
                        image_url=image_url, product_url=product_url,
                        site="amazon", available=True,
                    ))
                except Exception as e:
                    print(f"[Amazon] Error parsing product: {e}")
                    continue
    except Exception as e:
        print(f"[Amazon] Request failed: {e}")
        return []
    print(f"[Amazon] Found {len(products)} products")
    return products
