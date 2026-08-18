# AI Shopping Agent — Live Marketplace Price Comparison

> Search once. Compare four marketplaces. Choose with confidence.

![Next.js](https://img.shields.io/badge/Next.js-171a16?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-35530a?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-718239?style=for-the-badge&logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on_Vercel-171a16?style=for-the-badge&logo=vercel&logoColor=white)

**[🚀 Live Demo](https://ai-shopping-agent-theta.vercel.app)** · **[GitHub Repository](https://github.com/sugumaran-nix/ai-shopping-agent)**

<!--
---

Replace the line below with a recorded product-search GIF when available.

![AI Shopping Agent Demo](./docs/demo.gif)

> 📸 **Demo GIF coming soon** — record a short search from query to ranked shortlist and place it at `docs/demo.gif`.

-->

---

## ✨ Features

- **Four live marketplaces** — Compare Amazon, Flipkart, Meesho, and Myntra in one focused results workspace.
- **Top 10 ranked shortlist** — Overall best ranking uses relevance, rating, review confidence, and price context rather than simply choosing the cheapest product.
- **Per-marketplace filters** — Sort each source by best match, low price, high price, or top rating without losing comparison context.
- **Transparent weighted recommendations** — Every available product receives a visible score from normalized price (40%), rating (40%), and review count (20%), with the top three returned in a deterministic summary.
- **No fabricated listings** — Products come from live scrapes or cached real results and are labeled `fresh`, `stale`, or `unavailable`.
- **Resilient scraping** — ScraperAPI keys can be supplied by the user, scraper failures retry safely, and stale cache data is shown instead of a blank result.
- **Myntra relevance filtering** — Query-aware parsing and identity matching prevent unrelated products from appearing in the results.
- **Stampede-safe caching** — Fresh-cache short-circuits, single-flight locking, disk-backed persistence, and optional Redis reduce repeated upstream requests.
- **Session-only API access** — User-provided keys stay in the browser session, are forwarded through request headers, and are cleared when the tab session ends.
- **Editorial responsive UI** — Dark/light mode, local search suggestions, responsive cards, inline marketplace scrolling, smooth loading states, and a compact sticky results search bar.
- **Resilient product images** — Lazy-loaded and relative image URLs are normalized, placeholders are rejected, and failed remote images receive a clean fallback tile.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 14 App Router |
| Frontend language | TypeScript |
| Styling | Tailwind CSS and custom editorial UI styles |
| Backend framework | FastAPI |
| Scraping and HTTP | httpx, ScraperAPI, BeautifulSoup, lxml |
| Recommendation engine | Deterministic weighted scorer using normalized price, rating, and review count |
| Validation | Pydantic and pydantic-settings |
| Cache | Diskcache by default, optional Redis for shared persistence |
| Deployment | Vercel frontend, Render backend, Docker-compatible services |

---

## 📁 Project Structure

```
ai-shopping-agent/
├── backend/
│   ├── main.py                 # FastAPI routes, headers, health and key validation
│   ├── config.py               # Validated environment settings
│   ├── models.py               # Product and response schemas
│   ├── cache.py                # Disk-backed cache with optional Redis backend
│   ├── scrapers/
│   │   ├── base.py             # Shared fetch, parse, validate, cache and fallback flow
│   │   ├── amazon.py           # Amazon search parser
│   │   ├── flipkart.py         # Flipkart search parser
│   │   ├── meesho.py           # Meesho search parser
│   │   └── myntra.py           # Myntra API/HTML parser and relevance filtering
│   ├── services/
│   │   ├── aggregator.py       # Concurrent four-marketplace orchestration
│   │   ├── ai_service.py       # Deterministic weighted top-three scorer
│   │   └── health_monitor.py   # Per-marketplace canary checks
│   ├── utils/
│   │   ├── headers.py          # Request headers, parsing and image URL helpers
│   │   └── http_client.py      # ScraperAPI request wrapper and retry logic
│   └── tests/                  # API, cache, model and scraper regression tests
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Landing page, search flow and results workspace
│   │   ├── layout.tsx          # Metadata, navbar and theme setup
│   │   └── globals.css         # Theme, responsive layout and motion rules
│   ├── components/
│   │   ├── ApiKeySetup.tsx     # Session-only API key setup
│   │   ├── SearchBar.tsx        # Search input and local suggestions
│   │   ├── TopPicksCard.tsx     # Ranked shortlist and ranking filters
│   │   ├── SourceSection.tsx    # Marketplace card and inline filters
│   │   ├── ProductCard.tsx      # Product tile and image fallback
│   │   └── ThemeToggle.tsx      # Light/dark mode control
│   ├── lib/
│   │   ├── api.ts              # Typed backend client and error handling
│   │   └── keys.ts             # Browser session key management
│   ├── package.json
│   └── vercel.json
├── render.yaml                 # Render backend service definition
├── docker-compose.yml          # Local multi-service development
├── deploy.sh                   # CI/deployment helper
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- pnpm
- A ScraperAPI key for live marketplace scraping

The application also supports user-provided keys through the setup screen. Those keys are stored only in the current browser session and are never written to the backend cache.

### 1. Clone the repository

```bash
git clone https://github.com/sugumaran-nix/ai-shopping-agent.git
cd ai-shopping-agent
```

### 2. Configure and run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` with server-side defaults if desired. User-entered keys from the frontend can be used instead.

```env
SCRAPERAPI_KEY=
ALLOWED_ORIGINS=http://localhost:3000
CACHE_TTL_SECONDS=1800
STALE_SERVE_TTL_SECONDS=21600
REDIS_URL=
ENVIRONMENT=development
LOG_LEVEL=INFO
```

Start FastAPI:

```bash
uvicorn main:app --reload --port 8000
```

The backend exposes a cheap liveness check at [http://localhost:8000/api/ping](http://localhost:8000/api/ping), interactive API documentation at [http://localhost:8000/docs](http://localhost:8000/docs), and the search route at `/api/v1/search?q=...`.

### 3. Configure and run the frontend

Open a second terminal:

```bash
cd frontend
pnpm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Start Next.js:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), enter your API keys in the setup screen, and search for a product.

---

## 🔄 How a Search Works

```
User enters a query
        ↓
Frontend sends session-only API keys as request headers
        ↓
FastAPI aggregator runs Amazon, Flipkart, Meesho and Myntra concurrently
        ↓
Each scraper fetches → parses → validates → caches → labels its result
        ↓
Top 10 frontend shortlist combines relevance, rating, review confidence and price context
        ↓
Deterministic backend scorer returns the top three with price, rating, and review subscores
        ↓
Frontend shows the ranked shortlist and source-specific product cards
```

Every result is labeled according to its source state:

| Status | Meaning |
|---|---|
| `fresh` | The source returned valid products during the current search. |
| `stale` | Live fetching failed, so the most recent real cached result is shown. |
| `unavailable` | No valid live or cached products are available for that source. |

---

## 🔐 API-Key Privacy Model

The setup screen accepts one ScraperAPI key. The frontend keeps it in `sessionStorage` and forwards it to the backend only through the `X-ScraperAPI-Key` request header. The backend does not store the key in the scrape cache.

Refreshing the page or returning home keeps the keys available in the same browser tab session. Closing the tab clears the session, after which the setup screen appears again. This provides a practical balance between convenience and session-only access.

---

## 🧠 Recommendation and Ranking

The ranked shortlist is intentionally not a lowest-price list. The frontend ranks the Top 10 using relevance, rating, review confidence, and price context, while the backend returns a deterministic top-three recommendation. Its weighted score is calculated across all available products as **40% normalized price**, **40% rating out of 5**, and **20% normalized review count**. The recommendation includes each product’s total score and component scores so users can see exactly why it ranked.

Because the scorer is local and data-driven, recommendation generation adds no external API call, provider timeout, rate limit, or cloud-AI dependency. If no products are available, the API returns a clear data-unavailable message instead of inventing a recommendation.

---

## 🌐 Deployment

### Render backend

1. Connect the repository in the [Render dashboard](https://render.com/).
2. Create a Web Service with root directory `/backend`.
3. Use `pip install -r requirements.txt` as the build command.
4. Use `uvicorn main:app --host 0.0.0.0 --port $PORT` as the start command.
5. Add the backend variables from the configuration example above.
6. Configure CORS with the deployed Vercel frontend URL.

### Vercel frontend

1. Import the repository in [Vercel](https://vercel.com/).
2. Set the project root to `/frontend`.
3. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed Render backend URL.
4. Use pnpm with the committed `pnpm-lock.yaml`.
5. Deploy from the `main` branch.

The configured public frontend is [ai-shopping-agent-theta.vercel.app](https://ai-shopping-agent-theta.vercel.app).

---

## ✅ Verification

### Backend tests

```bash
cd backend
pytest -q
```

The suite covers API behavior, deterministic recommendation scoring, cache semantics, single-flight concurrency, model validation, image URL normalization, scraper parsing, and Myntra relevance filtering.

### Frontend checks

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
```

The frontend verification covers ESLint, TypeScript validity through the production build, responsive results layout, session persistence, image fallback behavior, and sticky search interaction.

---

## 🏷 GitHub About Settings

Use these values in **GitHub → Settings → General → About**:

| Field | Recommended value |
|---|---|
| **Short description** | Compare live prices across Amazon, Flipkart, Meesho, and Myntra with transparent weighted buying recommendations. |
| **Website** | `https://ai-shopping-agent-theta.vercel.app` |
| **Topics** | `ai-shopping`, `price-comparison`, `shopping-agent`, `product-recommendations`, `ecommerce`, `fastapi`, `nextjs`, `react`, `typescript`, `python`, `scraperapi`, `amazon`, `flipkart`, `meesho`, `myntra` |
| **Social preview headline** | Shop less. Choose better. |
| **Social preview description** | Compare fresh marketplace listings and get grounded buying guidance without sponsored rankings. |

Do not list eBay in the About text or topics until it is connected to the active aggregator and frontend.

---

## 📄 License

No license file is currently included in the repository. Add an explicit license before redistributing the project publicly.

---

## ⚠️ Data and Marketplace Disclaimer

Marketplace prices, availability, delivery estimates, and product pages can change quickly. Always verify the final details on the retailer’s website before purchasing. The project is a comparison and recommendation tool, not a seller or payment processor.
