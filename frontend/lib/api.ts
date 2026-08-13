/**
 * Typed API client — single source of truth for all backend communication.
 * No raw fetch() calls anywhere else in the codebase.
 */

export type ScrapeStatus = 'fresh' | 'stale' | 'unavailable'
export type Source = 'amazon' | 'flipkart' | 'meesho' | 'myntra' | 'ebay'

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

interface ApiError {
  error: { code: string; message: string; request_id: string | null }
}

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '')

export async function search(query: string): Promise<SearchResponse> {
  const url = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000), // 60s hard client timeout
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('Request timed out. The search is taking too long — please try again.')
    }
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  if (!res.ok) {
    let message = `Server error (${res.status})`
    try {
      const body = (await res.json()) as ApiError
      message = body.error?.message ?? message
    } catch { /* ignore — use fallback message */ }
    throw new Error(message)
  }

  return res.json() as Promise<SearchResponse>
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function formatPrice(price: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    // Fallback for unknown currency codes
    return `${currency} ${price.toLocaleString()}`
  }
}

export const SOURCE_META: Record<Source, { label: string; color: string; accent: string }> = {
  amazon:   { label: 'Amazon',   color: 'bg-orange-50 border-orange-200', accent: 'text-orange-700' },
  flipkart: { label: 'Flipkart', color: 'bg-blue-50   border-blue-200',   accent: 'text-blue-700'   },
  meesho:   { label: 'Meesho',   color: 'bg-pink-50   border-pink-200',   accent: 'text-pink-700'   },
  myntra:   { label: 'Myntra',   color: 'bg-rose-50   border-rose-200',   accent: 'text-rose-700'   },
  ebay:     { label: 'eBay',     color: 'bg-yellow-50 border-yellow-200', accent: 'text-yellow-700' },
}
