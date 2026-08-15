'use client'
import { useState, useCallback, useEffect } from 'react'
import { Zap, Bot, SlidersHorizontal, RefreshCw, AlertTriangle, WifiOff, Settings, X } from 'lucide-react'
import { SearchBar } from '@/components/SearchBar'
import { SourceSection } from '@/components/SourceSection'
import { AIRecommendation } from '@/components/AIRecommendation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ApiKeySetup } from '@/components/ApiKeySetup'
import {
  validateKeys, searchWithKeys, ApiError,
  type SearchResponse, type ScrapeStatus, STATUS_ORDER,
} from '@/lib/api'
import { getStoredKeys, saveKeys, clearKeys } from '@/lib/keys'

// ── Types ─────────────────────────────────────────────────────────────────────

type AppState =
  | { mode: 'checking' }          // Checking if server keys are configured
  | { mode: 'ready' }             // Server has keys, ready to search
  | { mode: 'needs-keys'; error?: string }  // No server keys, need user keys
  | { mode: 'user-keys-set' }     // User has provided their own keys

type SearchPhase =
  | { name: 'idle' }
  | { name: 'loading' }
  | { name: 'done'; data: SearchResponse }
  | { name: 'error'; error: ApiError | Error }

const EXAMPLES = [
  'wireless mouse', 'running shoes', 'bluetooth earbuds',
  'cotton kurti', 'iPhone 15', 'laptop stand',
]

const FEATURES = [
  { Icon: Zap,              iconClass: 'text-blue-600',   bgClass: 'bg-blue-50',   title: 'Live prices',        body: 'Scrapes 5 marketplaces in parallel. Every result labeled Live, Cached, or Down.' },
  { Icon: Bot,              iconClass: 'text-purple-600', bgClass: 'bg-purple-50', title: 'AI recommendation',  body: 'Gemini reads the real prices returned and picks best value — no invented numbers.' },
  { Icon: SlidersHorizontal,iconClass: 'text-green-600',  bgClass: 'bg-green-50',  title: 'Sort & filter',      body: 'Sort each source by price or rating independently.' },
]

const SOURCES = ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'eBay']

