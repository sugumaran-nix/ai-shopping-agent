import { useState } from 'react'
import { CheckCircle, ChevronDown, Eye, EyeOff, ExternalLink, Key, Loader2, XCircle } from 'lucide-react'
import { friendlyUserError, validateKeys, type KeyStatus } from '@/lib/api'
import type { ProviderKeys } from '@/lib/keys'

interface Props {
  onKeysReady: (keys: ProviderKeys) => void
  needsProvider: boolean
  initialError?: string
}

type Field = keyof ProviderKeys

function KeyInput({ id, label, value, placeholder, help, href, onChange, status }: {
  id: string; label: string; value: string; placeholder: string; help: string; href: string
  onChange: (value: string) => void; status: 'idle' | 'ok' | 'error'
}) {
  const [show, setShow] = useState(false)
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-bold text-[#343a31]">{label}</label>
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6c8e26] transition hover:text-[#35530a] hover:underline">Get a key <ExternalLink className="h-3 w-3" aria-hidden /></a>
    </div>
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-[#d5d9cf] bg-[#fbfbf8] px-4 py-3 pr-24 text-sm text-[#171a16] outline-none transition placeholder:text-[#a0a59a] focus:border-[#9abb4d] focus:ring-2 focus:ring-[#c9f36b]/40" autoComplete="off" spellCheck={false} />
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">{status === 'ok' && <CheckCircle className="h-4 w-4 text-[#6c9a27]" />}{status === 'error' && <XCircle className="h-4 w-4 text-[#b25c43]" />}<button type="button" onClick={() => setShow(current => !current)} className="rounded-md p-1 text-[#9da399] transition hover:text-[#343a31]" aria-label={show ? 'Hide key' : 'Show key'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
    </div>
    <p className="text-xs leading-relaxed text-[#858a81]">{help}</p>
  </div>
}

export function ApiKeySetup({ onKeysReady, needsProvider, initialError }: Props) {
  const [keys, setKeys] = useState<ProviderKeys>({ scraperapi: '', scrapingant: '', brightdata: '', brightdataZone: 'web_unlocker1' })
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [validating, setValidating] = useState(false)
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [error, setError] = useState(initialError || '')
  const update = (field: Field) => (value: string) => setKeys(current => ({ ...current, [field]: value }))
  const hasUsableKey = Boolean(keys.scraperapi.trim() || keys.scrapingant.trim() || (keys.brightdata.trim() && keys.brightdataZone.trim()))

  const handleValidate = async () => {
    if (needsProvider && !hasUsableKey) {
      setError('Enter your ScraperAPI key, or open “More provider options” to add a backup.')
      return
    }
    setValidating(true); setError(''); setStatus(null)
    try {
      const result = await validateKeys(keys)
      setStatus(result)
      if (result.scraping.available) onKeysReady(keys)
      else setError(friendlyUserError(result.scraping.error, 'setup'))
    } catch (err) {
      setError(friendlyUserError(err instanceof Error ? err.message : 'Validation failed', 'setup'))
    } finally { setValidating(false) }
  }

  const fieldStatus = (field: 'scraperapi' | 'scrapingant' | 'brightdata'): 'idle' | 'ok' | 'error' => {
    if (!status) return 'idle'
    return status[field].available ? 'ok' : keys[field] ? 'error' : 'idle'
  }
  const readyLabel = status?.scraperapi.available ? 'ScraperAPI ready' : status?.scrapingant.available ? 'ScrapingAnt ready' : status?.brightdata.available ? 'Bright Data ready' : 'No provider verified'

  return <div className="mx-auto w-full max-w-4xl"><div className="overflow-hidden rounded-[28px] border border-[#dfe1d8] bg-white/85 shadow-[0_22px_70px_rgba(36,45,26,0.1)]"><div className="border-b border-[#e6e8e0] bg-[#fbfbf8] px-5 py-4 sm:px-6"><div className="flex items-start gap-4"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#c9f36b] text-[#35530a]"><Key className="h-4 w-4" aria-hidden /></div><div><p className="eyebrow text-[#718239]">Session-only access</p><h2 className="mt-1 font-display text-2xl leading-none text-[#171a16]">Marketplace access</h2><p className="mt-1.5 text-sm leading-relaxed text-[#73786f]">Start with one key. Add backup providers only if you need extra resilience.</p></div></div></div><div className="space-y-5 px-5 py-5 sm:px-6">{error && <div className="flex items-start gap-2.5 rounded-2xl border border-[#ebd5cd] bg-[#fff5f1] px-4 py-3"><XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#b25c43]" aria-hidden /><p className="text-sm leading-relaxed text-[#8e4937]">{error}</p></div>}{needsProvider && <><KeyInput id="scraperapi-key" label="ScraperAPI key" value={keys.scraperapi} placeholder="your-scraperapi-key" href="https://www.scraperapi.com/" help="Recommended starting point for live marketplace listings." onChange={update('scraperapi')} status={fieldStatus('scraperapi')} /><button type="button" onClick={() => setAdvancedOpen(current => !current)} className="flex w-full items-center justify-between rounded-2xl border border-[#dfe5d4] bg-[#f7faef] px-4 py-3 text-left text-sm font-bold text-[#55751f] transition hover:border-[#b7c983]"><span>{advancedOpen ? 'Hide backup providers' : 'More provider options (optional)'}</span><ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden /></button>{advancedOpen && <div className="space-y-5 rounded-2xl border border-[#e5e9dc] bg-[#fbfcf8] p-4"><KeyInput id="scrapingant-key" label="ScrapingAnt key" value={keys.scrapingant} placeholder="your-scrapingant-key" href="https://scrapingant.com/" help="Optional backup provider; used if the primary route is unavailable." onChange={update('scrapingant')} status={fieldStatus('scrapingant')} /><KeyInput id="brightdata-key" label="Bright Data key" value={keys.brightdata} placeholder="your-brightdata-key" href="https://brightdata.com/cp/web_access" help="Optional protected-page backup for difficult marketplace pages." onChange={update('brightdata')} status={fieldStatus('brightdata')} /><KeyInput id="brightdata-zone" label="Bright Data zone" value={keys.brightdataZone} placeholder="web_unlocker1" href="https://brightdata.com/cp/zones" help="Usually web_unlocker1; copy the exact zone name from Bright Data." onChange={update('brightdataZone')} status={status?.brightdata.available ? 'ok' : 'idle'} /></div>}</>}{status && <div className="flex items-center gap-2 rounded-2xl border border-[#e1e6d5] bg-[#f7faef] px-4 py-3 text-sm"><CheckCircle className="h-4 w-4 text-[#6c9a27]" /><span className="font-semibold text-[#55751f]">{readyLabel}</span></div>}<button onClick={handleValidate} disabled={validating || (needsProvider && !hasUsableKey)} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171a16] py-3.5 text-sm font-bold text-[#f5f4ef] transition hover:bg-[#303a27] disabled:cursor-not-allowed disabled:opacity-40">{validating ? <><Loader2 className="h-4 w-4 animate-spin" /> Validating…</> : <>Validate & continue <span aria-hidden>↗</span></>}</button><p className="text-center text-[11px] leading-relaxed text-[#9a9f95]">Close this tab to clear access.</p></div></div></div>
}
