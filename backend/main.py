import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from models import HealthCheckResult, SearchResponse
from services.aggregator import run_search
from services.health_monitor import run_health_check

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

settings = get_settings()

app = FastAPI(
    title="AI Shopping Agent API",
    version="2.0.0",
    description=(
        "Compares products across Amazon, Flipkart, Meesho, Myntra, and eBay, "
        "with validated data, transparent fresh/stale labeling, and an AI "
        "recommendation grounded strictly in that real data."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/search", response_model=SearchResponse)
async def search(q: str = Query(..., min_length=2, max_length=200, description="Product search query")):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    return await run_search(query)


@app.get("/api/health", response_model=list[HealthCheckResult])
async def health():
    """
    Runs a real canary search against each scraper right now and reports
    which sources are actually working. Point an external uptime/cron job
    at this endpoint - don't rely on users to tell you a scraper died.
    """
    return await run_health_check()


@app.get("/api/ping")
async def ping():
    """Cheap liveness check that doesn't touch any external site - use this
    for load balancer / container health checks instead of /api/health,
    which is intentionally expensive (it does real scrapes)."""
    return {"status": "ok"}
