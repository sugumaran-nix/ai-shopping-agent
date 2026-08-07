# Shopiq v3 — AI Price Comparison India

Compare prices across **Amazon, Flipkart, AJIO, Snapdeal, Croma**.

## Zero paid APIs. Zero proxies. Zero cost. Forever free.

| Source   | Method                  | Reliability     | Notes                              |
|----------|-------------------------|-----------------|------------------------------------|
| AJIO     | Internal JSON API       | ✅ ~95%         | Best source — structured JSON      |
| Snapdeal | curl_cffi + HTML        | ✅ ~90%         | Server-rendered, no bot protection |
| Croma    | curl_cffi + JSON island | ✅ ~85%         | Server-rendered, electronics focus |
| Amazon   | curl_cffi TLS spoof     | ⚠️ ~65%        | Best-effort, stale cache on block  |
| Flipkart | curl_cffi TLS spoof     | ⚠️ ~60%        | Best-effort, stale cache on block  |

Amazon/Flipkart use `curl_cffi` Chrome TLS impersonation — free, unlimited,
no proxy. When blocked, the last real result is served labeled "Cached" so
users always see something real, never an invented value.

---

## Deploy

### Backend → Render (free tier)

1. Render → New Web Service → connect your GitHub repo
2. **Root Directory:** `backend`
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Region:** Singapore (closest to India)
6. **No env vars required** — deploy as-is
7. Copy your service URL e.g. `https://shopiq-backend.onrender.com`
8. Test: visit `https://shopiq-backend.onrender.com/api/ping` → `{"status":"ok"}`

### Frontend → Vercel

1. Vercel → New Project → import your GitHub repo
2. **Root Directory:** `frontend`
3. **Add one env var:**
   - `NEXT_PUBLIC_API_BASE_URL` = your Render URL (no trailing slash)
4. Deploy

---

## Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000

# Frontend
cd frontend
npm install
# Create frontend/.env.local:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
# → http://localhost:3000
```

---

## How it works

- **No ScraperAPI** — `curl_cffi` impersonates Chrome's TLS fingerprint (JA3/JA4)
- **No Gemini/OpenAI** — local rule-based recommendation engine (cheapest, best discount, best rated)
- **Two-tier cache** — 30-min fresh window, 6-hour stale fallback. Stale results are clearly labeled.
- **Validation** — every scraped item passes strict Pydantic checks. Anything invalid is dropped silently.
