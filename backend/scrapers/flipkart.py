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
    query_formatted = query.replace(" ", "+")
    return f"https://www.flipkart.com/search?q={query_formatted}"

async def scrape_flipkart(query: str) -> List[Product]:
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
            response = await client.get(
                SCRAPER_API_URL,
                params=params,
                headers=get_headers(),
            )

            if response.status_code != 200:
                print(f"[Flipkart] ScraperAPI returned {response.status_code}")
                return []

            soup = BeautifulSoup(response.text, "lxml")

            results = soup.select("div._1AtVbE")

            for item in results[:8]:
                try:
                    title_tag = item.select_one("div._4rR01T") or item.select_one("a.s1Q9rs") or item.select_one("div.IRpwTa")
                    if not title_tag:
                        continue
                    title = title_tag.get_text(strip=True)

                    link_tag = item.select_one("a._1fQZEK") or item.select_one("a.s1Q9rs") or item.select_one("a._2rpwqI")
                    if not link_tag:
                        continue
                    product_url = "https://www.flipkart.com" + link_tag.get("href", "")

                    price_tag = item.select_one("div._30jeq3")
                    price = clean_price(price_tag.get_text() if price_tag else None)
                    if not price:
                        continue

                    original_tag = item.select_one("div._3I9_wc")
                    original_price = clean_price(original_tag.get_text() if original_tag else None)

                    discount_tag = item.select_one("div._3Ay6Sb")
                    if discount_tag:
                        try:
                            discount = int(discount_tag.get_text().replace("%", "").replace("off", "").strip())
                        except:
                            discount = calculate_discount(price, original_price)
                    else:
                        discount = calculate_discount(price, original_price)

                    rating_tag = item.select_one("div._3LWZlK")
                    rating = clean_rating(rating_tag.get_text() if rating_tag else None)

                    reviews_tag = item.select_one("span._2_R_DZ") or item.select_one("span.lcOpME")
                    reviews = clean_reviews(reviews_tag.get_text() if reviews_tag else None)

                    img_tag = item.select_one("img._396cs4") or item.select_one("img._2r_T1I")
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
                        site="flipkart",
                        available=True,
                    ))

                except Exception as e:
                    print(f"[Flipkart] Error parsing product: {e}")
                    continue

    except Exception as e:
        print(f"[Flipkart] Request failed: {e}")
        return []

    print(f"[Flipkart] Found {len(products)} products")
    return products
