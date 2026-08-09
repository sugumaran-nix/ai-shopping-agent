"""
Shopiq Backend — FastAPI entry point.
"""
from __future__ import annotations
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import SearchResponse
from services.aggregator import run_search

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
log = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Shopiq backend v3 starting")
    yield
    log.info("Shopiq backend shutting down")


app = FastAPI(
    title="Shopiq API",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    log.error("Unhandled: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


@app.get("/api/ping")
async def ping():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/api/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=2, max_length=200),
):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    return await run_search(query)


@app.get("/api/health")
async def health():
    from scrapers import AmazonScraper, FlipkartScraper, AjioScraper, SnapdealScraper, CromaScraper
    from models import Status

    scrapers = [AmazonScraper(), FlipkartScraper(), AjioScraper(), SnapdealScraper(), CromaScraper()]
    results = await asyncio.gather(*[s.search("wireless mouse") for s in scrapers])

    return [
        {
            "source": r.source.value,
            "healthy": r.status == Status.FRESH and len(r.products) > 0,
            "status": r.status.value,
            "products_found": len(r.products),
            "error": r.error,
        }
        for r in results
    ]
