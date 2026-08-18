/**
 * User API key management.
 * Keys are stored in sessionStorage (cleared when tab closes).
 * Never sent to any third party — only sent to our own backend as headers.
 */

const KEYS = {
  scraperapi: 'user_scraperapi_key',
  gemini: 'user_gemini_key',
  openrouter: 'user_openrouter_key',
} as const

export function getStoredKeys(): { scraperapi: string; gemini: string; openrouter: string } {
  if (typeof window === 'undefined') return { scraperapi: '', gemini: '', openrouter: '' }
  return {
    scraperapi: sessionStorage.getItem(KEYS.scraperapi) || '',
    gemini: sessionStorage.getItem(KEYS.gemini) || '',
    openrouter: sessionStorage.getItem(KEYS.openrouter) || '',
  }
}

export function saveKeys(scraperapi: string, gemini: string, openrouter: string = ''): void {
  if (scraperapi.trim()) sessionStorage.setItem(KEYS.scraperapi, scraperapi.trim())
  else sessionStorage.removeItem(KEYS.scraperapi)
  if (gemini.trim()) sessionStorage.setItem(KEYS.gemini, gemini.trim())
  else sessionStorage.removeItem(KEYS.gemini)
  if (openrouter.trim()) sessionStorage.setItem(KEYS.openrouter, openrouter.trim())
  else sessionStorage.removeItem(KEYS.openrouter)
}

export function clearKeys(): void {
  sessionStorage.removeItem(KEYS.scraperapi)
  sessionStorage.removeItem(KEYS.gemini)
  sessionStorage.removeItem(KEYS.openrouter)
}

export function hasKeys(): boolean {
  const { scraperapi, gemini, openrouter } = getStoredKeys()
  return !!(scraperapi || gemini || openrouter)
}
