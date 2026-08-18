# AI Shopping Agent

Compares products across **Amazon, Flipkart, Meesho, Myntra**, and the **official eBay Browse API**, then uses **Google Gemini** to generate a buying recommendation grounded strictly in the real data returned.

**No dummy, sample, or fabricated data exists anywhere in this codebase.** Every product shown comes from a real scrape or a real API call, and every result is explicitly labeled — `fresh`, `stale`, or `unavailable` — so you always know what you're looking at.

---

## Architecture

```
backend/
  main.py                   FastAPI app (versioned routes, middleware stack)
  config.py                 Centralized, validated settings (pydantic-settings)
  models.py                 Product schema + strict validation rules
  cache.py                  Disk-backed fresh/stale cache with stats
  scrapers/
    base.py                 Shared scrape → validate → cache → fallback flow
    amazon.py / flipkart.py / meesho.py / myntra.py
  services/
    aggregator.py           Runs all sources concurrently (semaphore-bounded)
    ai_service.py           Gemini recommendation, grounded in labeled data
    ebay_service.py         Official eBay Browse API client (OAuth2)
    health_monitor.py       Canary health checks per source
  utils/
    http_client.py          ScraperAPI wrapper with retry/backoff
    headers.py              Shared parsing utilities (price, rating, URL)
  tests/
    test_models.py          Pydantic validation unit tests
    test_cache.py           Cache behaviour tests
    test_api.py             API endpoint integration tests
    test_scrapers.py        Parser unit tests (no network)

frontend/
  app/page.tsx              Search UI
  components/
    StatusBadge.tsx         Live / Cached / Unavailable indicator
    SourceSection.tsx       Per-retailer results block with internal scrolling
    ProductCard.tsx         Product row with comparable-price highlight
    AIRecommendation.tsx
    SearchBar.tsx           Search input with local suggestions
    ThemeToggle.tsx         Persistent light/dark mode control
  lib/api.ts                Typed API client
```

### Request flow

```
User → GET /api/v1/search?q=...
         ↓ request ID middleware
         ↓ security headers middleware
         ↓ request logging middleware
       aggregator.run_search()
         ├── AmazonScraper.search()   ─┐
         ├── FlipkartScraper.search() ─┤ concurrent, semaphore-bounded
         ├── MeeshoScraper.search()   ─┤
         ├── MyntraScraper.search()   ─┤
         └── search_ebay()            ─┘
                 ↓
         BaseScraper: fetch → parse → validate → cache → fresh/stale/unavailable
                 ↓
         ai_service.generate_recommendation()
                 ↓
         SearchResponse (labeled per source)
```

---

## Frontend experience

The frontend is designed as a focused price-comparison workspace rather than a generic dashboard. The landing view introduces the search flow, while a completed search replaces the landing content with a compact results desk. The logo and **New search** action intentionally return users to the landing experience.

Long marketplace lists stay inside their source cards instead of expanding the entire page. This keeps the comparison grid aligned on desktop and prevents one source with dozens of products from pushing every other source far below the fold. On smaller screens, the internal list height is reduced so the page remains easy to scan and scroll.

| Frontend surface | Behavior |
|---|---|
| Search suggestions | Related shopping queries are filtered locally in the browser; they do not require a new backend endpoint. |
| Results loading | Marketplace-shaped skeleton cards preserve layout while real listings are fetched. |
| Product comparison | Lowest comparable price is marked with a subtle Best badge when all prices use the same currency. |
| Theme control | The header toggle persists light/dark mode in browser storage and respects reduced-motion preferences. |
| Source cards | Each marketplace has independent sorting and an internal scroll area for long result lists. |
| API-key setup | Keys are entered in a compact first-run flow and remain in the browser session only. |

The frontend is intentionally careful about wording: user-facing copy describes the shopping action and result state, while implementation details such as framework names stay in the project documentation and deployment notes.

## Setup

