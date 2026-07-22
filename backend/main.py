import sys
import os
import re
import json
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

from agents.gemini import analyze_products
from models import Product
from config import settings
from utils.headers import clean_price, clean_rating, clean_reviews, calculate_discount

app = FastAPI(title="AI Shopping Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    query: str
    sites: Optional[List[str]] = ["amazon", "flipkart", "meesho", "myntra"]

class SearchResponse(BaseModel):
    query: str
    total_results: int
    products: List[Product]
    ai_analysis: str

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# ── Amazon ──────────────────────────────────────────────────────────
async def scrape_amazon(query: str, client: httpx.AsyncClient) -> List[Product]:
    products = []
    try:
        url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}"
        r = await client.get(url, headers=HEADERS)
        print(f"[Amazon] status={r.status_code} len={len(r.text)}")
        if r.status_code != 200: return []
        soup = BeautifulSoup(r.text, "html.parser")
        cards = soup.select("div[data-component-type='s-search-result']")
        print(f"[Amazon] cards={len(cards)}")
        for item in cards[:10]:
            try:
                # Title — try multiple selectors
                title_el = (item.select_one("h2 a span.a-text-normal") or item.select_one("h2 a span")
                         or item.select_one("h2 span")
                         or item.select_one("span.a-text-normal"))
                if not title_el: continue
                title = title_el.get_text(strip=True)
                if len(title) < 5: continue

                # Link
                link_el = item.select_one("h2 a") or item.select_one("a.a-link-normal[href]")
                if not link_el: continue
                href = link_el.get("href", "")
                product_url = f"https://www.amazon.in{href}" if href.startswith("/") else href

                # Price
                price_el = item.select_one("span.a-price > span.a-offscreen")
                if not price_el:
                    price_el = item.select_one("span.a-price span")
                price = clean_price(price_el.get_text() if price_el else None)
                if not price: continue

                # Original price
                orig_el = item.select_one("span.a-price.a-text-price span.a-offscreen")
                original_price = clean_price(orig_el.get_text() if orig_el else None)
                discount = calculate_discount(price, original_price) if original_price else None

                # Rating
                rating_el = item.select_one("span.a-icon-alt")
                rating = clean_rating(rating_el.get_text() if rating_el else None)

                # Reviews
                reviews_el = item.select_one("span.a-size-base.s-underline-text")
                reviews = clean_reviews(reviews_el.get_text() if reviews_el else None)

                # Image
                img_el = item.select_one("img.s-image")
                image_url = img_el.get("src") if img_el else None

                products.append(Product(
                    title=title, price=price, original_price=original_price,
                    discount=discount, rating=rating, reviews=reviews,
                    image_url=image_url, product_url=product_url,
                    site="amazon", available=True,
                ))
            except Exception as e:
                print(f"[Amazon] parse error: {e}")
    except Exception as e:
        print(f"[Amazon] failed: {e}")
    print(f"[Amazon] returning {len(products)}")
    return products

