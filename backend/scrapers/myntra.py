import httpx
from bs4 import BeautifulSoup
from typing import List
import os

from models.product import Product
from utils.headers import get_headers, clean_price, clean_rating, clean_reviews, calculate_discount

SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY")
SCRAPER_API_URL = "http://api.scraperapi.com"

def build_url(query: str) -> str:
    query_formatted = query.replace(" ", "-")
    return f"https://www.myntra.com/{query_formatted}"

async def scrape_myntra(query: str) -> List[Product]:
    target_url = build_url(query)
    params = {
        "api_key": SCRAPER_API_KEY,
        "url": target_url,
        "country_code": "in",
        "device_type": "desktop",
        "render": "true",
    }
    products = []
    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            response = await client.get(SCRAPER_API_URL, params=params, headers=get_headers())
            if response.status_code != 200:
                print(f"[Myntra] ScraperAPI returned {response.status_code}")
                return []
            soup = BeautifulSoup(response.text, "lxml")
            results = soup.select("li.product-base")
            for item in results[:8]:
                try:
                    title_brand = item.select_one("h3.product-brand")
                    title_name = item.select_one("h4.product-product")
                    if not title_brand or not title_name:
                        continue
                    title = f"{title_brand.get_text(strip=True)} {title_name.get_text(strip=True)}"
                    link_tag = item.select_one("a")
                    if not link_tag:
                        continue
                    product_url = "https://www.myntra.com/" + link_tag.get("href", "").lstrip("/")
                    price_tag = item.select_one("span.product-discountedPrice") or item.select_one("div.product-price span")
                    price = clean_price(price_tag.get_text() if price_tag else None)
                    if not price:
                        continue
                    original_tag = item.select_one("span.product-strike")
                    original_price = clean_price(original_tag.get_text() if original_tag else None)
                    discount_tag = item.select_one("span.product-discountPercentage")
                    if discount_tag:
                        try:
                            discount = int(discount_tag.get_text().replace("(", "").replace("% OFF)", "").strip())
                        except:
                            discount = calculate_discount(price, original_price)
                    else:
                        discount = calculate_discount(price, original_price)
                    rating_tag = item.select_one("div.product-ratingsContainer span")
                    rating = clean_rating(rating_tag.get_text() if rating_tag else None)
                    reviews_tag = item.select_one("div.product-ratingsCount")
                    reviews = clean_reviews(reviews_tag.get_text() if reviews_tag else None)
                    img_tag = item.select_one("img.img-responsive")
                    image_url = img_tag.get("src") if img_tag else None
                    products.append(Product(
                        title=title, price=price, original_price=original_price,
                        discount=discount, rating=rating, reviews=reviews,
                        image_url=image_url, product_url=product_url,
                        site="myntra", available=True,
                    ))
                except Exception as e:
                    print(f"[Myntra] Error parsing product: {e}")
                    continue
    except Exception as e:
        print(f"[Myntra] Request failed: {e}")
        return []
    print(f"[Myntra] Found {len(products)} products")
    return products
