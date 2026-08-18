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

import hmac
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
from services.browser_manager import close_browser
from services.health_monitor import run_health_check
from services.rate_limiter import allow_request

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
# httpx logs complete request URLs at INFO, which would expose provider query
# parameters such as api_key. Application logs retain our own safe summaries.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

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
        "AI Shopping Agent starting | env=%s scraperapi=%s scrapingant=%s brightdata=%s",
        settings.environment,
        "configured" if settings.scraperapi_key else "MISSING",
        "configured" if settings.scrapingant_api_key else "MISSING",
        "configured" if settings.brightdata_api_key else "MISSING",
    )
    yield
    await close_browser()
    logger.info("AI Shopping Agent shutting down")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Shopping Agent API",
    version="2.2.0",
    description=(
        "Compares products across Amazon, Flipkart, Meesho, Myntra, and JioMart. "
        "Results are explicitly labeled fresh, stale, or unavailable. "
        "Recommendations are calculated strictly from the real data returned — "
        "no invented prices or products."
    ),
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url="/api/redoc" if not settings.is_production else None,
    openapi_url="/api/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "DELETE"],
    allow_headers=[
        "Content-Type",
        "X-Request-ID",
        "X-ScraperAPI-Key",
        "X-ScrapingAnt-Key",
        "X-BrightData-Key",
        "X-BrightData-Zone",
        "X-Ops-Token",
    ],
)


# ── Middleware ────────────────────────────────────────────────────────────────
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    candidate = request.headers.get("X-Request-ID", "")
    request_id = candidate if candidate and len(candidate) <= 64 and all(
        char.isalnum() or char in "._:-" for char in candidate
    ) else str(uuid.uuid4())[:8]
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
        headers={**(exc.headers or {}), "X-Request-ID": req_id},
    )


# ── Route guards ───────────────────────────────────────────────────────────────
def _request_key(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    client_ip = forwarded.split(",", 1)[0].strip() if forwarded else ""
    return client_ip or (request.client.host if request.client else "unknown")


async def _rate_limit(request: Request, scope: str) -> None:
    allowed, retry_after = await allow_request(f"{scope}:{_request_key(request)}")
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )


def _require_ops_access(request: Request) -> None:
    if not settings.is_production:
        return
    supplied = request.headers.get("X-Ops-Token", "")
    if not settings.ops_token or not hmac.compare_digest(supplied, settings.ops_token):
        raise HTTPException(status_code=404, detail="Not found")