# ── Flipkart ────────────────────────────────────────────────────────
async def scrape_flipkart(query: str, client: httpx.AsyncClient) -> List[Product]:
    products = []
    try:
        url = f"https://www.flipkart.com/search?q={query.replace(' ', '+')}"
        r = await client.get(url, headers=HEADERS)
        print(f"[Flipkart] status={r.status_code} len={len(r.text)}")
        if r.status_code != 200: return []
        soup = BeautifulSoup(r.text, "html.parser")

        # Cards — try multiple layouts
        cards = (soup.select("div[data-id]")
              or soup.select("div.jIjQ8S")
              or soup.select("div._1AtVbE"))
        print(f"[Flipkart] cards={len(cards)}")

        for item in cards[:12]:
            try:
                # Title — from debug HTML: div.RG5Slk
                title_el = (item.select_one("div.RG5Slk")
                         or item.select_one("div.KzDlHZ")
                         or item.select_one("a.s1Q9rs")
                         or item.select_one("div._4rR01T"))
                if not title_el: continue
                title = title_el.get_text(strip=True)
                if len(title) < 5: continue

                # Price — from debug HTML: div.hZ3P6w
                price_el = (item.select_one("div.hZ3P6w")
                          or item.select_one("div.Nx9bqj")
                          or item.select_one("div._30jeq3"))
                price = clean_price(price_el.get_text() if price_el else None)
                if not price: continue

                # Original price — div.kRYCnD
                orig_el = (item.select_one("div.kRYCnD")
                         or item.select_one("div.yRaY8j")
                         or item.select_one("div._3I9_wc"))
                original_price = clean_price(orig_el.get_text() if orig_el else None)
                discount = calculate_discount(price, original_price) if original_price else None

                # Rating — div.MKiFS6
                rating_el = (item.select_one("div.MKiFS6")
                           or item.select_one("div.XQDdHH")
                           or item.select_one("div._3LWZlK"))
                rating = clean_rating(rating_el.get_text() if rating_el else None)

                # Link — a.k7wcnx
                link_el = (item.select_one("a.k7wcnx")
                         or item.select_one("a[href*='/p/']")
                         or item.select_one("a[href]"))
                href = link_el.get("href", "") if link_el else ""
                product_url = f"https://www.flipkart.com{href}" if href.startswith("/") else href

                # Image — img.UCc1lI
                img_el = (item.select_one("img.UCc1lI")
                        or item.select_one("img._396cs4")
                        or item.select_one("img.DByuf4"))
                image_url = img_el.get("src") if img_el else None

                products.append(Product(
                    title=title, price=price, original_price=original_price,
                    discount=discount, rating=rating, reviews=None,
                    image_url=image_url, product_url=product_url,
                    site="flipkart", available=True,
                ))
            except Exception as e:
                print(f"[Flipkart] parse error: {e}")
    except Exception as e:
        print(f"[Flipkart] failed: {e}")
    print(f"[Flipkart] returning {len(products)}")
    return products

# ── Meesho ──────────────────────────────────────────────────────────
async def scrape_meesho(query: str, client: httpx.AsyncClient) -> List[Product]:
    """Scrape Meesho via their GraphQL API."""
    products = []
    try:
        url = "https://www.meesho.com/api/v1/products/search"
        headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-IN,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.meesho.com",
            "Referer": f"https://www.meesho.com/search?q={query.replace(' ', '%20')}",
            "X-Requested-With": "XMLHttpRequest",
        }
        payload = {
            "query": query,
            "page": 1,
            "pageSize": 10,
            "filters": [],
            "facets": {},
            "searchType": "manual",
            "screen": "SEARCH",
        }
        r = await client.post(url, json=payload, headers=headers)
        print(f"[Meesho] status={r.status_code}")

        if r.status_code == 200:
            data = r.json()
            items = (data.get("products")
                  or data.get("data", {}).get("products")
                  or [])
            for item in items[:10]:
                try:
                    title = item.get("name") or item.get("product_name", "")
                    if not title: continue
                    price = float(item.get("min_price") or item.get("price") or item.get("selling_price") or 0) or None
                    if not price: continue
                    mrp = float(item.get("max_price") or item.get("mrp") or 0) or None
                    discount = int(((mrp - price) / mrp) * 100) if mrp and mrp > price else None
                    slug = item.get("slug", "")
                    pid = item.get("product_id") or item.get("id", "")
                    product_url = f"https://www.meesho.com/{slug}" if slug else f"https://www.meesho.com/search?q={query.replace(' ', '%20')}"
                    images = item.get("images") or []
                    image_url = None
                    if images:
                        img = images[0]
                        image_url = img.get("url") or img.get("src") or (img if isinstance(img, str) else None)
                    rating = float(item.get("rating") or item.get("avg_rating") or 0) or None
                    products.append(Product(
                        title=title, price=price, original_price=mrp,
                        discount=discount, rating=rating, reviews=None,
                        image_url=image_url, product_url=product_url,
                        site="meesho", available=True,
                    ))
                except Exception as e:
                    print(f"[Meesho] parse error: {e}")
        else:
            # Fallback: scrape the search page HTML
            page_url = f"https://www.meesho.com/search?q={query.replace(' ', '%20')}"
            page_headers = {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-IN,en;q=0.9",
            }
            r2 = await client.get(page_url, headers=page_headers)
            print(f"[Meesho] fallback page status={r2.status_code} len={len(r2.text)}")
            if r2.status_code == 200:
                # Meesho embeds product data in __NEXT_DATA__
                match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r2.text, re.DOTALL)
                if match:
                    try:
                        next_data = json.loads(match.group(1))
                        # Navigate to products in Next.js page props
                        page_props = next_data.get("props", {}).get("pageProps", {})
                        product_list = (page_props.get("products")
                                     or page_props.get("searchResults", {}).get("products")
                                     or [])
                        print(f"[Meesho] next_data products={len(product_list)}")
                        for item in product_list[:10]:
                            try:
                                title = item.get("name") or item.get("product_name", "")
                                if not title: continue
                                price = float(item.get("min_price") or item.get("price") or 0) or None
                                if not price: continue
                                slug = item.get("slug", "")
                                product_url = f"https://www.meesho.com/{slug}" if slug else page_url
                                images = item.get("images") or []
                                image_url = images[0].get("url") if images and isinstance(images[0], dict) else None
                                products.append(Product(
                                    title=title, price=price, original_price=None,
                                    discount=None, rating=float(item.get("rating") or 0) or None,
                                    reviews=None, image_url=image_url, product_url=product_url,
                                    site="meesho", available=True,
                                ))
                            except: pass
                    except Exception as e:
                        print(f"[Meesho] next_data parse error: {e}")
    except Exception as e:
        print(f"[Meesho] failed: {e}")
    print(f"[Meesho] returning {len(products)}")
    return products


