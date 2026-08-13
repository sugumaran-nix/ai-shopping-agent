'use client'
import { useState, useCallback } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { SourceSection } from '@/components/SourceSection'
import { AIRecommendation } from '@/components/AIRecommendation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  search, ApiError,
  type SearchResponse, type ScrapeStatus, STATUS_ORDER,
} from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | { name: 'idle' }
  | { name: 'loading' }
  | { name: 'done'; data: SearchResponse }
  | { name: 'error'; error: ApiError | Error }

// ── Constants ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  'wireless mouse', 'running shoes', 'bluetooth earbuds',
  'cotton kurti', 'iPhone 15', 'instant pot', 'laptop stand',
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'Live prices',
    body: 'Scrapes 5 marketplaces in parallel. Every result labeled Live, Cached, or Down.',
  },
  {
    icon: '🤖',
    title: 'AI recommendation',
    body: 'Gemini reads the real prices returned and picks best value — no invented numbers.',
  },
  {
    icon: '↕️',
    title: 'Sort by price & rating',
    body: 'Each source can be sorted independently to find your best option.',
  },
]

// ── Subcomponents ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="py-20 flex flex-col items-center gap-5" role="status" aria-live="polite">
      {/* Animated source indicators */}
      <div className="flex gap-3">
        {['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'eBay'].map((src, i) => (
          <div key={src} className="flex flex-col items-center gap-1.5">
            <div
              className="w-8 h-8 rounded-lg bg-blue-100 border-2 border-blue-200 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
              aria-hidden
            />
            <span className="text-[10px] text-gray-400">{src}</span>
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700">Checking all marketplaces…</p>
        <p className="text-sm text-gray-400 mt-1">
          Takes 10–30 seconds. Faster on repeat searches.
        </p>
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry: () => void }) {
  const isApiError = error instanceof ApiError
  const isRetryable = isApiError ? error.isRetryable : false

  return (
    <div className="py-16 flex justify-center" role="alert">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>⚠️</span>
          <p className="font-semibold text-red-800 text-sm">Search failed</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 leading-relaxed">{error.message}</p>
          {isRetryable && (
            <p className="text-xs text-gray-400 mt-2">
              The backend may be starting up (free tier sleeps after inactivity).
              Wait 30 seconds and try again.
            </p>
          )}
          <button
            onClick={onRetry}
            className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white
                       text-sm font-semibold rounded-xl transition-colors
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isRetryable ? 'Try again' : 'Search again'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryBar({
  data,
  onRefresh,
}: {
  data: SearchResponse
  onRefresh: () => void
}) {
  const counts: Record<ScrapeStatus, number> = { fresh: 0, stale: 0, unavailable: 0 }
  data.results.forEach(r => counts[r.status]++)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-gray-800">&ldquo;{data.query}&rdquo;</span>
        <span className="text-gray-300">·</span>
        {counts.fresh > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden/>
            {counts.fresh} live
          </span>
        )}
        {counts.stale > 0 && (
          <span className="text-amber-600">{counts.stale} cached</span>
        )}
        {counts.unavailable > 0 && (
          <span className="text-gray-400">{counts.unavailable} down</span>
        )}
      </div>
      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800
                   font-medium transition-colors focus:outline-none focus:underline"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Refresh
      </button>
    </div>
  )
}

function IdleLanding({ onExample }: { onExample: (q: string) => void }) {
  return (
    <div className="space-y-10 pt-4">
      {/* Examples */}
      <div>
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Try searching for
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map(q => (
            <button
              key={q}
              onClick={() => onExample(q)}
              className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full
                         text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50
                         transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {FEATURES.map(({ icon, title, body }) => (
          <div key={title}
               className="bg-white rounded-2xl border border-gray-200 p-5 text-center space-y-2 shadow-sm">
            <div className="text-3xl" aria-hidden>{icon}</div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Source logos */}
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-3">Searches across</p>
        <div className="flex flex-wrap justify-center gap-2">
          {['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'eBay'].map(s => (
            <span key={s}
                  className="px-3 py-1 text-xs font-medium bg-white border border-gray-200
                             rounded-full text-gray-600 shadow-sm">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    setPhase({ name: 'loading' })
    try {
      const data = await search(q)
      setPhase({ name: 'done', data })
    } catch (err) {
      setPhase({
        name: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
      })
    }
  }, [])

  const handleRetry = useCallback(() => {
    if (query.trim().length >= 2) handleSearch(query)
    else setPhase({ name: 'idle' })
  }, [query, handleSearch])

  const handleExample = useCallback((q: string) => {
    setQuery(q)
    handleSearch(q)
  }, [handleSearch])

  return (
    <ErrorBoundary>
      <div className="space-y-6">

        {/* Hero + Search */}
        <section className="text-center space-y-4 pt-2 pb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Find the best price
            <span className="text-blue-600"> instantly</span>
          </h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto">
            Compare live prices across 5 major marketplaces and get an AI-powered recommendation.
          </p>
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            loading={phase.name === 'loading'}
          />
        </section>

        {/* States */}
        {phase.name === 'idle' && <IdleLanding onExample={handleExample} />}
        {phase.name === 'loading' && <LoadingState />}
        {phase.name === 'error' && (
          <ErrorState error={phase.error} onRetry={handleRetry} />
        )}

        {/* Results */}
        {phase.name === 'done' && (
          <div className="space-y-5">
            <SummaryBar data={phase.data} onRefresh={() => handleSearch(query)} />

            <AIRecommendation
              recommendation={phase.data.ai_recommendation}
              error={phase.data.ai_error}
            />

            {/* Source grid — fresh sources first */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...phase.data.results]
                .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
                .map(result => (
                  <SourceSection key={result.source} result={result} />
                ))}
            </div>

            {phase.data.request_id && (
              <p className="text-center text-[11px] text-gray-300 select-all"
                 title="Request ID — include this when reporting issues">
                Request ID: {phase.data.request_id}
              </p>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
