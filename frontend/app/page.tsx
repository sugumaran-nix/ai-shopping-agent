'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { AlertTriangle, Bot, Plus, RefreshCw, Settings, SlidersHorizontal, WifiOff, X, Zap } from 'lucide-react'
import { SearchBar } from '@/components/SearchBar'
import { SourceSection } from '@/components/SourceSection'
import { AIRecommendation } from '@/components/AIRecommendation'
import { TopPicksCard, rankTopPicks } from '@/components/TopPicksCard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ApiKeySetup } from '@/components/ApiKeySetup'
import {
  validateKeys, searchWithKeys, ApiError,
  type Product, type SearchResponse, STATUS_ORDER,
} from '@/lib/api'
import { getStoredKeys, hasKeys, saveKeys } from '@/lib/keys'

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
    <section className="animate-content-reveal space-y-5" role="status" aria-live="polite" aria-label="Loading marketplace results">
      <div className="rounded-[20px] border border-[#384524] bg-[#171a16] px-4 py-3 text-[#f5f4ef] shadow-[0_12px_30px_rgba(23,26,22,0.1)]"><div className="flex items-center justify-between gap-3"><div className="skeleton-shimmer h-3 w-28 rounded-full bg-[#34412b]" aria-hidden /><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c9f36b]"><span className="h-2 w-2 animate-glow-pulse rounded-full bg-[#c9f36b]" /> Searching</span></div><div className="mt-3 skeleton-shimmer h-11 rounded-[18px] bg-[#2b3525]" aria-hidden /></div>
      <div className="overflow-hidden rounded-[26px] border border-[#b8d16f] bg-[#f7faed] p-3 shadow-[0_18px_50px_rgba(137,173,53,0.08)] sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="skeleton-shimmer h-10 w-10 rounded-[14px]" aria-hidden /><div className="space-y-2"><div className="skeleton-shimmer h-2 w-32 rounded-full" aria-hidden /><div className="skeleton-shimmer h-4 w-24 rounded-full" aria-hidden /></div></div><div className="flex gap-1.5"><div className="skeleton-shimmer h-6 w-20 rounded-full" aria-hidden /><div className="skeleton-shimmer h-6 w-20 rounded-full" aria-hidden /><div className="skeleton-shimmer h-6 w-20 rounded-full" aria-hidden /></div></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="skeleton-shimmer h-[100px] rounded-[18px]" aria-hidden />)}</div></div>
      <div className="grid gap-4 lg:grid-cols-2">{SOURCES.map((src, i) => <div key={src} className="overflow-hidden rounded-[24px] border border-[#dfe1d8] bg-white/60 p-4" style={{ animationDelay: `${i * 70}ms` }}><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="skeleton-shimmer h-10 w-10 rounded-[14px]" aria-hidden /><div className="space-y-2"><div className="skeleton-shimmer h-3 w-20 rounded-full" aria-hidden /><div className="skeleton-shimmer h-2 w-28 rounded-full" aria-hidden /></div></div><div className="skeleton-shimmer h-5 w-12 rounded-full" aria-hidden /></div><div className="mb-3 flex gap-2"><div className="skeleton-shimmer h-6 w-20 rounded-full" aria-hidden /><div className="skeleton-shimmer h-6 w-14 rounded-full" aria-hidden /></div><div className="source-products-scroll grid grid-cols-1 gap-2 sm:grid-cols-2" aria-hidden>{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton-shimmer h-[92px] rounded-[18px]" />)}</div></div>)}</div>
    </section>
  )
}

function friendlySearchError(error: ApiError | Error): string {
  if (!(error instanceof ApiError)) return 'Something interrupted the comparison. Please try again.'
  if (error.detail.kind === 'network') return 'Cannot reach the comparison service right now. Check your connection and try again.'
  if (error.detail.kind === 'timeout') return 'The comparison is taking longer than expected. Please try again in a moment.'
  if (error.detail.kind === 'server' && (error.detail.status === 403 || /scraperapi|forbidden|quota|api key|unauthori/i.test(error.message))) {
    return 'The live price connection was rejected. Check the scraping connection or try again later.'
  }
  return 'The comparison service is temporarily unavailable. Please try again.'
}

function ErrorState({ error, onRetry, onChangeKeys }: { error: ApiError | Error; onRetry: () => void; onChangeKeys: () => void }) {
  const isRetryable = error instanceof ApiError && error.isRetryable
  const isKeyError = error instanceof ApiError && error.detail.kind === 'server' && (error.detail.status === 403 || error.message.toLowerCase().includes('key'))

  return (
    <div className="animate-content-reveal py-10" role="alert">
      <div className="mx-auto max-w-lg overflow-hidden rounded-[28px] border border-[#e3cbbd] bg-white/85 shadow-[0_20px_70px_rgba(79,46,28,0.1)]">
        <div className="flex items-center gap-3 border-b border-[#eadbd2] bg-[#fff6ef] px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6d4bc] text-[#9e4e21]">{isRetryable ? <WifiOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}</div>
          <div><p className="eyebrow text-[#9e4e21]">Something interrupted the scan</p><p className="mt-1 text-sm font-bold text-[#3e2418]">Search failed</p></div>
        </div>
        <div className="space-y-4 px-6 py-6">
          <p className="text-sm leading-relaxed text-[#5f665b]">{friendlySearchError(error)}</p>
          {isRetryable && <p className="text-xs leading-relaxed text-[#8d9188]">The backend may be waking up after inactivity. Wait 30 seconds, then try again.</p>}
          <button onClick={onRetry} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171a16] py-3 text-sm font-bold text-[#f5f4ef] transition hover:bg-[#303a27]"><RefreshCw className="h-4 w-4" /> {isRetryable ? 'Try again' : 'Search again'}</button>
          {isKeyError && <button onClick={onChangeKeys} className="focus-ring w-full rounded-2xl border border-[#dfe1d8] bg-[#f5f4ef] py-3 text-sm font-bold text-[#5f665b] transition hover:border-[#b7c19e] hover:text-[#171a16]">Update API keys</button>}
        </div>
      </div>
    </div>
  )
}

function ResultsSearchHeader({ data, query, onChange, onSearch, loading, onRefresh, onChangeKeys, onNewSearch }: { data?: SearchResponse; query: string; onChange: (value: string) => void; onSearch: (value: string) => void; loading: boolean; onRefresh?: () => void; onChangeKeys: () => void; onNewSearch: () => void }) {
  const [stuck, setStuck] = useState(false)
  const stickyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const updateStickyState = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const top = stickyRef.current?.getBoundingClientRect().top ?? Infinity
        const nextStuck = top <= 80
        setStuck(current => current === nextStuck ? current : nextStuck)
        frame = 0
      })
    }
    updateStickyState()
    window.addEventListener('scroll', updateStickyState, { passive: true })
    window.addEventListener('resize', updateStickyState)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateStickyState)
      window.removeEventListener('resize', updateStickyState)
    }
  }, [])

  const freshCount = data?.results.filter(result => result.status === 'fresh').length ?? 0
  const visibleCount = data?.results.filter(result => result.products.length > 0).length ?? 0
  return <><div className="rounded-[20px] border border-[#dfe1d8] bg-white/65 p-3 shadow-[0_12px_34px_rgba(44,52,31,0.05)] backdrop-blur-xl sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><p className="eyebrow text-[#718239]">Live price desk</p>{data && <span className="rounded-full bg-[#eff7d9] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64832b]">{freshCount || visibleCount} live</span>}</div><div className="flex items-center gap-2"><button onClick={onRefresh} disabled={!onRefresh || loading} className="focus-ring rounded-full border border-[#dfe1d8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#73786f] transition hover:border-[#b7c19e] hover:text-[#4e6d19] disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Searching…' : 'Refresh'}</button><button onClick={onChangeKeys} className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe1d8] bg-white/70 text-[#73786f] transition hover:border-[#b7c19e] hover:text-[#171a16]" title="Change API keys" aria-label="Change API keys"><Settings className="h-3.5 w-3.5" /></button><button onClick={onNewSearch} className="focus-ring flex items-center gap-1.5 rounded-full bg-[#c9f36b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#35530a] transition hover:bg-[#b9e95b]"><Plus className="h-3.5 w-3.5" /> New search</button></div></div></div><div ref={stickyRef} className={`results-search-sticky ${stuck ? 'results-search-sticky--stuck' : ''}`}><SearchBar value={query} onChange={onChange} onSearch={onSearch} loading={loading} compact /></div></>
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
        {FEATURES.map(({ Icon, kicker, title, body }) => <div key={title} className="group bg-white/75 p-6 transition-colors hover:bg-[#f0f5e4] sm:p-7"><div className="mb-12 flex items-start justify-between"><span className="eyebrow text-[#9a9f95]">{kicker}</span><Icon className="h-5 w-5 text-[#80934a] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden /></div><h3 className="font-display text-2xl leading-none text-[#171a16]">{title}</h3><p className="mt-3 max-w-xs text-sm leading-relaxed text-[#73786f]">{body}</p></div>)}
      </div>

      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center"><span className="eyebrow text-[#9a9f95]">We look across</span><div className="flex flex-wrap justify-center gap-2">{SOURCES.map(s => <span key={s} className="rounded-full border border-[#d5d9cf] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#73786f]">{s}</span>)}</div></div>
    </div>
  )
}

function getTopPickCandidates(data: SearchResponse): Product[] {
  const products = data.results
    .filter(result => result.status !== 'unavailable')
    .flatMap(result => result.products)
    .filter(product => Number.isFinite(product.price) && product.price > 0)
  const currencyCounts = products.reduce<Record<string, number>>((counts, product) => ({ ...counts, [product.currency]: (counts[product.currency] ?? 0) + 1 }), {})
  const comparableCurrency = Object.entries(currencyCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
  return comparableCurrency ? products.filter(product => product.currency === comparableCurrency) : []
}



export default function HomePage() {
  const [appState, setAppState] = useState<AppState>({ mode: 'checking' })
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<SearchPhase>({ name: 'idle' })
  const [showKeySetup, setShowKeySetup] = useState(false)

  useEffect(() => {
    const storedKeys = getStoredKeys()
    if (hasKeys() && storedKeys.scraperapi) {
      setAppState({ mode: 'user-keys-set' })
      return
    }
    validateKeys(storedKeys.scraperapi || undefined, storedKeys.gemini || undefined, storedKeys.openrouter || undefined)
      .then(status => {
        if (status.scraping.available) setAppState(storedKeys.scraperapi ? { mode: 'user-keys-set' } : { mode: 'ready' })
        else if (storedKeys.scraperapi) setAppState({ mode: 'needs-keys', error: 'Your saved ScraperAPI key is no longer valid. Please enter a new one.' })
        else setAppState({ mode: 'needs-keys' })
      })
      .catch(() => setAppState({ mode: 'needs-keys', error: 'Cannot reach the server. Check your connection.' }))
  }, [])

  const getKeys = () => {
    const stored = getStoredKeys()
    return { scraperKey: stored.scraperapi, geminiKey: stored.gemini, openrouterKey: stored.openrouter }
  }

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    setPhase({ name: 'loading' })
    setShowKeySetup(false)
    try {
      const { scraperKey, geminiKey, openrouterKey } = getKeys()
      const data = await searchWithKeys(q, scraperKey || undefined, geminiKey || undefined, openrouterKey || undefined)
      setPhase({ name: 'done', data })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setPhase({ name: 'error', error })
      if (err instanceof ApiError && err.detail.kind === 'server' && err.detail.status === 403) setAppState({ mode: 'needs-keys', error: 'API key quota exceeded. Please enter a new key.' })
    }
  }, [])

  const handleKeysReady = useCallback((scraperKey: string, geminiKey: string, openrouterKey: string) => {
    saveKeys(scraperKey, geminiKey, openrouterKey)
    setAppState({ mode: 'user-keys-set' })
    setShowKeySetup(false)
    if (query.trim().length >= 2) handleSearch(query)
  }, [query, handleSearch])

  const handleChangeKeys = useCallback(() => setShowKeySetup(true), [])
  const topPickCandidates = useMemo(() => phase.name === 'done' ? getTopPickCandidates(phase.data) : [], [phase])
  const bestProduct: Product | undefined = useMemo(() => phase.name === 'done' ? rankTopPicks(topPickCandidates, phase.data.query, 'overall')[0] : undefined, [phase, topPickCandidates])
  const handleNewSearch = useCallback(() => {
    setQuery('')
    setPhase({ name: 'idle' })
    setShowKeySetup(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (appState.mode === 'checking') return <div className="flex min-h-[55vh] items-center justify-center"><div className="text-center"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[#171a16] border-r-transparent" /><p className="eyebrow text-[#8a8f84]">Preparing your search</p></div></div>

  if (appState.mode === 'needs-keys' && !showKeySetup) return <div className="animate-float-in space-y-5 pb-8"><section className="mx-auto max-w-5xl text-center"><div className="mb-2 flex items-center justify-center gap-3"><span className="rounded-full bg-[#c9f36b] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#35530a]">One-time setup</span></div><h1 className="font-display text-[clamp(3rem,6vw,6rem)] leading-[0.84] text-[#171a16]">Connect your <span className="italic text-[#748e35]">search.</span></h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#73786f] sm:text-base">Compare live marketplace listings and get grounded buying guidance.</p></section><ApiKeySetup onKeysReady={handleKeysReady} needsScraper={true} needsGemini={true} needsOpenRouter={true} initialError={appState.error} /></div>

  return (
    <ErrorBoundary>
      {showKeySetup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171a16]/60 p-4 backdrop-blur-sm"><div className="relative w-full max-w-lg"><button onClick={() => setShowKeySetup(false)} className="focus-ring absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#c9f36b] text-[#171a16] shadow-xl transition hover:rotate-90" aria-label="Close"><X className="h-4 w-4" /></button><ApiKeySetup onKeysReady={handleKeysReady} needsScraper={true} needsGemini={true} needsOpenRouter={true} /></div></div>}

      <div className="space-y-10 sm:space-y-14">
        {phase.name === 'idle' && <>
          <section className="mx-auto max-w-5xl text-center">
            <div className="mb-6 flex items-center justify-center"><span className="eyebrow text-[#89907f]">The faster way to choose well</span></div>
            <h1 className="font-display text-[clamp(3.6rem,9vw,8.5rem)] leading-[0.82] text-[#171a16]">Shop less.<br /><span className="italic text-[#718b36]">Choose better.</span></h1>
            <p className="mx-auto mt-7 max-w-xl text-sm leading-relaxed text-[#73786f] sm:text-base">Compare real prices across the places you trust, then let AI turn the noise into one confident next step.</p>
            <div className="mt-8"><SearchBar value={query} onChange={setQuery} onSearch={handleSearch} loading={false} /></div>
          </section>
          <IdleLanding onExample={q => { setQuery(q); handleSearch(q) }} />
        </>}

        {phase.name === 'loading' && <div className="space-y-2"><ResultsSearchHeader query={query} onChange={setQuery} onSearch={handleSearch} loading={true} onChangeKeys={handleChangeKeys} onNewSearch={handleNewSearch} /><LoadingState /></div>}
        {phase.name === 'error' && <div className="space-y-2"><ResultsSearchHeader query={query} onChange={setQuery} onSearch={handleSearch} loading={false} onChangeKeys={handleChangeKeys} onNewSearch={handleNewSearch} /><ErrorState error={phase.error} onRetry={() => handleSearch(query)} onChangeKeys={handleChangeKeys} /></div>}
        {phase.name === 'done' && <div className="animate-content-reveal space-y-5"><ResultsSearchHeader data={phase.data} query={query} onChange={setQuery} onSearch={handleSearch} loading={false} onRefresh={() => handleSearch(query)} onChangeKeys={handleChangeKeys} onNewSearch={handleNewSearch} />{topPickCandidates.length > 0 && <TopPicksCard products={topPickCandidates} query={phase.data.query} />}<div className="grid gap-4 lg:grid-cols-2">{[...phase.data.results].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).map(result => <SourceSection key={result.source} result={result} bestProduct={bestProduct} />)}</div><AIRecommendation recommendation={phase.data.ai_recommendation} error={phase.data.ai_error} onRetry={() => handleSearch(query)} />{phase.data.request_id && <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a6aa9f]" title="Include this ID when reporting issues">Request ID: <span className="select-all">{phase.data.request_id}</span></p>}</div>}
      </div>
    </ErrorBoundary>
  )
}