async def scrape_myntra(query: str, client: httpx.AsyncClient) -> List[Product]:
    """Scrape Myntra via their search API."""
    products = []
    try:
        # Myntra has a JSON search API
        api_url = "https://www.myntra.com/gateway/v2/search/searchResults/v2"
        headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-IN,en;q=0.9",
            "Referer": f"https://www.myntra.com/{query.replace(' ', '-')}",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://www.myntra.com",
        }
        params = {
            "rawQuery": query,
            "p": 1,
            "rows": 10,
            "o": 0,
            "plaEnabled": "false",
        }
        r = await client.get(api_url, params=params, headers=headers)
        print(f"[Myntra] API status={r.status_code}")

        if r.status_code == 200:
            data = r.json()
            items = (data.get("searchData", {}).get("results", {}).get("products")
                  or data.get("results", {}).get("products")
                  or [])
            print(f"[Myntra] API products={len(items)}")
            for item in items[:10]:
                try:
                    brand = item.get("brand", "")
                    name = item.get("productType") or item.get("product", "")
                    title = f"{brand} {name}".strip()
                    if not title: continue
                    price = float(item.get("price") or 0) or None
                    if not price: continue
                    mrp = float(item.get("mrp") or 0) or None
                    discount = int(item.get("discountDisplayLabel", "0%").replace("%", "").strip()) if item.get("discountDisplayLabel") else None
                    rating = float(item.get("rating") or 0) or None
                    slug = item.get("landingPageUrl", "")
                    product_url = f"https://www.myntra.com/{slug}" if slug else "https://www.myntra.com"
                    images = item.get("images") or []
                    image_url = images[0].get("src") if images and isinstance(images[0], dict) else item.get("imageURI") or None
                    products.append(Product(
                        title=title, price=price, original_price=mrp,
                        discount=discount, rating=rating, reviews=None,
                        image_url=image_url, product_url=product_url,
                        site="myntra", available=True,
                    ))
                except Exception as e:
                    print(f"[Myntra] parse error: {e}")
        else:
            # Fallback: scrape HTML and look for __NEXT_DATA__
            page_url = f"https://www.myntra.com/{query.replace(' ', '-')}"
            r2 = await client.get(page_url, headers={
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                "Accept-Language": "en-IN,en;q=0.9",
            })
            print(f"[Myntra] fallback status={r2.status_code} len={len(r2.text)}")
            if r2.status_code == 200 and len(r2.text) > 5000:
                soup = BeautifulSoup(r2.text, "html.parser")
                # Try __NEXT_DATA__
                next_script = soup.find("script", {"id": "__NEXT_DATA__"})
                if next_script:
                    try:
                        ndata = json.loads(next_script.string)
                        items = (ndata.get("props", {}).get("pageProps", {}).get("products")
                              or [])
                        print(f"[Myntra] next_data products={len(items)}")
                        for item in items[:10]:
                            title = f"{item.get('brand','')} {item.get('product','')}".strip()
                            if not title: continue
                            price = float(item.get("price") or 0) or None
                            if not price: continue
                            slug = item.get("landingPageUrl", "")
                            product_url = f"https://www.myntra.com/{slug}" if slug else page_url
                            products.append(Product(
                                title=title, price=price,
                                original_price=float(item.get("mrp") or 0) or None,
                                discount=None, rating=float(item.get("rating") or 0) or None,
                                reviews=None, image_url=None, product_url=product_url,
                                site="myntra", available=True,
                            ))
                    except Exception as e:
                        print(f"[Myntra] next_data error: {e}")
                else:
                    # Try inline JSON in script tags
                    for script in soup.find_all("script"):
                        text = script.string or ""
                        match = re.search(r'"products"\s*:\s*(\[.*?\])', text, re.DOTALL)
                        if match:
                            try:
                                items = json.loads(match.group(1))
                                for item in items[:10]:
                                    title = f"{item.get('brand','')} {item.get('product','')}".strip()
                                    if not title: continue
                                    price = float(item.get("price") or 0) or None
                                    if not price: continue
                                    slug = item.get("landingPageUrl", "")
                                    product_url = f"https://www.myntra.com/{slug}" if slug else page_url
                                    products.append(Product(
                                        title=title, price=price,
                                        original_price=float(item.get("mrp") or 0) or None,
                                        discount=None, rating=float(item.get("rating") or 0) or None,
                                        reviews=None, image_url=None, product_url=product_url,
                                        site="myntra", available=True,
                                    ))
                            except: pass
                            break
    except Exception as e:
        print(f"[Myntra] failed: {e}")
    print(f"[Myntra] returning {len(products)}")
    return products

