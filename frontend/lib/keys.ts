/**
 * User provider credentials. Values live only in sessionStorage and are sent
 * only to this app's backend when the user searches.
 */
export interface ProviderKeys {
  scraperapi: string
  scrapingant: string
  brightdata: string
  brightdataZone: string
}

const KEYS = {
  scraperapi: 'user_scraperapi_key',
  scrapingant: 'user_scrapingant_key',
  brightdata: 'user_brightdata_key',
  brightdataZone: 'user_brightdata_zone',
} as const

export function getStoredKeys(): ProviderKeys {
  if (typeof window === 'undefined') return { scraperapi: '', scrapingant: '', brightdata: '', brightdataZone: '' }
  return {
    scraperapi: sessionStorage.getItem(KEYS.scraperapi) || '',
    scrapingant: sessionStorage.getItem(KEYS.scrapingant) || '',
    brightdata: sessionStorage.getItem(KEYS.brightdata) || '',
    brightdataZone: sessionStorage.getItem(KEYS.brightdataZone) || '',
  }
}

export function saveKeys(keys: ProviderKeys): void {
  Object.entries(KEYS).forEach(([field, storageKey]) => {
    const value = keys[field as keyof ProviderKeys].trim()
    if (value) sessionStorage.setItem(storageKey, value)
    else sessionStorage.removeItem(storageKey)
  })
}

export function clearKeys(): void {
  Object.values(KEYS).forEach(key => sessionStorage.removeItem(key))
}

export function hasKeys(): boolean {
  const keys = getStoredKeys()
  return Boolean(keys.scraperapi || keys.scrapingant || (keys.brightdata && keys.brightdataZone))
}
