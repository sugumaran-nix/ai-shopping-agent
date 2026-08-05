# AI Shopping Agent — v2

A rebuilt version of the original AI Shopping Agent: compares product prices
across **Amazon, Flipkart, Meesho, Myntra**, and the **official eBay Browse
API**, then uses **Google Gemini** to generate a buying recommendation
grounded strictly in that data.

**No dummy, sample, or fabricated data exists anywhere in this codebase.**
Every product shown comes from a real scrape or a real API call, and every
result is explicitly labeled so you always know whether you're looking at
current data, cached data, or nothing at all.

## What changed from v1, and why

The original had no validation, no caching, and no visibility into failures —
so a broken scraper looked identical to "no results," and a bad parse looked
identical to a real product. This version fixes each of those directly:

| Problem you described | Root cause | Fix in this version |
|---|---|---|
| False info | Scraped values (price/title) went straight to the UI and into the AI prompt with no validation | `models.py` — every scraped item is validated against a strict Pydantic schema (price > 0, real-looking title, valid URL). Anything that fails is **dropped**, never guessed at or patched. |
| Buggy / not working | No shared retry or error handling — one flaky request broke the whole call | `utils/http_client.py` — centralized retry with exponential backoff via `tenacity`, and a specific `FetchError` instead of a raw exception bubbling up. |
| Outdated / limitations | No caching → every request re-scraped live, slow, and expensive on ScraperAPI credits, with no fallback when a site changed layout | `cache.py` — a real, persistent (disk-backed) cache of *actual* past results. A live scrape failure now falls back to the last real successful result — labeled **STALE** — instead of a broken page. |
| "Site X returns nothing" going unnoticed for weeks | No monitoring | `services/health_monitor.py` + `/api/health` — runs a real canary search per source on demand; wire it into a scheduled job (see `render.yaml`) so scraper drift shows up in an alert, not a user complaint. |
| Everything hinges on scraping 4 sites with shifting HTML | Amazon/Flipkart/Meesho/Myntra don't offer public consumer search APIs | `services/ebay_service.py` — one genuine, official, OAuth-authenticated API source (eBay Browse API) that can't break from a CSS change. It's optional and additive, not a replacement for the four you need. |
| AI recommendations feel unreliable | Gemini was fed whatever scraped text existed, with no signal about its reliability | `services/ai_service.py` — the prompt explicitly tells Gemini which sources are fresh vs. stale vs. unavailable, and instructs it to say so plainly rather than recommend confidently off thin/stale data. |

## Architecture

```
backend/
  main.py                 FastAPI app: /api/search, /api/health, /api/ping
  config.py                Centralized, validated settings (pydantic-settings)
  models.py                 Product schema + validation rules
  cache.py                   Disk-backed fresh/stale cache (diskcache)
  utils/http_client.py        ScraperAPI wrapper with retry/backoff
  scrapers/
    base.py                    Shared scrape → validate → cache → fallback flow
    amazon.py / flipkart.py / meesho.py / myntra.py
  services/
    ebay_service.py             Official eBay Browse API client
    ai_service.py                 Gemini recommendation, grounded in labeled data
    aggregator.py                  Runs all sources concurrently (bounded)
    health_monitor.py               Canary health checks per source

frontend/                 Next.js 15 + TypeScript + Tailwind (same visual
                           language as the original — glassmorphism, cosmic
                           gradient — extended with a freshness/trust badge
                           system as the one new signature element)
  app/page.tsx              Search UI
  components/
    StatusBadge.tsx           Live / Cached / Unavailable indicator
    SourceSection.tsx           Per-retailer results block
    ProductCard.tsx
    AIRecommendation.tsx
    SearchBar.tsx
  lib/api.ts                 Typed API client
```

## Setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in SCRAPERAPI_KEY and GEMINI_API_KEY at minimum.
# The variable name in .env MUST be SCRAPERAPI_KEY (matching config.py).
# EBAY_CLIENT_ID / EBAY_CLIENT_SECRET are optional (enables the eBay source).
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. Try `GET /api/search?q=wireless+mouse`.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend runs at `http://localhost:3000`.

### Docker (both at once)

```bash
cp backend/.env.example backend/.env   # fill in your keys first
docker compose up --build
```

## Getting API keys

- **ScraperAPI** (required): https://www.scraperapi.com/ — free tier available.
- **Google Gemini** (required): https://makersuite.google.com/app/apikey
- **eBay Browse API** (optional): https://developer.ebay.com/my/keys — free
  developer account, official OAuth credentials.

## Keeping the scrapers healthy

Site HTML changes over time — that's true of any scraper, for any team.
This version doesn't pretend that problem is solved forever; it makes it
*visible* instead of silent:

1. `GET /api/health` runs one real search per source right now and tells you
   which are actually returning valid products.
2. `render.yaml` includes a scheduled cron job hitting that endpoint every 6
   hours — point it at a Slack/email webhook so you find out the same day a
   selector breaks, not weeks later from a confused user.
3. Each scraper file has comments marking exactly which selectors are the
   most likely to need updating, and why (see `scrapers/meesho.py` and
   `scrapers/myntra.py` for the JSON-first parsing strategy, which is more
   durable than pure CSS-class scraping).

When a selector does break: check `/api/health`, open the affected site in a
browser, and update that scraper's `parse()` method. Nothing else in the
system needs to change — validation, caching, and fallback all keep working
around it automatically.

## What this version deliberately does *not* do

- It does not use Amazon's PA-API (requires an approved affiliate account
  with sales history) — a possible future upgrade path if you go that route.
- It does not include any mock/sample/seeded data, per your requirement —
  `MOCK_MODE` style toggles some teams use for offline dev were intentionally
  left out.
- It does not attempt to work around anti-bot measures beyond what
  ScraperAPI provides — respect each site's terms of service.
