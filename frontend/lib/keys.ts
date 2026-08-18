/**
 * User provider credentials. Values live only in sessionStorage and are sent
 * only to this app's backend when the user searches.
 */
export interface ProviderKeys {
  scrapingant: string
  brightdata: string
  brightdataZone: string
}

const KEYS = {
  scrapingant: 'user_scrapingant_key',
  brightdata: 'user_brightdata_key',
  brightdataZone: 'user_brightdata_zone',
} as const

export function getStoredKeys(): ProviderKeys {
  if (typeof window === 'undefined') return { scrapingant: '', brightdata: '', brightdataZone: '' }
  return {
    scrapingant: sessionStorage.getItem(KEYS.scrapingant) || '',
    brightdata: sessionStorage.getItem(KEYS.brightdata) || '',
    brightdataZone: sessionStorage.getItem(KEYS.brightdataZone) || '',
  }
}

export function saveKeys(keys: ProviderKeys): void {
  if (keys.scrapingant.trim()) sessionStorage.setItem(KEYS.scrapingant, keys.scrapingant.trim())
  else sessionStorage.removeItem(KEYS.scrapingant)
  if (keys.brightdata.trim()) sessionStorage.setItem(KEYS.brightdata, keys.brightdata.trim())
  else sessionStorage.removeItem(KEYS.brightdata)
  if (keys.brightdataZone.trim()) sessionStorage.setItem(KEYS.brightdataZone, keys.brightdataZone.trim())
  else sessionStorage.removeItem(KEYS.brightdataZone)
}

export function clearKeys(): void {
  Object.values(KEYS).forEach(key => sessionStorage.removeItem(key))
}

export function hasKeys(): boolean {
  const keys = getStoredKeys()
  return Boolean(keys.scrapingant || (keys.brightdata && keys.brightdataZone))
}
