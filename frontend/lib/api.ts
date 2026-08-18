/**
 * Typed API client — single source of truth for all backend communication.
 */

export type ScrapeStatus = 'fresh' | 'stale' | 'unavailable'
export type Source = 'amazon' | 'flipkart' | 'meesho' | 'myntra'
export type SortKey = 'default' | 'price_asc' | 'price_desc' | 'rating'

export interface Product {
  source: Source
  title: string
  price: number
  currency: string
  rating: number | null
  review_count: number | null
  url: string
  image_url: string | null
  fetched_at: string
}

export interface SourceResult {
  source: Source
  status: ScrapeStatus
  products: Product[]
  error: string | null
}

export interface SearchResponse {
  query: string
  results: SourceResult[]
  ai_recommendation: string | null
  ai_error: string | null
  request_id: string | null
}

export type SearchErrorKind = 'network' | 'timeout' | 'server' | 'unknown'

export interface SearchErrorDetail {
  kind: SearchErrorKind
  status?: number
  message?: string
}

export class ApiError extends Error {
  readonly detail: SearchErrorDetail
  constructor(detail: SearchErrorDetail) {
    super(ApiError.toMessage(detail))
    this.name = 'ApiError'
    this.detail = detail
  }
  static toMessage(d: SearchErrorDetail): string {
    switch (d.kind) {
      case 'network': return 'Cannot reach the server. Check your internet connection and try again.'
      case 'timeout': return 'The search took too long. The server may be starting up — please try again in 30 seconds.'
      case 'server':  return d.status === 403 ? 'The live price connection was rejected. Check the scraping connection or try again later.' : 'The comparison service is temporarily unavailable. Please try again.'
      default:        return 'Something went wrong while preparing the comparison. Please try again.'
    }
  }
  get isRetryable(): boolean {
    return this.detail.kind === 'timeout' || this.detail.kind === 'network'
  }
}

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export async function search(query: string): Promise<SearchResponse> {
  const url = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query.trim())}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError')
      throw new ApiError({ kind: 'timeout' })
    throw new ApiError({ kind: 'network' })
  }
  if (!res.ok) {
    let message = `Server error (${res.status})`
    try { message = (await res.json())?.error?.message ?? message } catch { /* ignore */ }
    throw new ApiError({ kind: 'server', status: res.status, message })
  }
  return res.json() as Promise<SearchResponse>
}