@app.get("/test-scrape")
async def test_scrape(q: str = "iphone"):
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        amazon = await scrape_amazon(q, client)
        flipkart = await scrape_flipkart(q, client)
    return {
        "amazon": len(amazon),
        "flipkart": len(flipkart),
        "amazon_sample": amazon[0].dict() if amazon else None,
        "flipkart_sample": flipkart[0].dict() if flipkart else None,
    }

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    if not request.query or len(request.query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query too short")

    query = request.query.strip()
    sites = request.sites or ["amazon", "flipkart", "meesho", "myntra"]
    print(f"[Search] query='{query}' sites={sites}")

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        tasks = []
        if "amazon"   in sites: tasks.append(scrape_amazon(query, client))
        if "flipkart" in sites: tasks.append(scrape_flipkart(query, client))
        if "meesho"   in sites: tasks.append(scrape_meesho(query, client))
        if "myntra"   in sites: tasks.append(scrape_myntra(query, client))
        results = await asyncio.gather(*tasks, return_exceptions=True)

    all_products = []
    for result in results:
        if isinstance(result, list):
            all_products.extend(result)
        elif isinstance(result, Exception):
            print(f"[Search] exception: {result}")

    all_products.sort(key=lambda p: p.price if p.price else float("inf"))
    print(f"[Search] total={len(all_products)}")

    ai_analysis = await analyze_products(query, all_products)

    return SearchResponse(
        query=query,
        total_results=len(all_products),
        products=all_products,
        ai_analysis=ai_analysis,
    )