def _public_source_error(error: str | None) -> str | None:
    if not error:
        return None
    normalized = error.lower()
    if any(token in normalized for token in ("http ", "api", "provider", "timeout", "network", "empty", "request failed")):
        return "Live marketplace access is temporarily unavailable."
    return "This marketplace is temporarily unavailable."


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
    - **X-ScraperAPI-Key** — user's own ScraperAPI key
    - **X-ScrapingAnt-Key** — user's own ScrapingAnt key
    - **X-BrightData-Key** — user's own Bright Data key
    - **X-BrightData-Zone** — optional Bright Data Web Unlocker zone

    The recommendation is calculated locally from the returned product data
    using transparent price, rating, and review weights.
    """
    await _rate_limit(request, "search")
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be blank.")

    from utils.http_client import ProviderCredentials
    provider_credentials = ProviderCredentials(
        scraperapi_key=request.headers.get("X-ScraperAPI-Key", "").strip() or None,
        scrapingant_key=request.headers.get("X-ScrapingAnt-Key", "").strip() or None,
        brightdata_key=request.headers.get("X-BrightData-Key", "").strip() or None,
        brightdata_zone=request.headers.get("X-BrightData-Zone", "").strip() or None,
    )

    result = await run_search(query, provider_credentials=provider_credentials)
    for source_result in result.results:
        source_result.error = _public_source_error(source_result.error)
    result.ai_error = _public_source_error(result.ai_error)
    result.request_id = getattr(request.state, "request_id", None)
    return result


# Backward-compat alias
@app.get("/api/search", response_model=SearchResponse, include_in_schema=False)
async def search_compat(request: Request, q: str = Query(..., min_length=2, max_length=200)):
    return await search(request, q)


@app.get("/api/v1/health", response_model=list[HealthCheckResult], tags=["ops"])
async def health(request: Request):
    """
    Runs a live canary search per source. **Expensive** — do not use as a
    load-balancer health check. Use `/api/ping` for that instead.
    Wire this to a scheduled job (e.g. every 6 hours) and alert on failures.
    """
    _require_ops_access(request)
    return await run_health_check()


@app.get("/api/health", response_model=list[HealthCheckResult], include_in_schema=False)
async def health_compat(request: Request):
    _require_ops_access(request)
    return await run_health_check()


@app.get("/api/v1/cache/stats", tags=["ops"])
async def cache_statistics(request: Request):
    """Cache hit rates and disk usage for monitoring and TTL tuning."""
    _require_ops_access(request)
    return cache_stats()


@app.get("/api/ping", tags=["ops"])
async def ping():
    """
    Cheap liveness check. No external calls.
    Use this as the load-balancer / container health check endpoint.
    """
    return {"status": "ok", "version": "2.2.0"}


@app.delete("/api/v1/cache", tags=["ops"])
async def cache_clear(request: Request):
    """
    Clears all cached scrape results. Useful after scraper selectors are updated
    to force fresh fetches on the next search. Requires ops access.
    """
    _require_ops_access(request)
    from cache import clear_all
    count = clear_all()
    logger.info("Cache cleared: %d entries removed", count)
    return {"cleared": count}


@app.get("/api/v1/validate-keys", tags=["ops"])
async def validate_keys(request: Request):
    """Validate provider credentials without exposing keys or scraping data."""
    await _rate_limit(request, "validate-keys")
    scraperapi_key = request.headers.get("X-ScraperAPI-Key", "").strip() or settings.scraperapi_key
    scrapingant_key = request.headers.get("X-ScrapingAnt-Key", "").strip() or settings.scrapingant_api_key
    brightdata_key = request.headers.get("X-BrightData-Key", "").strip() or settings.brightdata_api_key
    brightdata_zone = request.headers.get("X-BrightData-Zone", "").strip() or settings.brightdata_zone

    async def verify_scraperapi() -> tuple[bool, str | None]:
        if not scraperapi_key:
            return False, "No key provided"
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=8) as client:
                response = await client.get(
                    "https://api.scraperapi.com/",
                    params={"api_key": scraperapi_key, "url": "https://example.com/", "country_code": "in"},
                )
            if response.status_code == 200 and response.text.strip():
                return True, None
            return False, "Invalid or unavailable key"
        except Exception:  # noqa: BLE001
            return False, "Could not verify this key"

    async def verify_scrapingant() -> tuple[bool, str | None]:
        if not scrapingant_key:
            return False, "No key provided"
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=8) as client:
                response = await client.get(
                    "https://api.scrapingant.com/v2/general",
                    params={"url": "https://example.com/", "x-api-key": scrapingant_key, "browser": False, "timeout": 5},
                )
            if response.status_code == 200 and response.text.strip():
                return True, None
            return False, "Invalid or unavailable key"
        except Exception:  # noqa: BLE001
            return False, "Could not verify this key"

    async def verify_brightdata() -> tuple[bool, str | None]:
        if not brightdata_key or not brightdata_zone:
            return False, "No key or zone provided"
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=8) as client:
                response = await client.post(
                    "https://api.brightdata.com/request",
                    headers={"Authorization": f"Bearer {brightdata_key}", "Content-Type": "application/json"},
                    json={"zone": brightdata_zone, "url": "https://example.com/", "format": "raw"},
                )
            return (True, None) if response.status_code == 200 and response.text.strip() else (False, "Invalid or unavailable key")
        except Exception:  # noqa: BLE001
            return False, "Could not verify this key"

    import asyncio
    try:
        (scraperapi_ok, scraperapi_error), (scrapingant_ok, scrapingant_error), (brightdata_ok, brightdata_error) = await asyncio.wait_for(
            asyncio.gather(verify_scraperapi(), verify_scrapingant(), verify_brightdata()),
            timeout=12,
        )
    except asyncio.TimeoutError:
        scraperapi_ok, scraperapi_error = False, "Key verification timed out"
        scrapingant_ok, scrapingant_error = False, "Key verification timed out"
        brightdata_ok, brightdata_error = False, "Key verification timed out"

    available = scraperapi_ok or scrapingant_ok or brightdata_ok
    return {
        "scraping": {
            "available": available,
            "source": "user" if request.headers.get("X-ScraperAPI-Key") or request.headers.get("X-ScrapingAnt-Key") or request.headers.get("X-BrightData-Key") else "server" if settings.scraperapi_key or settings.scrapingant_api_key or settings.brightdata_api_key else "none",
            "error": None if available else "No configured provider could be verified",
        },
        "scraperapi": {"available": scraperapi_ok, "error": scraperapi_error},
        "scrapingant": {"available": scrapingant_ok, "error": scrapingant_error},
        "brightdata": {"available": brightdata_ok, "error": brightdata_error},
    }
