/**
 * Typed API client — single source of truth for all backend communication.
 */

export type ScrapeStatus = 'fresh' | 'stale' | 'unavailable'
export type Source = 'amazon' | 'flipkart' | 'meesho' | 'myntra' | 'ebay'
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
      case 'server':  return d.message || `Server error (${d.status}). Please try again.`
      default:        return d.message || 'Something went wrong. Please try again.'
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
  ebay:     { label: 'eBay',     color: 'bg-yellow-50 border-yellow-200', headerColor: 'bg-yellow-100', accent: 'text-yellow-800' },
}
