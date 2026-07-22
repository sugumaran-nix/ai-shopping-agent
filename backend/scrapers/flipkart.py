import httpx
from bs4 import BeautifulSoup
from typing import List
from models import Product
from utils.headers import get_headers, clean_price, clean_rating, clean_reviews, calculate_discount

def build_url(query: str) -> str:
    return f"https://www.flipkart.com/search?q={query.replace(' ', '+')}"

async def scrape_flipkart(query: str) -> List[Product]:
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
                print(f"[Flipkart] Status {response.status_code}")
                return []
            soup = BeautifulSoup(response.text, "html.parser")

            products_data = []
            # Try multiple card selectors across Flipkart layout versions
            for selector in ["div[data-id]", "div._1AtVbE", "div._13oc-S", "div.tUxRFH"]:
                cards = soup.select(selector)
                if cards:
                    products_data = cards[:10]
                    break

            for item in products_data:
                try:
                    title_tag = item.select_one("div._4rR01T, a.s1Q9rs, div.KzDlHZ, div.WKTcLC")
                    if not title_tag: continue
                    title = title_tag.get_text(strip=True)
                    if len(title) < 5: continue

                    link_tag = item.select_one("a[href]")
                    if not link_tag: continue
                    href = link_tag.get("href", "")
                    product_url = f"https://www.flipkart.com{href}" if href.startswith("/") else href

                    price_tag = item.select_one("div._30jeq3, div.Nx9bqj")
                    price = clean_price(price_tag.get_text() if price_tag else None)
                    if not price: continue

                    original_tag = item.select_one("div._3I9_wc, div.yRaY8j")
                    original_price = clean_price(original_tag.get_text() if original_tag else None)
                    discount = calculate_discount(price, original_price) if original_price else None

                    rating_tag = item.select_one("div._3LWZlK, div.XQDdHH")
                    rating = clean_rating(rating_tag.get_text() if rating_tag else None)

                    img_tag = item.select_one("img._396cs4, img.DByuf4")
                    image_url = img_tag.get("src") if img_tag else None

                    products.append(Product(
                        title=title, price=price, original_price=original_price,
                        discount=discount, rating=rating, reviews=None,
                        image_url=image_url, product_url=product_url,
                        site="flipkart", available=True,
                    ))
                except Exception as e:
                    print(f"[Flipkart] Parse error: {e}")
    except Exception as e:
        print(f"[Flipkart] Request failed: {e}")
    print(f"[Flipkart] Found {len(products)} products")
    return products
