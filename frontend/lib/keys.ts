/**
 * User API key management.
 * The ScraperAPI key is stored in sessionStorage and cleared when the tab closes.
 * It is sent only to our own backend as a request header.
 */

const SCRAPER_KEY = 'user_scraperapi_key'

export function getStoredKeys(): { scraperapi: string } {
  if (typeof window === 'undefined') return { scraperapi: '' }
  return { scraperapi: sessionStorage.getItem(SCRAPER_KEY) || '' }
}

export function saveKeys(scraperapi: string): void {
  if (scraperapi.trim()) sessionStorage.setItem(SCRAPER_KEY, scraperapi.trim())
  else sessionStorage.removeItem(SCRAPER_KEY)
}

export function clearKeys(): void {
  sessionStorage.removeItem(SCRAPER_KEY)
}

export function hasKeys(): boolean {
  return Boolean(getStoredKeys().scraperapi)
}
