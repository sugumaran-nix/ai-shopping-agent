import { useState } from 'react'
import { CheckCircle, Eye, EyeOff, ExternalLink, Key, Loader2, XCircle } from 'lucide-react'
import { friendlyUserError, validateKeys, type KeyStatus } from '@/lib/api'

interface Props {
  onKeysReady: (scraperKey: string) => void
  needsScraper: boolean
  initialError?: string
}

function KeyInput({ value, onChange, status }: { value: string; onChange: (value: string) => void; status: 'idle' | 'ok' | 'error' }) {
  const [show, setShow] = useState(false)
  return <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label htmlFor="scraperapi-key" className="text-sm font-bold text-[#343a31]">ScraperAPI key</label><a href="https://www.scraperapi.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6c8e26] transition hover:text-[#35530a] hover:underline">Get a key <ExternalLink className="h-3 w-3" aria-hidden /></a></div><div className="relative"><input id="scraperapi-key" type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder="your-scraperapi-key" className="w-full rounded-2xl border border-[#d5d9cf] bg-[#fbfbf8] px-4 py-3 pr-24 text-sm text-[#171a16] outline-none transition placeholder:text-[#a0a59a] focus:border-[#9abb4d] focus:ring-2 focus:ring-[#c9f36b]/40" autoComplete="off" spellCheck={false} /><div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">{status === 'ok' && <CheckCircle className="h-4 w-4 text-[#6c9a27]" />}{status === 'error' && <XCircle className="h-4 w-4 text-[#b25c43]" />}<button type="button" onClick={() => setShow(current => !current)} className="rounded-md p-1 text-[#9da399] transition hover:text-[#343a31]" aria-label={show ? 'Hide key' : 'Show key'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><p className="text-xs leading-relaxed text-[#858a81]">Fetches live marketplace listings. It stays in this browser session and is sent only when you search.</p></div>
}

export function ApiKeySetup({ onKeysReady, needsScraper, initialError }: Props) {
  const [scraperKey, setScraperKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [error, setError] = useState(initialError || '')

  const handleValidate = async () => {
    if (needsScraper && !scraperKey.trim()) { setError('Please enter your ScraperAPI key'); return }
    setValidating(true)
    setError('')
    setStatus(null)
    try {
      const result = await validateKeys(scraperKey.trim() || undefined)
      setStatus(result)
      if (result.scraping.available) onKeysReady(scraperKey.trim())
      else setError(friendlyUserError(result.scraping.error, 'setup'))
    } catch (err) {
      setError(friendlyUserError(err instanceof Error ? err.message : 'Validation failed', 'setup'))
    } finally {
      setValidating(false)
    }
  }

  return <div className="mx-auto w-full max-w-4xl"><div className="overflow-hidden rounded-[28px] border border-[#dfe1d8] bg-white/85 shadow-[0_22px_70px_rgba(36,45,26,0.1)]"><div className="border-b border-[#e6e8e0] bg-[#fbfbf8] px-5 py-4 sm:px-6"><div className="flex items-start gap-4"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#c9f36b] text-[#35530a]"><Key className="h-4 w-4" aria-hidden /></div><div><p className="eyebrow text-[#718239]">Session-only access</p><h2 className="mt-1 font-display text-2xl leading-none text-[#171a16]">Marketplace access</h2><p className="mt-1.5 text-sm leading-relaxed text-[#73786f]">One key unlocks live listings. Recommendations are calculated locally from the returned prices, ratings, and reviews.</p></div></div></div><div className="space-y-5 px-5 py-5 sm:px-6">{error && <div className="flex items-start gap-2.5 rounded-2xl border border-[#ebd5cd] bg-[#fff5f1] px-4 py-3"><XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#b25c43]" aria-hidden /><p className="text-sm leading-relaxed text-[#8e4937]">{error}</p></div>}{needsScraper && <KeyInput value={scraperKey} onChange={setScraperKey} status={status ? (status.scraping.available ? 'ok' : 'error') : 'idle'} />}{status && <div className="flex items-center gap-2 rounded-2xl border border-[#e1e6d5] bg-[#f7faef] px-4 py-3 text-sm"><CheckCircle className="h-4 w-4 text-[#6c9a27]" /><span className="font-semibold text-[#55751f]">Marketplace access verified</span></div>}<button onClick={handleValidate} disabled={validating || (needsScraper && !scraperKey.trim())} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171a16] py-3.5 text-sm font-bold text-[#f5f4ef] transition hover:bg-[#303a27] disabled:cursor-not-allowed disabled:opacity-40">{validating ? <><Loader2 className="h-4 w-4 animate-spin" /> Validating…</> : <>Validate & continue <span aria-hidden>↗</span></>}</button><p className="text-center text-[11px] leading-relaxed text-[#9a9f95]">Close this tab to clear access.</p></div></div></div>
}
