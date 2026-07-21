import sys
import os

# Fix module resolution on Render
sys.path.insert(0, os.import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from dotenv import load_dotenv

load_dotenv()

from scrapers import scrape_amazon, scrape_flipkart, scrape_meesho, scrape_myntra
from agent import analyze_products
from models.product import Product

app = FastAPI(
    title="AI Shopping Agent",
    description="Search products across Amazon, Flipkart, Meesho and Myntra",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

@app.get("/")
async def root():
    return {"message": "AI Shopping Agent API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    if not request.query or len(request.query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query too short")

    query = request.query.strip()
    sites = request.sites or ["amazon", "flipkart", "meesho", "myntra"]

    scraper_map = {
        "amazon": scrape_amazon,
        "flipkart": scrape_flipkart,
        "meesho": scrape_meesho,
        "myntra": scrape_myntra,
    }

    tasks = [scraper_map[site](query) for site in sites if site in scraper_map]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_products = []
    for result in results:
        if isinstance(result, Exception):
            print(f"[Search] Scraper error: {result}")
            continue
        if isinstance(result, list):
            all_products.extend(result)

    all_products.sort(key=lambda p: p.price)
    ai_analysis = await analyze_products(query, all_products)

    return SearchResponse(
        query=query,
        total_results=len(all_products),
        products=all_products,
        ai_analysis=ai_analysis,
    )path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from dotenv import load_dotenv

load_dotenv()

from scrapers import scrape_amazon, scrape_flipkart, scrape_meesho, scrape_myntra
from agent import analyze_products
from models.product import Product

app = FastAPI(
    title="AI Shopping Agent",
    description="Search products across Amazon, Flipkart, Meesho and Myntra with AI-powered recommendations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

@app.get("/")
async def root():
    return {"message": "AI Shopping Agent API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    if not request.query or len(request.query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query too short")

    query = request.query.strip()
    sites = request.sites or ["amazon", "flipkart", "meesho", "myntra"]

    scraper_map = {
        "amazon": scrape_amazon,
        "flipkart": scrape_flipkart,
        "meesho": scrape_meesho,
        "myntra": scrape_myntra,
    }

    tasks = [
        scraper_map[site](query)
        for site in sites
        if site in scraper_map
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_products = []
    for result in results:
        if isinstance(result, Exception):
            print(f"[Search] Scraper error: {result}")
            continue
        if isinstance(result, list):
            all_products.extend(result)

    all_products.sort(key=lambda p: p.price)

    ai_analysis = await analyze_products(query, all_products)

    return SearchResponse(
        query=query,
        total_results=len(all_products),
        products=all_products,
        ai_analysis=ai_analysis,
    )
