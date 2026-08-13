'use client'
import { useState, useCallback } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { SourceSection } from '@/components/SourceSection'
import { AIRecommendation } from '@/components/AIRecommendation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { search, type SearchResponse, type ScrapeStatus } from '@/lib/api'

type PageState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; data: SearchResponse }
  | { phase: 'error'; message: string }

const EXAMPLE_QUERIES = [
  'wireless mouse', 'running shoes', 'bluetooth earbuds',
  'cotton kurti', 'laptop stand', 'coffee maker',
]

const STATUS_ORDER: Record<ScrapeStatus, number> = {
  fresh: 0, stale: 1, unavailable: 2,
}

function ResultsSummary({ data, onRefresh }: { data: SearchResponse; onRefresh: () => void }) {
  const fresh = data.results.filter(r => r.status === 'fresh').length
  const stale = data.results.filter(r => r.status === 'stale').length
  const down = data.results.filter(r => r.status === 'unavailable').length

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-800">"{data.query}"</span>
        {' — '}
        {fresh > 0 && <span className="text-green-600">{fresh} live</span>}
        {fresh > 0 && (stale > 0 || down > 0) && ', '}
        {stale > 0 && <span className="text-amber-600">{stale} cached</span>}
        {stale > 0 && down > 0 && ', '}
        {down > 0 && <span className="text-red-400">{down} down</span>}
      </p>
      <button
        onClick={onRefresh}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium
                   focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
      >
        ↻ Refresh
      </button>
    </div>
  )
}

export default function HomePage() {
  const [state, setState] = useState<PageState>({ phase: 'idle' })
  const [query, setQuery] = useState('')

  const handleSearch = useCallback(async (q: string) => {
    setState({ phase: 'loading' })
    try {
      const data = await search(q)
      setState({ phase: 'done', data })
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
    }
  }, [])

  const handleQueryChange = (q: string) => setQuery(q)

  const handleExampleClick = (q: string) => {
    setQuery(q)
    handleSearch(q)
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Hero + search */}
        <section className="text-center space-y-5 pt-2">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Find the best price across<br className="hidden sm:block" /> every major marketplace
            </h2>
            <p className="mt-2 text-gray-500 text-sm sm:text-base">
              Amazon · Flipkart · Meesho · Myntra · eBay — compared live, with an AI pick.
            </p>
          </div>

          <SearchBar
            value={query}
            onChange={handleQueryChange}
            onSearch={handleSearch}
            loading={state.phase === 'loading'}
          />

          {/* Example queries — only on idle */}
          {state.phase === 'idle' && (
            <div className="flex flex-wrap justify-center gap-2" aria-label="Example searches">
              {EXAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => handleExampleClick(q)}
                  className="text-sm px-3 py-1.5 rounded-full bg-white border border-gray-200
                             text-gray-600 hover:border-blue-300 hover:text-blue-600
                             transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Loading */}
        {state.phase === 'loading' && (
          <div className="text-center py-16 space-y-4" role="status" aria-live="polite">
            <div className="inline-block w-10 h-10 border-4 border-blue-500
                            border-t-transparent rounded-full animate-spin" aria-hidden />
            <div className="space-y-1">
              <p className="text-gray-700 font-medium">Checking prices across all sources…</p>
              <p className="text-gray-400 text-sm">This usually takes 10–20 seconds on first search</p>
            </div>
          </div>
        )}

        {/* Error */}
        {state.phase === 'error' && (
          <div role="alert"
               className="card p-6 border-red-200 bg-red-50 text-center max-w-md mx-auto">
            <p className="text-2xl mb-2" aria-hidden>⚠️</p>
            <p className="font-semibold text-red-700">Search failed</p>
            <p className="text-sm text-red-600 mt-1">{state.message}</p>
            <button
              onClick={() => handleSearch(query)}
              className="mt-4 btn-primary text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {state.phase === 'done' && (
          <div className="space-y-6">
            <ResultsSummary
              data={state.data}
              onRefresh={() => handleSearch(query)}
            />

            <AIRecommendation
              recommendation={state.data.ai_recommendation}
              error={state.data.ai_error}
            />

            {/* Source grid — sorted: fresh first, then stale, then unavailable */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...state.data.results]
                .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
                .map(result => (
                  <SourceSection key={result.source} result={result} />
                ))
              }
            </div>

            {state.data.request_id && (
              <p className="text-center text-xs text-gray-300 select-all"
                 title="Request ID for support">
                ID: {state.data.request_id}
              </p>
            )}
          </div>
        )}

        {/* Idle — feature cards */}
        {state.phase === 'idle' && (
          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            {[
              {
                icon: '⚡',
                title: 'Live prices',
                body: 'Results labeled Live, Cached, or Down so you always know how fresh the data is.',
              },
              {
                icon: '✨',
                title: 'AI pick',
                body: 'Gemini reads the actual prices returned and picks the best value — no invented numbers.',
              },
              {
                icon: '🔃',
                title: 'Sort & filter',
                body: 'Sort each source by price or rating to find your ideal option quickly.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="card p-5 text-center space-y-2">
                <div className="text-3xl" aria-hidden>{icon}</div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