// ── Subcomponents ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="py-20 flex flex-col items-center gap-6" role="status" aria-live="polite">
      <div className="flex gap-3">
        {SOURCES.map((src, i) => (
          <div key={src} className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border-2 border-blue-200 animate-pulse"
                 style={{ animationDelay: `${i * 120}ms` }} aria-hidden />
            <span className="text-[10px] text-gray-400 font-medium">{src}</span>
          </div>
        ))}
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-gray-700">Checking all marketplaces…</p>
        <p className="text-sm text-gray-400">First search takes 10–30 seconds. Cached searches are faster.</p>
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry, onChangeKeys }: {
  error: ApiError | Error
  onRetry: () => void
  onChangeKeys: () => void
}) {
  const isRetryable = error instanceof ApiError && error.isRetryable
  const isKeyError = error instanceof ApiError && error.detail.kind === 'server' &&
    (error.detail.status === 403 || error.message.toLowerCase().includes('key'))

  return (
    <div className="py-16 flex justify-center" role="alert">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
          {isRetryable ? <WifiOff className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
          <p className="font-semibold text-red-800 text-sm">Search failed</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">{error.message}</p>
          {isRetryable && (
            <p className="text-xs text-gray-400">
              The backend may be waking up (free tier sleeps after inactivity). Wait 30 seconds then try again.
            </p>
          )}
          <button onClick={onRetry}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm
                             font-semibold rounded-xl transition-colors flex items-center
                             justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> {isRetryable ? 'Try again' : 'Search again'}
          </button>
          {isKeyError && (
            <button onClick={onChangeKeys}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                               text-sm font-medium rounded-xl transition-colors">
              Update API keys
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryBar({ data, onRefresh, onChangeKeys }: {
  data: SearchResponse
  onRefresh: () => void
  onChangeKeys: () => void
}) {
  const counts: Record<ScrapeStatus, number> = { fresh: 0, stale: 0, unavailable: 0 }
  data.results.forEach(r => counts[r.status]++)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-3 text-sm flex-wrap">
        <span className="font-semibold text-gray-800">&ldquo;{data.query}&rdquo;</span>
        <span className="text-gray-300 hidden sm:inline">·</span>
        {counts.fresh > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden />
            {counts.fresh} live
          </span>
        )}
        {counts.stale > 0 && <span className="text-amber-600">{counts.stale} cached</span>}
        {counts.unavailable > 0 && <span className="text-gray-400">{counts.unavailable} down</span>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRefresh}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800
                           font-medium transition-colors focus:outline-none focus:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button onClick={onChangeKeys}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600
                           transition-colors focus:outline-none"
                title="Change API keys">
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function IdleLanding({ onExample }: { onExample: (q: string) => void }) {
  return (
    <div className="space-y-10 pt-4">
      <div>
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Try searching for</p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map(q => (
            <button key={q} onClick={() => onExample(q)}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full
                               text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50
                               transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              {q}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {FEATURES.map(({ Icon, iconClass, bgClass, title, body }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconClass}`} aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-1">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-3">Searches across</p>
        <div className="flex flex-wrap justify-center gap-2">
          {SOURCES.map(s => (
            <span key={s} className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm">{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>({ mode: 'checking' })
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<SearchPhase>({ name: 'idle' })
  const [showKeySetup, setShowKeySetup] = useState(false)

  // On mount: check if server has keys, or if user has stored keys
  useEffect(() => {
    const storedKeys = getStoredKeys()

    validateKeys(storedKeys.scraperapi || undefined, storedKeys.gemini || undefined)
      .then(status => {
        if (status.scraping.available) {
          setAppState(storedKeys.scraperapi ? { mode: 'user-keys-set' } : { mode: 'ready' })
        } else {
          // Server key not working, check if user has stored keys
          if (storedKeys.scraperapi) {
            setAppState({ mode: 'needs-keys', error: 'Your saved ScraperAPI key is no longer valid. Please enter a new one.' })
          } else {
            setAppState({ mode: 'needs-keys' })
          }
        }
      })
      .catch(() => {
        // Can't reach server at all
        setAppState({ mode: 'needs-keys', error: 'Cannot reach the server. Check your connection.' })
      })
  }, [])

  const getKeys = () => {
    const stored = getStoredKeys()
    return { scraperKey: stored.scraperapi, geminiKey: stored.gemini }
  }

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    setPhase({ name: 'loading' })
    setShowKeySetup(false)
    try {
      const { scraperKey, geminiKey } = getKeys()
      const data = await searchWithKeys(q, scraperKey || undefined, geminiKey || undefined)
      setPhase({ name: 'done', data })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setPhase({ name: 'error', error })

      // If keys failed mid-search, prompt for new ones
      if (err instanceof ApiError && err.detail.kind === 'server' && err.detail.status === 403) {
        setAppState({ mode: 'needs-keys', error: 'API key quota exceeded. Please enter a new key.' })
      }
    }
  }, [])

  const handleKeysReady = useCallback((scraperKey: string, geminiKey: string) => {
    saveKeys(scraperKey, geminiKey)
    setAppState({ mode: 'user-keys-set' })
    setShowKeySetup(false)
    if (query.trim().length >= 2) handleSearch(query)
  }, [query, handleSearch])

  const handleChangeKeys = useCallback(() => {
    setShowKeySetup(true)
  }, [])

  // ── Loading check ──────────────────────────────────────────────────────────
  if (appState.mode === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Connecting…</p>
        </div>
      </div>
    )
  }

  // ── Needs keys (no server key + no valid user key) ─────────────────────────
  if (appState.mode === 'needs-keys' && !showKeySetup) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2 pt-2">
          <h1 className="text-3xl font-bold text-gray-900">AI Shopping Agent</h1>
          <p className="text-gray-500 text-sm">Compare live prices across 5 marketplaces</p>
        </div>
        <ApiKeySetup
          onKeysReady={handleKeysReady}
          needsScraper={true}
          needsGemini={true}
          initialError={appState.error}
        />
      </div>
    )
  }

  // ── Key setup modal overlay ────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      {showKeySetup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative">
            <button
              onClick={() => setShowKeySetup(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-md
                         flex items-center justify-center text-gray-500 hover:text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <ApiKeySetup
              onKeysReady={handleKeysReady}
              needsScraper={true}
              needsGemini={true}
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Hero + search */}
        <section className="text-center space-y-4 pt-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Find the best price<span className="text-blue-600"> instantly</span>
          </h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto">
            Compare live prices across 5 major marketplaces with an AI-powered recommendation.
          </p>
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            loading={phase.name === 'loading'}
          />
        </section>

        {phase.name === 'idle' && <IdleLanding onExample={q => { setQuery(q); handleSearch(q) }} />}
        {phase.name === 'loading' && <LoadingState />}
        {phase.name === 'error' && (
          <ErrorState
            error={phase.error}
            onRetry={() => handleSearch(query)}
            onChangeKeys={handleChangeKeys}
          />
        )}

        {phase.name === 'done' && (
          <div className="space-y-5">
            <SummaryBar
              data={phase.data}
              onRefresh={() => handleSearch(query)}
              onChangeKeys={handleChangeKeys}
            />
            <AIRecommendation
              recommendation={phase.data.ai_recommendation}
              error={phase.data.ai_error}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...phase.data.results]
                .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
                .map(result => <SourceSection key={result.source} result={result} />)}
            </div>
            {phase.data.request_id && (
              <p className="text-center text-[11px] text-gray-300 select-all"
                 title="Include this ID when reporting issues">
                Request ID: {phase.data.request_id}
              </p>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
