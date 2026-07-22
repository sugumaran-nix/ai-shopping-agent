import httpx
from bs4 import BeautifulSoup
from typing import List
from models import Product
from utils.headers import get_headers, clean_price, clean_rating, clean_reviews, calculate_discount

def build_url(query: str) -> str:
    return f"https://www.myntra.com/{query.replace(' ', '-')}"

async def scrape_myntra(query: str) -> List[Product]:
    products = []
    try:
        headers = {
            **get_headers(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-IN,en;q=0.9",
        }
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(build_url(query), headers=headers)
            if response.status_code != 200:
                print(f"[Myntra] Status {response.status_code}")
                return []
            soup = BeautifulSoup(response.text, "html.parser")

            # Myntra renders products inside a JSON script tag
            import json, re
            script_tags = soup.find_all("script")
            for script in script_tags:
                text = script.string or ""
                if "searchData" in text or "products" in text:
                    match = re.search(r'"products"\s*:\s*(\[.*?\])', text, re.DOTALL)
                    if match:
                        try:
                            items = json.loads(match.group(1))
                            for item in items[:8]:
                                title = f"{item.get('brand', '')} {item.get('product', '')}".strip()
                                if not title: continue
                                price = float(item.get("price", 0) or 0) or None
                                if not price: continue
                                mrp = float(item.get("mrp", 0) or 0) or None
                                discount = calculate_discount(price, mrp) if mrp else None
                                rating = float(item.get("rating", 0) or 0) or None
                                pid = item.get("productId", "")
                                slug = item.get("landingPageUrl", "")
                                product_url = f"https://www.myntra.com/{slug}" if slug else f"https://www.myntra.com/{pid}"
                                images = item.get("images") or []
                                image_url = images[0].get("src") if images and isinstance(images[0], dict) else None
                                products.append(Product(
                                    title=title, price=price, original_price=mrp,
                                    discount=discount, rating=rating, reviews=None,
                                    image_url=image_url, product_url=product_url,
                                    site="myntra", available=True,
                                ))
                        except Exception as e:
                            print(f"[Myntra] JSON parse error: {e}")
                    break
    except Exception as e:
        print(f"[Myntra] Request failed: {e}")
    print(f"[Myntra] Found {len(products)} products")
    return products
