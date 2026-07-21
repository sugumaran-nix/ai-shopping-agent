import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from bs4 import BeautifulSoup
from typing import List
from models.product import Product
from utils.headers import get_headers, clean_price, clean_rating, clean_reviews, calculate_discount

SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY")
SCRAPER_API_URL = "http://api.scraperapi.com"

def build_url(query: str) -> str:
    query_formatted = query.replace(" ", "%20")
    return f"https://www.meesho.com/search?q={query_formatted}"

async def scrape_meesho(query: str) -> List[Product]:
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
            response = await client.get(
                SCRAPER_API_URL,
                params=params,
                headers=get_headers(),
            )

            if response.status_code != 200:
                print(f"[Meesho] ScraperAPI returned {response.status_code}")
                return []

            soup = BeautifulSoup(response.text, "lxml")

            results = soup.select("div.NewProductCardstyled__CardWrapper-sc-6y2tys-0")

            if not results:
                results = soup.select("div[class*='CardWrapper']")

            for item in results[:8]:
                try:
                    title_tag = item.select_one("p[class*='ProductTitle']") or item.select_one("p.NewProductCardstyled__ProductTitle")
                    if not title_tag:
                        continue
                    title = title_tag.get_text(strip=True)

                    link_tag = item.select_one("a")
                    if not link_tag:
                        continue
                    href = link_tag.get("href", "")
                    product_url = f"https://www.meesho.com{href}" if href.startswith("/") else href

                    price_tag = item.select_one("h5[class*='Price']") or item.select_one("h5")
                    price = clean_price(price_tag.get_text() if price_tag else None)
                    if not price:
                        continue

                    original_tag = item.select_one("h6[class*='Price']") or item.select_one("h6")
                    original_price = clean_price(original_tag.get_text() if original_tag else None)

                    discount = calculate_discount(price, original_price) if original_price else None

                    rating_tag = item.select_one("span[class*='rating']") or item.select_one("p[class*='Rating']")
                    rating = clean_rating(rating_tag.get_text() if rating_tag else None)

                    reviews_tag = item.select_one("span[class*='review']") or item.select_one("p[class*='Review']")
                    reviews = clean_reviews(reviews_tag.get_text() if reviews_tag else None)

                    img_tag = item.select_one("img")
                    image_url = img_tag.get("src") if img_tag else None

                    products.append(Product(
                        title=title,
                        price=price,
                        original_price=original_price,
                        discount=discount,
                        rating=rating,
                        reviews=reviews,
                        image_url=image_url,
                        product_url=product_url,
                        site="meesho",
                        available=True,
                    ))

                except Exception as e:
                    print(f"[Meesho] Error parsing product: {e}")
                    continue

    except Exception as e:
        print(f"[Meesho] Request failed: {e}")
        return []

    print(f"[Meesho] Found {len(products)} products")
    return products
