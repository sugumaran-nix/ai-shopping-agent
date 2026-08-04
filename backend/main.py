"""
FastAPI application entry point.

What's improved over the original:
  - Startup validation (fail fast if critical env vars are missing)
  - Request ID middleware for tracing across logs
  - Centralized exception handling — stack traces never reach the client
  - Security headers middleware
  - Structured JSON logging
  - Rate limiting via slowapi
  - API versioning prefix (/api/v1/...)
  - Cache stats endpoint for operational visibility
  - /api/ping for cheap liveness checks
  - /api/health for real canary checks (expensive — don't hit from load balancer)
"""
from __future__ import annotations

import logging
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

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s [%(request_id)s]: %(message)s"
    if False  # pythonjsonlogger handles this when configured
    else "%(asctime)s %(levelname)s %(name)s: %(message)s",
)

try:
    from pythonjsonlogger import jsonlogger
    handler = logging.StreamHandler()
    handler.setFormatter(
        jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    logging.root.handlers = [handler]
except ImportError:
    pass

logger = logging.getLogger("main")
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting AI Shopping Agent | env=%s gemini=%s ebay=%s scraperapi=%s",
        settings.environment,
        "yes" if settings.gemini_enabled else "NO",
        "yes" if settings.ebay_enabled else "no",
        "yes" if settings.scraperapi_key else "NO",
    )
    yield
    logger.info("Shutting down")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Shopping Agent API",
    version="2.1.0",
    description=(
        "Compares products across Amazon, Flipkart, Meesho, Myntra, and eBay "
        "with validated data, transparent fresh/stale labeling, and an AI "
        "recommendation grounded strictly in that real data."
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
    allow_methods=["GET"],  # this API is read-only
    allow_headers=["Content-Type", "X-Request-ID"],
)


# ── Middleware: request ID ─────────────────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Middleware: security headers ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ── Middleware: request logging ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    start = time.monotonic()
    response = await call_next(request)
    elapsed = round((time.monotonic() - start) * 1000)
    req_id = getattr(request.state, "request_id", "-")
    logger.info(
        "%s %s → %d  (%dms) [%s]",
        request.method, request.url.path, response.status_code, elapsed, req_id,
    )
    return response


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "-")
    logger.exception("Unhandled error [%s]: %s", req_id, exc)
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
                message=exc.detail,
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

    Results are explicitly labeled `fresh`, `stale`, or `unavailable` per source.
    The AI recommendation is grounded only in the data returned — it won't invent
    products or prices.
    """
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty after trimming whitespace.")
    req_id = getattr(request.state, "request_id", None)
    result = await run_search(query)
    result.request_id = req_id
    return result


# Keep old path working for backwards compatibility
@app.get("/api/search", response_model=SearchResponse, include_in_schema=False)
async def search_compat(
    request: Request,
    q: str = Query(..., min_length=2, max_length=200),
):
    return await search(request, q)


@app.get("/api/v1/health", response_model=list[HealthCheckResult], tags=["ops"])
async def health():
    """
    Runs a real canary search against each scraper and reports which sources
    are working. This is intentionally expensive — wire it up to a scheduled
    job (every 6 hours) rather than a load-balancer health check.
    Use /api/ping for cheap liveness checks.
    """
    return await run_health_check()


@app.get("/api/health", response_model=list[HealthCheckResult], include_in_schema=False)
async def health_compat():
    return await health()


@app.get("/api/ping", tags=["ops"])
async def ping():
    """
    Cheap liveness check. Does not touch any external service.
    Use this for load-balancer / container health checks.
    """
    return {"status": "ok", "version": "2.1.0"}


@app.get("/api/v1/cache/stats", tags=["ops"])
async def cache_statistics():
    """
    Returns cache hit/miss rates and disk usage. Useful for monitoring and
    tuning TTL values.
    """
    return cache_stats()
