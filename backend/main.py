"""
FastAPI application — production entry point.

Middleware stack (outer → inner):
  1. Request ID      — assigns X-Request-ID to every request for tracing
  2. Security headers — X-Content-Type-Options, X-Frame-Options, etc.
  3. Request logging  — method, path, status, elapsed ms, request ID
  4. CORS            — enforced to allowed_origins_list from settings

Routes:
  GET /api/v1/search        — main product search
  GET /api/v1/health        — canary scraper health (expensive, not for LB)
  GET /api/v1/cache/stats   — cache hit rates and disk usage
  GET /api/ping             — liveness check (cheap, use for LB health check)
"""
from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from cache import get_stats as cache_stats
from config import get_settings
from models import ErrorDetail, ErrorResponse, HealthCheckResult, SearchResponse
from services.aggregator import run_search
from services.health_monitor import run_health_check

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

try:
    from pythonjsonlogger import jsonlogger
    _handler = logging.StreamHandler()
    _handler.setFormatter(
        jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    logging.root.handlers = [_handler]
except ImportError:
    pass  # plain text logging in dev is fine

logger = logging.getLogger("main")


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "AI Shopping Agent starting | env=%s scraperapi=%s gemini=%s",
        settings.environment,
        "configured" if settings.scraperapi_key else "MISSING",
        "configured" if settings.gemini_api_key else "MISSING",
    )
    yield
    logger.info("AI Shopping Agent shutting down")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Shopping Agent API",
    version="2.2.0",
    description=(
        "Compares products across Amazon, Flipkart, Meesho, and Myntra. "
        "Results are explicitly labeled fresh, stale, or unavailable. "
        "AI recommendations are grounded strictly in the real data returned — "
        "no hallucinated prices or products."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "X-Request-ID", "X-Gemini-Key", "X-ScraperAPI-Key"],
)


# ── Middleware ────────────────────────────────────────────────────────────────
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    t0 = time.monotonic()
    response = await call_next(request)
    elapsed_ms = round((time.monotonic() - t0) * 1000)
    req_id = getattr(request.state, "request_id", "-")
    logger.info(
        "%s %s %d %dms [%s]",
        request.method, request.url.path, response.status_code, elapsed_ms, req_id,
    )
    return response


# ── Exception handlers ────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "-")
    logger.exception("Unhandled error [%s]", req_id)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INTERNAL_ERROR",
                message="An unexpected error occurred. Please try again.",
                request_id=req_id,
            )
        ).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    req_id = getattr(request.state, "request_id", "-")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                code="HTTP_ERROR",
                message=str(exc.detail),
                request_id=req_id,
            )
        ).model_dump(),
    )


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/api/v1/search", response_model=SearchResponse, tags=["search"])
async def search(
    request: Request,
    q: str = Query(..., min_length=2, max_length=200, description="Product search query"),
):
    """
    Search for a product across all configured marketplaces.

    Each source result is labeled:
    - **fresh** — scraped successfully right now
    - **stale** — live scrape failed, showing last-cached result
    - **unavailable** — no data available from this source

    Optional headers:
    - **X-Gemini-Key** — user's own Gemini API key for AI recommendations
    - **X-ScraperAPI-Key** — user's own ScraperAPI key for scraping

    The AI recommendation is grounded only in the data returned above —
    it will not invent prices or products.
    """
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be blank.")

    # Accept user-supplied keys from request headers
    user_gemini_key = request.headers.get("X-Gemini-Key", "").strip() or None
    user_scraperapi_key = request.headers.get("X-ScraperAPI-Key", "").strip() or None

    result = await run_search(
        query,
        user_gemini_key=user_gemini_key,
        user_scraperapi_key=user_scraperapi_key,
    )
    result.request_id = getattr(request.state, "request_id", None)
    return result


# Backward-compat alias
@app.get("/api/search", response_model=SearchResponse, include_in_schema=False)
async def search_compat(request: Request, q: str = Query(..., min_length=2, max_length=200)):
    return await search(request, q)


@app.get("/api/v1/health", response_model=list[HealthCheckResult], tags=["ops"])
async def health():
    """
    Runs a live canary search per source. **Expensive** — do not use as a
    load-balancer health check. Use `/api/ping` for that instead.
    Wire this to a scheduled job (e.g. every 6 hours) and alert on failures.
    """
    return await run_health_check()


@app.get("/api/health", response_model=list[HealthCheckResult], include_in_schema=False)
async def health_compat():
    return await run_health_check()


@app.get("/api/v1/cache/stats", tags=["ops"])
async def cache_statistics():
    """Cache hit/miss rates and disk usage for monitoring and TTL tuning."""
    return cache_stats()


@app.get("/api/ping", tags=["ops"])
async def ping():
    """
    Cheap liveness check. No external calls.
    Use this as the load-balancer / container health check endpoint.
    """
    return {"status": "ok", "version": "2.2.0"}


@app.delete("/api/v1/cache", tags=["ops"])
async def cache_clear():
    """
    Clears all cached scrape results. Useful after scraper selectors are updated
    to force fresh fetches on the next search. Requires ops access.
    """
    from cache import clear_all
    count = clear_all()
    logger.info("Cache cleared: %d entries removed", count)
    return {"cleared": count}


@app.get("/api/v1/validate-keys", tags=["ops"])
async def validate_keys(request: Request):
    """
    Validates API keys — either server-configured or user-supplied via headers.
    Returns which services are available without making a full search.
    Used by the frontend to show the API key setup screen when needed.
    """
    user_gemini_key = request.headers.get("X-Gemini-Key", "").strip() or None
    user_scraperapi_key = request.headers.get("X-ScraperAPI-Key", "").strip() or None

    gemini_key = user_gemini_key or settings.gemini_api_key
    scraper_key = user_scraperapi_key or settings.scraperapi_key

    # Quick test of Gemini key
    gemini_ok = False
    gemini_error = None
    if gemini_key:
        try:
            import httpx as _httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}"
            async with _httpx.AsyncClient(timeout=8) as client:
                r = await client.get(url)
            gemini_ok = r.status_code == 200
            if not gemini_ok:
                gemini_error = "Invalid or unavailable key" if r.status_code in (400, 401, 403) else "Could not verify this key"
        except Exception:  # noqa: BLE001
            gemini_error = "Could not reach the key verification service"
    else:
        gemini_error = "No key provided"

    # Lightweight real ScraperAPI check so a present-but-invalid key is not reported as working.
    scraper_ok = False
    scraper_error = None
    if scraper_key:
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=8) as client:
                response = await client.get(
                    "https://api.scraperapi.com/",
                    params={
                        "api_key": scraper_key,
                        "url": "https://example.com/",
                        "country_code": "in",
                    },
                )
            scraper_ok = response.status_code == 200 and bool(response.text.strip())
            if not scraper_ok:
                scraper_error = "Invalid or unavailable key" if response.status_code in (400, 401, 403) else "Could not verify this key"
        except _httpx.TimeoutException:
            scraper_error = "Key verification timed out"
        except Exception:  # noqa: BLE001
            scraper_error = "Could not reach the key verification service"
    else:
        scraper_error = "No key provided"

    return {
        "scraping": {
            "available": scraper_ok,
            "source": "user" if user_scraperapi_key else ("server" if settings.scraperapi_key else "none"),
            "error": None if scraper_ok else scraper_error,
        },
        "ai": {
            "available": gemini_ok,
            "source": "user" if user_gemini_key else ("server" if settings.gemini_api_key else "none"),
            "error": gemini_error,
        },
    }
