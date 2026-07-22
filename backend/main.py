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
    products = []
    try:
        url = "https://www.meesho.com/api/v1/products/search"
        headers = {**HEADERS, "Content-Type": "application/json",
                   "Accept": "application/json", "Origin": "https://www.meesho.com"}
        payload = {"query": query, "page": 1, "pageSize": 8, "filters": [], "facets": {}}
        r = await client.post(url, json=payload, headers=headers)
        print(f"[Meesho] status={r.status_code}")
        if r.status_code != 200: return []
        data = r.json()
        items = data.get("products") or data.get("data", {}).get("products", [])
        for item in items[:8]:
            try:
                title = item.get("name") or item.get("product_name", "")
                if not title: continue
                price = float(item.get("min_price") or item.get("price") or 0) or None
                if not price: continue
                slug = item.get("slug", "")
                product_url = f"https://www.meesho.com/{slug}" if slug else "https://www.meesho.com"
                images = item.get("images") or []
                image_url = images[0].get("url") if images and isinstance(images[0], dict) else None
                products.append(Product(
                    title=title, price=price, original_price=None, discount=None,
                    rating=float(item.get("rating") or 0) or None, reviews=None,
                    image_url=image_url, product_url=product_url, site="meesho", available=True,
                ))
            except Exception as e:
                print(f"[Meesho] parse error: {e}")
    except Exception as e:
        print(f"[Meesho] failed: {e}")
    print(f"[Meesho] returning {len(products)}")
    return products

# ── Myntra ──────────────────────────────────────────────────────────
async def scrape_myntra(query: str, client: httpx.AsyncClient) -> List[Product]:
    products = []
    try:
        url = f"https://www.myntra.com/{query.replace(' ', '-')}"
        r = await client.get(url, headers=HEADERS)
        print(f"[Myntra] status={r.status_code} len={len(r.text)}")
        if r.status_code != 200: return []
        soup = BeautifulSoup(r.text, "html.parser")
        for script in soup.find_all("script"):
            text = script.string or ""
            match = re.search(r'"products"\s*:\s*(\[.*?\])', text, re.DOTALL)
            if match:
                try:
                    items = json.loads(match.group(1))
                    for item in items[:8]:
                        title = f"{item.get('brand','')} {item.get('product','')}".strip()
                        if not title: continue
                        price = float(item.get("price") or 0) or None
                        if not price: continue
                        slug = item.get("landingPageUrl", "")
                        product_url = f"https://www.myntra.com/{slug}" if slug else "https://www.myntra.com"
                        images = item.get("images") or []
                        image_url = images[0].get("src") if images and isinstance(images[0], dict) else None
                        products.append(Product(
                            title=title, price=price,
                            original_price=float(item.get("mrp") or 0) or None,
                            discount=None, rating=float(item.get("rating") or 0) or None,
                            reviews=None, image_url=image_url, product_url=product_url,
                            site="myntra", available=True,
                        ))
                except Exception as e:
                    print(f"[Myntra] json error: {e}")
                break
    except Exception as e:
        print(f"[Myntra] failed: {e}")
    print(f"[Myntra] returning {len(products)}")
    return products

# ── Routes ──────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "AI Shopping Agent API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

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
    
