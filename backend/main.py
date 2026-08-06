import logging
import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from models import HealthCheckResult, SearchResponse
from services.aggregator import run_search
from services.health_monitor import run_health_check

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

settings = get_settings()

app = FastAPI(
    title="Shopiq API",
    version="2.0.0",
)

# In production allow the Vercel frontend + localhost dev.
# Set ALLOWED_ORIGINS in Render env vars to your actual Vercel URL.
origins = settings.allowed_origins_list
if not origins or origins == ["http://localhost:3000"]:
    # Fallback: allow all — safe because we have no auth/sessions
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=2, max_length=200)
):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    return await run_search(query)


@app.get("/api/health", response_model=list[HealthCheckResult])
async def health():
    return await run_health_check()


@app.get("/api/ping")
async def ping():
    return {"status": "ok"}
