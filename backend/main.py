from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from cachetools import TTLCache
from typing import List
import asyncio

from .models import SearchRequest, SearchResponse, Product
from .config import settings
from .scrapers import scrape_amazon, scrape_flipkart
from .ai_analyzer import analyze_products

app = FastAPI(title="AI Shopping Agent", version="1.0.0")

# CORS - Restrict to allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    raise HTTPException(
        status_code=429,
        detail=f"Rate limit exceeded. Try again in {exc.detail.split(' ')[-1]}."
    )

# Cache for search results (10 minute TTL)
search_cache = TTLCache(maxsize=100, ttl=settings.cache_ttl_seconds)

@app.post("/search", response_model=SearchResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def search_products(request: SearchRequest):
    """Search products across multiple e-commerce sites."""
    cache_key = f"{request.query}:{','.join(sorted(request.sites))}"
    
    # Check cache first
    if cache_key in search_cache:
        return search_cache[cache_key]
    
    # Run scrapers concurrently with error handling
    scraper_tasks = []
    if "amazon" in request.sites:
        scraper_tasks.append(scrape_amazon(request.query, request.limit))
    if "flipkart" in request.sites:
        scraper_tasks.append(scrape_flipkart(request.query, request.limit))
    # Add meesho and myntra tasks...
    
    results = await asyncio.gather(*scraper_tasks, return_exceptions=True)
    
    # Filter out exceptions and combine products
    all_products: List[Product] = []
    for result in results:
        if isinstance(result, list):
            all_products.extend(result)
        elif isinstance(result, Exception):
            print(f"Scraper error: {result}")
    
    if not all_products:
        raise HTTPException(status_code=404, detail="No products found")
    
    # Analyze with AI
    analysis = analyze_products(request.query, all_products)
    
    response = SearchResponse(
        query=request.query,
        products=all_products,
        analysis=analysis,
        total=len(all_products)
    )
    
    # Cache the response
    search_cache[cache_key] = response
    
    return response

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
