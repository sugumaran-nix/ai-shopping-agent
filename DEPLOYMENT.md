# Deployment Guide

This guide covers every deployment path: local dev, Docker, and production (Render + Vercel). Follow the steps in order — each section builds on the previous.

---

## Prerequisites

Before anything else, create a ScraperAPI key. That is the simplest setup. ScrapingAnt and Bright Data Web Unlocker are optional backups; recommendation scoring runs locally without any AI-provider key.

| Key | Where to get it | Free tier? |
|---|---|---|
| `SCRAPERAPI_KEY` | [ScraperAPI](https://www.scraperapi.com/) | Default provider |
| `SCRAPINGANT_API_KEY` | [ScrapingAnt](https://scrapingant.com/) | Optional backup — 10,000 credits/month |
| `BRIGHTDATA_API_KEY` | [Bright Data Web Unlocker](https://brightdata.com/cp/web_access) | Optional backup — 5,000 credits/month |
| `BRIGHTDATA_ZONE` | Bright Data zone name | Required with Bright Data key |


---

## 1. Local Development

### Backend

```bash
# 1. Clone and enter the project
git clone https://github.com/YOUR_USERNAME/ai-shopping-agent.git
cd ai-shopping-agent

# 2. Create a virtual environment
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
# Install a local Chromium binary for browser fallbacks
python -m playwright install chromium

# 4. Configure environment
cp .env.example .env
```

Open `backend/.env` and fill in at minimum. The repository root contains a safe `.env.example`; copy it locally and never commit the populated file.

```
SCRAPERAPI_KEY=your_scraperapi_key
SCRAPINGANT_API_KEY=your_scrapingant_key
BRIGHTDATA_API_KEY=your_brightdata_key
BRIGHTDATA_ZONE=web_unlocker1
```

```bash
# 5. Run the backend
uvicorn main:app --reload --port 8000
```

Verify it's working:
```bash
curl http://localhost:8000/api/ping
# → {"status":"ok","version":"2.1.0"}

curl "http://localhost:8000/api/v1/search?q=wireless+mouse"
# → Full JSON response with products from all five sources
```

Interactive API docs: http://localhost:8000/api/docs

### Frontend

Open a second terminal:

```bash
cd frontend
pnpm install --frozen-lockfile
cp .env.local.example .env.local
# .env.local already points to http://localhost:8000 — no changes needed for local dev

pnpm run dev
```

Open http://localhost:3000 — you should see the search UI.

---

## 2. Docker (both services together)

```bash
# From the repo root
cp backend/.env.example backend/.env
# Edit backend/.env — add your API keys

docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

The backend cache persists in a Docker named volume (`backend_cache`) so scrape results survive container restarts. The backend image also installs Chromium once; Meesho, Myntra, and JioMart reuse one headless browser process only after their direct HTTP attempts fail.

To tear everything down:
```bash
docker compose down
docker compose down -v   # also wipe the cache volume
```

---

## 3. Environment Variables Reference

Full list with descriptions. Set these in Render's dashboard (never commit real values). The Render blueprint uses `backend/Dockerfile`, which installs Chromium and runs the shared Playwright fallback as a single worker process.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SCRAPERAPI_KEY` | Optional | — | Tried first in provider fallback |
| `SCRAPINGANT_API_KEY` | Optional | — | Tried second in provider fallback |
| `BRIGHTDATA_API_KEY` | Optional | — | Tried third in provider fallback |
| `BRIGHTDATA_ZONE` | With Bright Data | `web_unlocker1` | Web Unlocker zone name |
| `ALLOWED_ORIGINS` | ✅ in prod | `http://localhost:3000` | Exact HTTPS Vercel origin(s); wildcard and localhost are rejected in production |
| `OPS_TOKEN` | ✅ in prod for ops routes | — | Long random token for health, cache stats, and cache-clear endpoints |
| `RATE_LIMIT_WINDOW_SECONDS` | — | `60` | Fixed-window public API limit duration |
| `RATE_LIMIT_MAX_REQUESTS` | — | `60` | Requests per client and route within the window |
| `ENVIRONMENT` | — | `development` | Set to `production` on Render |
| `LOG_LEVEL` | — | `INFO` | `DEBUG` for more detail, `WARNING` for quieter logs |
| `CACHE_TTL_SECONDS` | — | `1800` | How long a fresh scrape stays fresh (30 min) |
| `CACHE_DIR` | — | `.cache` | Disk cache directory used when Redis is not configured |
| `STALE_SERVE_TTL_SECONDS` | — | `21600` | How long to serve stale as fallback (6 hr) |
| `CACHE_MAX_SIZE_BYTES` | — | `524288000` | 500 MB disk cap |
| `REQUEST_TIMEOUT_SECONDS` | — | `15` | Per-provider request timeout |
| `MAX_RETRIES` | — | `2` | Retry attempts per request |
| `CONCURRENT_SCRAPE_LIMIT` | — | `4` | Max parallel scrapers (keep ≤ 4 on free tier) |
| `REDIS_URL` | — | — | Optional Redis URL; use this when instances do not share a persistent disk |

---

## 4. Post-Deployment Checklist

Run through this after every production deploy:

- [ ] `GET /api/ping` returns `{"status":"ok"}`
- [ ] `GET /api/v1/health` with the `X-Ops-Token` header — at least 2 sources show `healthy: true`
- [ ] Search for "wireless mouse" — results appear with prices
- [ ] Deterministic top-three ranking appears with price, rating, review, and total scores
- [ ] The ranking card states the 40% price, 40% rating, and 20% review weighting
- [ ] Results include a mix of `fresh` and possibly `stale` statuses
- [ ] Frontend loads at your Vercel URL
- [ ] Frontend CORS error does **not** appear in browser console
- [ ] `GET /api/v1/cache/stats` shows `entry_count` > 0 after a few searches
- [ ] In multi-instance deployments, `REDIS_URL` is configured and `/api/v1/cache/stats` reports `backend: redis`

---

## 5. Monitoring & Keeping Scrapers Healthy

### Scraper health check

Site layouts change. Add a cron job to catch breakage the same day it happens:

**On Render (free cron):**
1. Render dashboard → **New Cron Job**
2. Command: `curl -fsS $BACKEND_URL/api/v1/health`
3. Schedule: `0 */6 * * *` (every 6 hours)

Or use [UptimeRobot](https://uptimerobot.com) (free) to:
- Monitor `/api/ping` every 5 minutes (liveness)
- Alert you by email/Slack on downtime

### Reading health output

```json
[
  { "source": "amazon",   "healthy": true,  "products_found": 8 },
  { "source": "flipkart", "healthy": true,  "products_found": 6 },
  { "source": "meesho",   "healthy": false, "products_found": 0, "error": "parsed 0 valid products" },
  { "source": "myntra",   "healthy": true,  "products_found": 5 },
  { "source": "jiomart",  "healthy": true,  "products_found": 4 }
]
```

If a scraper returns `healthy: false` with `"parsed 0 valid products"`:
1. Visit that site in your browser and search for the canary query
2. Inspect the HTML — look for what changed in the product card structure
3. Update the `parse()` method in `backend/scrapers/<site>.py`
4. Test locally: `pytest tests/test_scrapers.py -v`
5. Push — CI runs tests then deploys

### Cache stats

```bash
curl -H "X-Ops-Token: $OPS_TOKEN" https://YOUR-SERVICE.onrender.com/api/v1/cache/stats
```
```json
{
  "hits_fresh": 142,
  "hits_stale": 8,
  "misses": 23,
  "sets": 23,
  "total_requests": 173,
  "hit_rate_pct": 86.7,
  "disk_size_bytes": 2483621,
  "entry_count": 23
}
```

A healthy deployment should have `hit_rate_pct > 70%` after a few hours of traffic.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| All sources `unavailable` | Provider keys missing or invalid | Check Render env vars and verify at least one provider credential |
| Operations endpoint returns `404` | Missing or invalid `X-Ops-Token` in production | Send the exact Render `OPS_TOKEN` in the request header |
| Recommendation summary unavailable | No valid products returned from any source | Check `/api/v1/health`, provider credentials, and source availability |
| One source always `unavailable` | That site's HTML changed | Run `/api/v1/health`, update that scraper's `parse()` |
| Frontend CORS error in browser | `ALLOWED_ORIGINS` not set to your Vercel URL | Update Render env var → redeploy |
| Render deploy fails at build | Docker or Chromium installation failed | Inspect the Render image-build logs; confirm `backend/Dockerfile` and the Playwright dependencies are present |
| `0 valid products` in logs | Parse succeeded but all items fail Pydantic validation | Run `parse()` against a saved HTML page. Check field names match the model |
| Stale results everywhere | Provider credits exhausted or sources blocked | Check all three provider dashboards; stale cache is intentional |
| Slow first response | Render free tier spins down after inactivity | Upgrade to a paid Render instance, or add a UptimeRobot ping every 14 min |
| CI not running | GitHub Actions disabled | Repo → Settings → Actions → Allow all actions |
| Browser fallback unavailable | Chromium is missing or the shared browser could not start | Check Docker build logs for `playwright install --with-deps chromium`; set `PLAYWRIGHT_EXECUTABLE_PATH` only when using a custom browser binary |

---

## 7. Scaling Notes

The current setup comfortably handles **~100–500 searches/day** on Render's free/starter tier.

If you need more:
- **Increase `CONCURRENT_SCRAPE_LIMIT`** (up to 8 without issue on paid Render)
- **Upgrade Render instance** — the cache and semaphore approach means a single worker handles load well
- **Add Redis** for a distributed cache if you run multiple workers or instances
- **Add a CDN** in front of the backend for static responses (not currently applicable — all responses are dynamic)
