#!/usr/bin/env bash
# deploy.sh — manual one-shot deploy script (CI/CD preferred for normal deploys)
set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Pre-flight checks ──────────────────────────────────────────────────────────
info "Running pre-deployment validation..."

MISSING=()
[ -z "${RENDER_DEPLOY_HOOK:-}" ] && MISSING+=("RENDER_DEPLOY_HOOK")
[ -z "${VERCEL_TOKEN:-}" ]       && MISSING+=("VERCEL_TOKEN")
[ -z "${VERCEL_ORG_ID:-}" ]      && MISSING+=("VERCEL_ORG_ID")
[ -z "${VERCEL_PROJECT_ID:-}" ]  && MISSING+=("VERCEL_PROJECT_ID")

if [ ${#MISSING[@]} -gt 0 ]; then
    error "Missing required environment variables:"
    for v in "${MISSING[@]}"; do
        error "  - $v"
    done
    exit 1
fi

# Check that .env exists
if [ ! -f backend/.env ]; then
    error "backend/.env not found — copy backend/.env.example and fill in your keys."
    exit 1
fi

# ── Deploy backend ─────────────────────────────────────────────────────────────
info "Triggering backend deploy on Render..."
curl -fsS -X POST "$RENDER_DEPLOY_HOOK" || { error "Render deploy hook failed"; exit 1; }
info "Backend deploy triggered successfully"

# ── Wait for backend health ────────────────────────────────────────────────────
if [ -n "${BACKEND_URL:-}" ]; then
    info "Waiting for backend at ${BACKEND_URL}/api/ping ..."
    for i in $(seq 1 20); do
        STATUS=$(curl -fsS -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/ping" || echo "000")
        if [ "$STATUS" = "200" ]; then
            info "Backend healthy (attempt $i)"
            break
        fi
        warn "Attempt $i — got $STATUS, retrying in 15s..."
        sleep 15
        if [ "$i" = "20" ]; then
            error "Backend did not become healthy in time — check Render dashboard."
            exit 1
        fi
    done
else
    warn "BACKEND_URL not set — skipping health check (check Render dashboard manually)"
    sleep 30
fi

# ── Deploy frontend ────────────────────────────────────────────────────────────
info "Deploying frontend to Vercel..."
cd frontend
npm ci --silent
npx vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
npx vercel build --prod --token="$VERCEL_TOKEN"
FRONTEND_URL=$(npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN")
cd ..

info "Deployment complete!"
info "Backend:  ${BACKEND_URL:-Check Render dashboard}"
info "Frontend: ${FRONTEND_URL}"
