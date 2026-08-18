# Deployment Guide

This guide covers every deployment path: local dev, Docker, and production (Render + Vercel). Follow the steps in order — each section builds on the previous.

---

## Prerequisites

Before anything else, get your API keys. You'll need them for every deployment path.

| Key | Where to get it | Free tier? |
|---|---|---|
| `SCRAPERAPI_KEY` | [scraperapi.com](https://www.scraperapi.com/) | Yes — 1,000 credits/month |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | No |
| `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` | [developer.ebay.com/my/keys](https://developer.ebay.com/my/keys) | Yes — optional |

eBay is optional. The app works without it and will simply skip that source.

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

# 4. Configure environment
cp .env.example .env
```

Open `backend/.env` and fill in at minimum:
```
SCRAPERAPI_KEY=your_key_here
GEMINI_API_KEY=your_key_here
OPENROUTER_API_KEY=your_optional_openrouter_key
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
# → Full JSON response with products from all sources
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

The backend cache persists in a Docker named volume (`backend_cache`) so scrape results survive container restarts.

To tear everything down:
```bash
docker compose down
docker compose down -v   # also wipe the cache volume
```

---

## 3. Environment Variables Reference

Full list with descriptions. Set these in Render's dashboard (never commit real values).

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SCRAPERAPI_KEY` | ✅ | — | Without this, all scraping fails |
| `GEMINI_API_KEY` | — | — | Optional; without it the app shows a live-data summary |
| `EBAY_CLIENT_ID` | — | — | Leave blank to disable eBay source |
| `EBAY_CLIENT_SECRET` | — | — | Leave blank to disable eBay source |
| `ALLOWED_ORIGINS` | ✅ in prod | `http://localhost:3000` | Your Vercel URL — prevents cross-origin abuse |
| `ENVIRONMENT` | — | `development` | Set to `production` on Render |
| `LOG_LEVEL` | — | `INFO` | `DEBUG` for more detail, `WARNING` for quieter logs |
| `CACHE_TTL_SECONDS` | — | `1800` | How long a fresh scrape stays fresh (30 min) |
| `CACHE_DIR` | — | `.cache` | Disk cache directory used when Redis is not configured |
| `STALE_SERVE_TTL_SECONDS` | — | `21600` | How long to serve stale as fallback (6 hr) |
| `CACHE_MAX_SIZE_BYTES` | — | `524288000` | 500 MB disk cap |
| `REQUEST_TIMEOUT_SECONDS` | — | `15` | ScraperAPI per-request timeout |
| `MAX_RETRIES` | — | `2` | Retry attempts per request |
| `CONCURRENT_SCRAPE_LIMIT` | — | `4` | Max parallel scrapers (keep ≤ 4 on free tier) |
| `GEMINI_MODEL` | — | `gemini-flash-latest` | Transient failures retry; the app falls back to a live-data summary |
| `OPENROUTER_API_KEY` | — | — | Optional free-model fallback key |
| `OPENROUTER_MODEL` | — | `openrouter/free` | OpenRouter free-model router alias |
| `REDIS_URL` | — | — | Optional Redis URL; use this when instances do not share a persistent disk |
| `AI_MAX_PRODUCTS_PER_SOURCE` | — | `10` | Products sent to AI per source |
| `AI_REQUEST_TIMEOUT_SECONDS` | — | `30` | Gemini request timeout |

---

## 4. Post-Deployment Checklist

Run through this after every production deploy:

- [ ] `GET /api/ping` returns `{"status":"ok"}`
- [ ] `GET /api/v1/health` — at least 2 sources show `healthy: true`
- [ ] Search for "wireless mouse" — results appear with prices
- [ ] AI recommendation appears; if Gemini is busy, confirm the labeled live-data summary appears instead of an empty card
- [ ] If configured, OpenRouter fallback validation reports `Working`
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
  { "source": "ebay",     "healthy": true,  "products_found": 10 }
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
curl https://YOUR-SERVICE.onrender.com/api/v1/cache/stats
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
| All sources `unavailable` | `SCRAPERAPI_KEY` missing or invalid | Check Render env vars. Verify key at scraperapi.com |
| AI `temporarily unavailable` | `GEMINI_API_KEY` wrong or quota hit | Check Render env vars. Check [Gemini quota](https://ai.google.dev/pricing) |
| One source always `unavailable` | That site's HTML changed | Run `/api/v1/health`, update that scraper's `parse()` |
| Frontend CORS error in browser | `ALLOWED_ORIGINS` not set to your Vercel URL | Update Render env var → redeploy |
| Render deploy fails at build | Wrong Python version | Ensure `runtime.txt` says `3.12.3` |
| `0 valid products` in logs | Parse succeeded but all items fail Pydantic validation | Run `parse()` against a saved HTML page. Check field names match the model |
| Stale results everywhere | ScraperAPI credits exhausted | Check [ScraperAPI dashboard](https://dashboard.scraperapi.com/) |
| Slow first response | Render free tier spins down after inactivity | Upgrade to a paid Render instance, or add a UptimeRobot ping every 14 min |
| CI not running | GitHub Actions disabled | Repo → Settings → Actions → Allow all actions |
| `uvicorn: command not found` on Render | Build step failed silently | Check Render build logs — likely a package install error |

---

## 7. Scaling Notes

The current setup comfortably handles **~100–500 searches/day** on Render's free/starter tier.

If you need more:
- **Increase `CONCURRENT_SCRAPE_LIMIT`** (up to 8 without issue on paid Render)
- **Upgrade Render instance** — the cache and semaphore approach means a single worker handles load well
- **Add Redis** for a distributed cache if you run multiple workers or instances
- **Add a CDN** in front of the backend for static responses (not currently applicable — all responses are dynamic)
