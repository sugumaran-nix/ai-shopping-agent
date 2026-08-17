'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, Bot, CircleDot, Plus, RefreshCw, Settings, SlidersHorizontal, WifiOff, X, Zap } from 'lucide-react'
import { SearchBar } from '@/components/SearchBar'
import { SourceSection } from '@/components/SourceSection'
import { AIRecommendation } from '@/components/AIRecommendation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ApiKeySetup } from '@/components/ApiKeySetup'
import {
  validateKeys, searchWithKeys, ApiError,
  type Product, type SearchResponse, type ScrapeStatus, STATUS_ORDER,
} from '@/lib/api'
import { getStoredKeys, saveKeys } from '@/lib/keys'

type AppState =
  | { mode: 'checking' }
  | { mode: 'ready' }
  | { mode: 'needs-keys'; error?: string }
  | { mode: 'user-keys-set' }

type SearchPhase =
  | { name: 'idle' }
  | { name: 'loading' }
  | { name: 'done'; data: SearchResponse }
  | { name: 'error'; error: ApiError | Error }

const EXAMPLES = ['wireless mouse', 'running shoes', 'bluetooth earbuds', 'cotton kurti', 'iPhone 15', 'laptop stand']

const FEATURES = [
  { Icon: Zap, kicker: '01 / Signal', title: 'Live price pulse', body: 'Compare fresh listings across the marketplaces you already shop.' },
  { Icon: Bot, kicker: '02 / Intelligence', title: 'A second opinion', body: 'AI reads the returned products and explains which option makes sense.' },
  { Icon: SlidersHorizontal, kicker: '03 / Control', title: 'Your shortlist', body: 'Sort each source by price, rating, or best match without losing context.' },
]

const SOURCES = ['Amazon', 'Flipkart', 'Meesho', 'Myntra']

function LoadingState() {
  return (
    <div className="animate-float-in py-20" role="status" aria-live="polite">
      <div className="mx-auto max-w-xl rounded-[28px] border border-[#dfe1d8] bg-[#171a16] p-6 text-[#f5f4ef] shadow-[0_24px_80px_rgba(23,26,22,0.15)] sm:p-8">
        <div className="mb-9 flex items-center justify-between">
          <span className="eyebrow text-[#aeb8a2]">Live scan in progress</span>
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c9f36b]"><span className="h-2 w-2 animate-glow-pulse rounded-full bg-[#c9f36b]" /> Searching</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SOURCES.map((src, i) => (
            <div key={src} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="h-10 rounded-xl bg-white/10 animate-pulse" aria-hidden />
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8a2]">{src}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-end justify-between gap-6">
          <div>
            <p className="font-display text-2xl leading-none sm:text-3xl">Checking every shelf.</p>
            <p className="mt-2 text-sm leading-relaxed text-[#aeb8a2]">First searches take 10–30 seconds. Cached searches move faster.</p>
          </div>
          <div className="hidden h-12 w-12 flex-shrink-0 rounded-full border border-[#c9f36b]/40 p-1 sm:block"><div className="h-full w-full animate-spin rounded-full border-2 border-[#c9f36b] border-r-transparent" /></div>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry, onChangeKeys }: { error: ApiError | Error; onRetry: () => void; onChangeKeys: () => void }) {
  const isRetryable = error instanceof ApiError && error.isRetryable
  const isKeyError = error instanceof ApiError && error.detail.kind === 'server' && (error.detail.status === 403 || error.message.toLowerCase().includes('key'))

  return (
    <div className="animate-float-in py-16" role="alert">
      <div className="mx-auto max-w-lg overflow-hidden rounded-[28px] border border-[#e3cbbd] bg-white/85 shadow-[0_20px_70px_rgba(79,46,28,0.1)]">
        <div className="flex items-center gap-3 border-b border-[#eadbd2] bg-[#fff6ef] px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6d4bc] text-[#9e4e21]">{isRetryable ? <WifiOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}</div>
          <div><p className="eyebrow text-[#9e4e21]">Something interrupted the scan</p><p className="mt-1 text-sm font-bold text-[#3e2418]">Search failed</p></div>
        </div>
        <div className="space-y-4 px-6 py-6">
          <p className="text-sm leading-relaxed text-[#5f665b]">{error.message}</p>
          {isRetryable && <p className="text-xs leading-relaxed text-[#8d9188]">The backend may be waking up after inactivity. Wait 30 seconds, then try again.</p>}
          <button onClick={onRetry} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171a16] py-3 text-sm font-bold text-[#f5f4ef] transition hover:bg-[#303a27]"><RefreshCw className="h-4 w-4" /> {isRetryable ? 'Try again' : 'Search again'}</button>
          {isKeyError && <button onClick={onChangeKeys} className="focus-ring w-full rounded-2xl border border-[#dfe1d8] bg-[#f5f4ef] py-3 text-sm font-bold text-[#5f665b] transition hover:border-[#b7c19e] hover:text-[#171a16]">Update API keys</button>}
        </div>
      </div>
    </div>
  )
}

