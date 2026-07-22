import httpx
import json
from typing import List
from models import Product
from utils.headers import clean_price, calculate_discount

def build_api_url(query: str) -> str:
    return "https://www.meesho.com/api/v1/products/search"

async def scrape_meesho(query: str) -> List[Product]:
    products = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": "https://www.meesho.com",
            "Referer": f"https://www.meesho.com/search?q={query.replace(' ', '%20')}",
        }
        payload = {
            "query": query,
            "page": 1,
            "pageSize": 8,
            "filters": [],
            "facets": {},
            "searchType": "manual",
        }
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.post(build_api_url(query), json=payload, headers=headers)
            if response.status_code != 200:
                print(f"[Meesho] API status {response.status_code}")
                return []
            data = response.json()
            items = data.get("products", []) or data.get("data", {}).get("products", [])
            for item in items[:8]:
                try:
                    title = item.get("name") or item.get("product_name", "")
                    if not title: continue
                    price_raw = item.get("min_price") or item.get("price") or item.get("selling_price")
                    price = float(price_raw) if price_raw else None
                    if not price: continue
                    original_raw = item.get("mrp") or item.get("max_price")
                    original_price = float(original_raw) if original_raw else None
                    discount = calculate_discount(price, original_price) if original_price else None
                    rating = float(item.get("rating", 0) or 0) or None
                    slug = item.get("slug") or ""
                    product_url = f"https://www.meesho.com/{slug}" if slug else "https://www.meesho.com"
                    images = item.get("images") or []
                    image_url = images[0].get("url") if images and isinstance(images[0], dict) else (images[0] if images else None)
                    products.append(Product(
                        title=title, price=price, original_price=original_price,
                        discount=discount, rating=rating, reviews=None,
                        image_url=image_url, product_url=product_url,
                        site="meesho", available=True,
                    ))
                except Exception as e:
                    print(f"[Meesho] Parse error: {e}")
    except Exception as e:
        print(f"[Meesho] Request failed: {e}")
    print(f"[Meesho] Found {len(products)} products")
    return products