export async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/ping`, { cache: 'no-store', signal: AbortSignal.timeout(5_000) })
    return res.ok
  } catch { return false }
}

export function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(price)
  } catch { return `${currency} ${price.toLocaleString()}` }
}

export function sortProducts(products: Product[], key: SortKey): Product[] {
  const copy = [...products]
  switch (key) {
    case 'price_asc':  return copy.sort((a, b) => a.price - b.price)
    case 'price_desc': return copy.sort((a, b) => b.price - a.price)
    case 'rating':     return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    default:           return copy
  }
}

export const STATUS_ORDER: Record<ScrapeStatus, number> = { fresh: 0, stale: 1, unavailable: 2 }

export const SOURCE_META: Record<Source, {
  label: string
  color: string
  headerColor: string
  accent: string
}> = {
  amazon:   { label: 'Amazon',   color: 'bg-orange-50 border-orange-200', headerColor: 'bg-orange-100', accent: 'text-orange-800' },
  flipkart: { label: 'Flipkart', color: 'bg-blue-50   border-blue-200',   headerColor: 'bg-blue-100',   accent: 'text-blue-800'   },
  meesho:   { label: 'Meesho',   color: 'bg-pink-50   border-pink-200',   headerColor: 'bg-pink-100',   accent: 'text-pink-800'   },
  myntra:   { label: 'Myntra',   color: 'bg-rose-50   border-rose-200',   headerColor: 'bg-rose-100',   accent: 'text-rose-800'   },
}


// ── API key-aware fetch ───────────────────────────────────────────────────────

export interface KeyStatus {
  scraping: { available: boolean; source: string; error: string | null }
  ai: { available: boolean; source: string; error: string | null }
  alternative_ai: { available: boolean; source: string; error: string | null }
}

export async function validateKeys(scraperKey?: string, geminiKey?: string, openrouterKey?: string): Promise<KeyStatus> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (scraperKey) headers['X-ScraperAPI-Key'] = scraperKey
  if (geminiKey) headers['X-Gemini-Key'] = geminiKey
  if (openrouterKey) headers['X-OpenRouter-Key'] = openrouterKey

  try {
    const res = await fetch(`${BASE_URL}/api/v1/validate-keys`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<KeyStatus>
  } catch {
    throw new Error('Could not reach server to validate keys')
  }
}

export async function searchWithKeys(
  query: string,
  scraperKey?: string,
  geminiKey?: string,
  openrouterKey?: string,
): Promise<SearchResponse> {
  const url = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query.trim())}`
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (scraperKey) headers['X-ScraperAPI-Key'] = scraperKey
  if (geminiKey) headers['X-Gemini-Key'] = geminiKey
  if (openrouterKey) headers['X-OpenRouter-Key'] = openrouterKey

  let res: Response
  try {
    res = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError')
      throw new ApiError({ kind: 'timeout' })
    throw new ApiError({ kind: 'network' })
  }

  if (!res.ok) {
    let message = `Server error (${res.status})`
    try { message = (await res.json())?.error?.message ?? message } catch { /* ignore */ }
    throw new ApiError({ kind: 'server', status: res.status, message })
  }

  return res.json() as Promise<SearchResponse>
}

export function friendlyUserError(error?: string | null, kind: 'connection' | 'ai' | 'setup' = 'connection'): string {
  if (!error) return kind === 'ai' ? 'AI recommendations are temporarily unavailable.' : kind === 'setup' ? 'The connection could not be verified. Check your key and try again.' : 'This service is temporarily unavailable. Try again later.'
  const normalized = error.toLowerCase()
  if (/scraperapi|amazon|flipkart|meesho|myntra|https?:\/\/|http \d{3}|403|forbidden|quota|unauthori/.test(normalized)) {
    return kind === 'ai' ? 'The AI recommendation is temporarily unavailable. Your price results are still available.' : kind === 'setup' ? 'The connection could not be verified. Check your key and try again.' : 'Live marketplace access was rejected. Try again later.'
  }
  if (/gemini|generat|model|ai/.test(normalized)) return 'The AI recommendation is temporarily unavailable. Your price results are still available.'
  if (/timeout|timed out/.test(normalized)) return 'The request took too long to respond. Try again in a moment.'
  if (/network|connect|server/.test(normalized)) return 'The service could not be reached right now. Try again later.'
  return kind === 'ai' ? 'The AI recommendation is temporarily unavailable. Your price results are still available.' : kind === 'setup' ? 'The connection could not be verified. Check your key and try again.' : 'This service did not return a usable response. Try again later.'
}

export function friendlySourceError(status: ScrapeStatus, error?: string | null): string {
  if (status === 'stale') return 'Live access is temporarily unavailable. Showing the latest saved prices.'
  if (!error) return status === 'unavailable' ? 'This source is temporarily unavailable. Try another source or refresh later.' : 'Live prices are not available right now.'

  const normalized = error.toLowerCase()
  if (/403|forbidden|scraperapi|quota|api key|unauthori/.test(normalized)) {
    return 'Live price access was rejected. Try refreshing later or check the scraping connection.'
  }
  if (/timeout|timed out/.test(normalized)) {
    return 'This source took too long to respond. Try again in a moment.'
  }
  if (/network|connect|empty response/.test(normalized)) {
    return 'This source could not be reached right now. Try again later.'
  }
  return 'This source did not return live prices. Try another source or refresh later.'
}