function SummaryBar({ data, onRefresh, onChangeKeys }: { data: SearchResponse; onRefresh: () => void; onChangeKeys: () => void }) {
  const counts: Record<ScrapeStatus, number> = { fresh: 0, stale: 0, unavailable: 0 }
  data.results.forEach(r => { counts[r.status] += 1 })
  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-[#dfe1d8] bg-white/65 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="max-w-full truncate font-display text-xl text-[#171a16]">“{data.query}”</span>
        <span className="hidden h-4 w-px bg-[#dfe1d8] sm:block" aria-hidden />
        {counts.fresh > 0 && <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#62841f]"><CircleDot className="h-3.5 w-3.5" />{counts.fresh} live</span>}
        {counts.stale > 0 && <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#a06a1d]">{counts.stale} cached</span>}
        {counts.unavailable > 0 && <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a8f84]">{counts.unavailable} down</span>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="focus-ring flex items-center gap-2 rounded-full bg-[#171a16] px-3.5 py-2 text-xs font-bold text-[#f5f4ef] transition hover:bg-[#303a27]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        <button onClick={onChangeKeys} className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe1d8] bg-white/70 text-[#73786f] transition hover:border-[#b7c19e] hover:text-[#171a16]" title="Change API keys" aria-label="Change API keys"><Settings className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

function IdleLanding({ onExample }: { onExample: (q: string) => void }) {
  return (
    <div className="animate-float-in space-y-12 pt-5 sm:pt-8">
      <div>
        <div className="mb-4 flex items-center justify-center gap-3 text-[#89907f]"><span className="h-px w-10 bg-[#cfd4c5]" /><span className="eyebrow">Start with a hunch</span><span className="h-px w-10 bg-[#cfd4c5]" /></div>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map(q => <button key={q} onClick={() => onExample(q)} className="focus-ring rounded-full border border-[#d5d9cf] bg-white/55 px-3.5 py-2 text-xs font-semibold text-[#5f665b] transition duration-200 hover:-translate-y-0.5 hover:border-[#9abb4d] hover:bg-[#eff7d9] hover:text-[#35530a]">{q}</button>)}
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[26px] border border-[#dfe1d8] bg-[#dfe1d8] sm:grid-cols-3">
        {FEATURES.map(({ Icon, kicker, title, body }, i) => <div key={title} className="group bg-white/75 p-6 transition-colors hover:bg-[#f0f5e4] sm:p-7"><div className="mb-12 flex items-start justify-between"><span className="eyebrow text-[#9a9f95]">{kicker}</span><Icon className="h-5 w-5 text-[#80934a] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden /></div><h3 className="font-display text-2xl leading-none text-[#171a16]">{title}</h3><p className="mt-3 max-w-xs text-sm leading-relaxed text-[#73786f]">{body}</p></div>)}
      </div>

      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center"><span className="eyebrow text-[#9a9f95]">We look across</span><div className="flex flex-wrap justify-center gap-2">{SOURCES.map(s => <span key={s} className="rounded-full border border-[#d5d9cf] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#73786f]">{s}</span>)}</div></div>
    </div>
  )
}

function ResultsSearchHeader({ query, onChange, onSearch, loading, onNewSearch }: { query: string; onChange: (value: string) => void; onSearch: (value: string) => void; loading: boolean; onNewSearch: () => void }) {
  return <div className="rounded-[24px] border border-[#dfe1d8] bg-white/60 p-4 shadow-[0_12px_34px_rgba(44,52,31,0.05)] backdrop-blur-xl lg:sticky lg:top-[88px] lg:z-10 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="eyebrow text-[#718239]">Live price desk</p><p className="mt-1 text-xs font-medium text-[#858a81]">Search again without leaving your shortlist.</p></div><button onClick={onNewSearch} className="focus-ring flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[#c9f36b] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#35530a] transition hover:bg-[#b9e95b]"><Plus className="h-3.5 w-3.5" /> New search</button></div><SearchBar value={query} onChange={onChange} onSearch={onSearch} loading={loading} compact /></div>
}

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>({ mode: 'checking' })
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<SearchPhase>({ name: 'idle' })
  const [showKeySetup, setShowKeySetup] = useState(false)

  useEffect(() => {
    const storedKeys = getStoredKeys()
    validateKeys(storedKeys.scraperapi || undefined, storedKeys.gemini || undefined)
      .then(status => {
        if (status.scraping.available) setAppState(storedKeys.scraperapi ? { mode: 'user-keys-set' } : { mode: 'ready' })
        else if (storedKeys.scraperapi) setAppState({ mode: 'needs-keys', error: 'Your saved ScraperAPI key is no longer valid. Please enter a new one.' })
        else setAppState({ mode: 'needs-keys' })
      })
      .catch(() => setAppState({ mode: 'needs-keys', error: 'Cannot reach the server. Check your connection.' }))
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
      if (err instanceof ApiError && err.detail.kind === 'server' && err.detail.status === 403) setAppState({ mode: 'needs-keys', error: 'API key quota exceeded. Please enter a new key.' })
    }
  }, [])

  const handleKeysReady = useCallback((scraperKey: string, geminiKey: string) => {
    saveKeys(scraperKey, geminiKey)
    setAppState({ mode: 'user-keys-set' })
    setShowKeySetup(false)
    if (query.trim().length >= 2) handleSearch(query)
  }, [query, handleSearch])

  const handleChangeKeys = useCallback(() => setShowKeySetup(true), [])
  const lowestProduct: Product | undefined = phase.name === 'done' ? (() => {
    const products = phase.data.results
      .filter(result => result.status !== 'unavailable')
      .flatMap(result => result.products)
      .filter(product => Number.isFinite(product.price) && product.price > 0)
    const currencies = new Set(products.map(product => product.currency))
    if (products.length === 0 || currencies.size !== 1) return undefined
    return products.reduce((lowest, product) => product.price < lowest.price ? product : lowest)
  })() : undefined
  const handleNewSearch = useCallback(() => {
    setQuery('')
    setPhase({ name: 'idle' })
    setShowKeySetup(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (appState.mode === 'checking') return <div className="flex min-h-[55vh] items-center justify-center"><div className="text-center"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[#171a16] border-r-transparent" /><p className="eyebrow text-[#8a8f84]">Waking the comparison engine</p></div></div>

  if (appState.mode === 'needs-keys' && !showKeySetup) return <div className="animate-float-in space-y-8"><section className="mx-auto max-w-3xl text-center"><div className="mb-5 flex items-center justify-center gap-3"><span className="rounded-full bg-[#c9f36b] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#35530a]">One-time setup</span></div><h1 className="font-display text-5xl leading-[0.9] text-[#171a16] sm:text-7xl">Unlock your <span className="italic text-[#748e35]">smartest</span> shortlist.</h1><p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#73786f] sm:text-base">Add two free keys and turn product browsing into a clear, AI-assisted buying decision.</p></section><ApiKeySetup onKeysReady={handleKeysReady} needsScraper={true} needsGemini={true} initialError={appState.error} /></div>

  return (
    <ErrorBoundary>
      {showKeySetup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171a16]/60 p-4 backdrop-blur-sm"><div className="relative w-full max-w-lg"><button onClick={() => setShowKeySetup(false)} className="focus-ring absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#c9f36b] text-[#171a16] shadow-xl transition hover:rotate-90" aria-label="Close"><X className="h-4 w-4" /></button><ApiKeySetup onKeysReady={handleKeysReady} needsScraper={true} needsGemini={true} /></div></div>}

      <div className="space-y-10 sm:space-y-14">
        {phase.name === 'idle' && <>
          <section className="mx-auto max-w-5xl text-center">
            <div className="mb-6 flex items-center justify-center gap-3"><span className="eyebrow text-[#89907f]">The faster way to choose well</span><span className="rounded-full bg-[#c9f36b] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#35530a]">Live</span></div>
            <h1 className="font-display text-[clamp(3.6rem,9vw,8.5rem)] leading-[0.82] text-[#171a16]">Shop less.<br /><span className="italic text-[#718b36]">Choose better.</span></h1>
            <p className="mx-auto mt-7 max-w-xl text-sm leading-relaxed text-[#73786f] sm:text-base">Compare real prices across the places you trust, then let AI turn the noise into one confident next step.</p>
            <div className="mt-8"><SearchBar value={query} onChange={setQuery} onSearch={handleSearch} loading={false} /></div>
          </section>
          <IdleLanding onExample={q => { setQuery(q); handleSearch(q) }} />
        </>}

        {phase.name === 'loading' && <div className="space-y-2"><ResultsSearchHeader query={query} onChange={setQuery} onSearch={handleSearch} loading={true} onNewSearch={handleNewSearch} /><LoadingState /></div>}
        {phase.name === 'error' && <div className="space-y-2"><ResultsSearchHeader query={query} onChange={setQuery} onSearch={handleSearch} loading={false} onNewSearch={handleNewSearch} /><ErrorState error={phase.error} onRetry={() => handleSearch(query)} onChangeKeys={handleChangeKeys} /></div>}
        {phase.name === 'done' && <div className="animate-float-in space-y-5"><ResultsSearchHeader query={query} onChange={setQuery} onSearch={handleSearch} loading={false} onNewSearch={handleNewSearch} /><SummaryBar data={phase.data} onRefresh={() => handleSearch(query)} onChangeKeys={handleChangeKeys} /><AIRecommendation recommendation={phase.data.ai_recommendation} error={phase.data.ai_error} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[...phase.data.results].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).map(result => <SourceSection key={result.source} result={result} lowestProduct={lowestProduct} />)}</div>{phase.data.request_id && <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a6aa9f]" title="Include this ID when reporting issues">Request ID: <span className="select-all">{phase.data.request_id}</span></p>}</div>}
      </div>
    </ErrorBoundary>
  )
}