### Requirements

- Python 3.12+
- Node 20+ (for frontend)
- [ScraperAPI key](https://www.scraperapi.com/) — free tier available
- [Google Gemini API key](https://aistudio.google.com/app/apikey) — optional primary AI provider
- [OpenRouter API key](https://openrouter.ai/keys) — optional free-model fallback
- [eBay developer credentials](https://developer.ebay.com/my/keys) — optional

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — fill in SCRAPERAPI_KEY; Gemini/OpenRouter keys are optional

uvicorn main:app --reload
```

API runs at **http://localhost:8000**. Try:
- `GET /api/v1/search?q=wireless+mouse`
- `GET /api/v1/health`
- `GET /api/ping`
- `GET /api/docs` — interactive Swagger UI

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm run dev
```

Frontend runs at **http://localhost:3000**.

### Docker (both services)

```bash
# Fill in your keys first:
cp backend/.env.example backend/.env
# Edit backend/.env

docker compose up --build
```

Both services include health checks and restart policies. The backend cache persists in a named Docker volume (`backend_cache`).

---

## Environment variables

All variables are documented in `backend/.env.example`. Key ones:

| Variable | Required | Default | Description |
|---|---|---|---|
| `SCRAPERAPI_KEY` | ✅ | — | ScraperAPI proxy key |
| `GEMINI_API_KEY` | — | — | Optional Google Gemini API key; the app falls back to live-data summaries when unavailable |
| `EBAY_CLIENT_ID` | — | — | eBay app client ID (enables eBay source) |
| `EBAY_CLIENT_SECRET` | — | — | eBay app client secret |
| `ALLOWED_ORIGINS` | — | `http://localhost:3000` | Comma-separated CORS origins |
| `CACHE_TTL_SECONDS` | — | `1800` | Fresh cache window (30 min) |
| `STALE_SERVE_TTL_SECONDS` | — | `21600` | Stale fallback window (6 hr) |
| `GEMINI_MODEL` | — | `gemini-flash-latest` | Gemini model alias; transient failures retry and fall back to a live-data summary |
| `OPENROUTER_API_KEY` | — | — | Optional OpenRouter key for free-model fallback |
| `OPENROUTER_MODEL` | — | `openrouter/free` | OpenRouter free-model router alias |
| `ENVIRONMENT` | — | `development` | `development` or `production` |
| `LOG_LEVEL` | — | `INFO` | Python log level |

---

## Running tests

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt

# All tests
pytest

# With coverage report
pytest --cov=. --cov-report=term-missing

# Specific test file
pytest tests/test_api.py -v
```

---

## API reference

### `GET /api/v1/search`

Search all configured marketplaces.

**Query params:**
- `q` (string, required, 2–200 chars) — product search query

**Response:** `SearchResponse`
```json
{
  "query": "wireless mouse",
  "request_id": "a1b2c3d4",
  "results": [
    {
      "source": "amazon",
      "status": "fresh",
      "products": [
        {
          "title": "Logitech M235 Wireless Mouse",
          "price": 799.0,
          "currency": "INR",
          "rating": 4.3,
          "review_count": 12450,
          "url": "https://www.amazon.in/dp/...",
          "image_url": "https://...",
          "fetched_at": "2025-01-01T10:00:00"
        }
      ],
      "error": null
    }
  ],
  "ai_recommendation": "Best value: Logitech M235 on Amazon at ₹799 with a 4.3/5 rating...",
  "ai_error": null
}
```

**Source statuses:**
- `fresh` — scraped successfully right now
- `stale` — scrape failed; showing last-known-good cached result
- `unavailable` — scrape failed and no cache exists

### `GET /api/ping`

Cheap liveness check. No external calls. Use for load-balancer health checks.

### `GET /api/v1/health`

Runs a real canary search per source and reports which are working. **Expensive** — do not use as a load-balancer health check. Wire to a scheduled job instead.

### `GET /api/v1/cache/stats`

Returns cache hit/miss rates and disk usage.

### `GET /api/docs`

Interactive Swagger UI.

---

## Keeping scrapers healthy

Site HTML changes over time. This project makes that visible rather than silent:

1. **`GET /api/v1/health`** — runs a real search per source right now and shows which are returning valid products.
2. **CI cron** (add to `.github/workflows/deploy.yml`) — schedule a `curl "$BACKEND_URL/api/v1/health"` every 6 hours and alert if any source is unhealthy. You find out the same day a selector breaks, not weeks later.
3. **Stale cache** — when a scraper fails, it falls back to the last real successful result, labeled `stale`, instead of an empty or broken response.

**When a scraper breaks:** check `/api/v1/health`, open the affected site in a browser, inspect the HTML structure, and update that scraper's `parse()` method. The selectors most likely to change are commented in each scraper file.

---

## Deployment

### Render (backend)

1. Connect your GitHub repo in the Render dashboard.
2. Set service type to **Web Service**, root `/backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all env vars from `.env.example` in the Render dashboard.
6. Add `RENDER_DEPLOY_HOOK` and `BACKEND_URL` as GitHub secrets for CI.

### Vercel (frontend)

1. Import the repo in Vercel, root `/frontend`.
2. Set `NEXT_PUBLIC_API_BASE_URL` to your Render backend URL.
3. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as GitHub secrets.

CI deploys automatically on push to `main` — lint → test → deploy backend → wait for health → deploy frontend.

### Manual deploy

```bash
export RENDER_DEPLOY_HOOK=...
export VERCEL_TOKEN=...
export VERCEL_ORG_ID=...
export VERCEL_PROJECT_ID=...
export BACKEND_URL=https://your-backend.onrender.com

bash deploy.sh
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| All sources return `unavailable` | `SCRAPERAPI_KEY` missing or invalid | Check `.env`, verify key at scraperapi.com dashboard |
| `AI analysis temporarily unavailable` | Gemini quota/capacity issue | The app retries, then shows a live-data summary; optionally add an OpenRouter key |
| One source always `unavailable` | Site layout changed, selectors broken | Check `/api/v1/health`, update `parse()` in that scraper |
| `stale` results across all sources | Network issue or ScraperAPI quota exhausted | Check ScraperAPI dashboard for credit usage |
| `0 valid products` warning in logs | Parse succeeded but all products failed Pydantic validation | Run the scraper's `parse()` manually against a saved page, check field mapping |
| Frontend shows wrong prices | Old stale cache | Wait for `STALE_SERVE_TTL_SECONDS` to expire, or clear with `POST /api/v1/cache/clear` (add if needed) |

---

## Contributing

1. Fork and create a feature branch.
2. Install dev dependencies: `pip install -r requirements.txt -r requirements-dev.txt`
3. Make changes. Add or update tests.
4. Run `ruff check . && ruff format . && pytest` before pushing.
5. Open a PR against `main` — CI runs lint, format, and tests automatically.

### Adding a new marketplace scraper

1. Create `backend/scrapers/yoursite.py` extending `BaseScraper`.
2. Implement `build_search_url(query)` and `parse(html) → list[dict]`.
3. Add the new source to `models.py` `Source` enum.
4. Register it in `services/aggregator.py` `_SCRAPERS` list.
5. Add a canary query to `services/health_monitor.py` `_CANARY_QUERIES`.
6. Add parser tests to `tests/test_scrapers.py`.

---

## What this deliberately does not do

- **No mock/sample data** — all results are real scrapes or real API calls.
- **No Amazon PA-API** — requires an approved affiliate account with sales history. A future upgrade path if you get approved.
- **No attempt to circumvent anti-bot measures** beyond what ScraperAPI provides — respect each site's Terms of Service.
- **No user accounts or saved searches** — this is a stateless search tool.
