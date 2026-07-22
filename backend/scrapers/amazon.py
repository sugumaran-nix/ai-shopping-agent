import httpx
from bs4 import BeautifulSoup
from typing import List
from models import Product
from utils.headers import get_headers, clean_price, clean_rating, clean_reviews, calculate_discount

def build_url(query: str) -> str:
    return f"https://www.amazon.in/s?k={query.replace(' ', '+')}"

async def scrape_amazon(query: str) -> List[Product]:
    products = []
    try:
        headers = {
            **get_headers(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-IN,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
        }
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(build_url(query), headers=headers)
            if response.status_code != 200:
                print(f"[Amazon] Status {response.status_code}")
                return []
            soup = BeautifulSoup(response.text, "html.parser")
            results = soup.select("div[data-component-type='s-search-result']")
            for item in results[:8]:
                try:
                    title_tag = item.select_one("h2 span")
                    if not title_tag: continue
                    title = title_tag.get_text(strip=True)
                    link_tag = item.select_one("h2 a")
                    if not link_tag: continue
                    product_url = "https://www.amazon.in" + link_tag.get("href", "")
                    price_tag = item.select_one("span.a-price > span.a-offscreen")
                    price = clean_price(price_tag.get_text() if price_tag else None)
                    if not price: continue
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
                    print(f"[Amazon] Parse error: {e}")
    except Exception as e:
        print(f"[Amazon] Request failed: {e}")
    print(f"[Amazon] Found {len(products)} products")
    return products
