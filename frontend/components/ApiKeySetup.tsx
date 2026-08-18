import { useState } from 'react'
import { CheckCircle, Eye, EyeOff, ExternalLink, Key, Loader2, XCircle } from 'lucide-react'
import { friendlyUserError, validateKeys, type KeyStatus } from '@/lib/api'
import { saveKeys } from '@/lib/keys'

interface Props {
  onKeysReady: (scraperKey: string, geminiKey: string, openrouterKey: string) => void
  needsScraper: boolean
  needsGemini: boolean
  needsOpenRouter?: boolean
  initialError?: string
}

function KeyInput({ label, id, value, onChange, placeholder, helpUrl, helpText, status }: { label: string; id: string; value: string; onChange: (v: string) => void; placeholder: string; helpUrl: string; helpText: string; status: 'idle' | 'ok' | 'error' }) {
  const [show, setShow] = useState(false)
  return <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-bold text-[#343a31]">{label}</label><a href={helpUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6c8e26] transition hover:text-[#35530a] hover:underline">Get a key <ExternalLink className="h-3 w-3" aria-hidden /></a></div><div className="relative"><input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-[#d5d9cf] bg-[#fbfbf8] px-4 py-3 pr-24 text-sm text-[#171a16] outline-none transition placeholder:text-[#a0a59a] focus:border-[#9abb4d] focus:ring-2 focus:ring-[#c9f36b]/40" autoComplete="off" spellCheck={false} /><div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">{status === 'ok' && <CheckCircle className="h-4 w-4 text-[#6c9a27]" />}{status === 'error' && <XCircle className="h-4 w-4 text-[#b25c43]" />}<button type="button" onClick={() => setShow(s => !s)} className="rounded-md p-1 text-[#9da399] transition hover:text-[#343a31]" aria-label={show ? 'Hide key' : 'Show key'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><p className="text-xs leading-relaxed text-[#858a81]">{helpText}</p></div>
}

export function ApiKeySetup({ onKeysReady, needsScraper, needsGemini, needsOpenRouter = true, initialError }: Props) {
  const [scraperKey, setScraperKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [error, setError] = useState(initialError || '')

  const handleValidate = async () => {
    if (needsScraper && !scraperKey.trim()) { setError('Please enter your ScraperAPI key'); return }
    setValidating(true)
    setError('')
    setStatus(null)
    try {
      const result = await validateKeys(scraperKey.trim() || undefined, geminiKey.trim() || undefined, openrouterKey.trim() || undefined)
      setStatus(result)
      if (result.scraping.available) { saveKeys(scraperKey.trim(), geminiKey.trim(), openrouterKey.trim()); onKeysReady(scraperKey.trim(), geminiKey.trim(), openrouterKey.trim()) }
      else setError(friendlyUserError(result.scraping.error, 'setup'))
    } catch (err) { setError(friendlyUserError(err instanceof Error ? err.message : 'Validation failed', 'setup')) } finally { setValidating(false) }
  }

  return <div className="mx-auto w-full max-w-4xl"><div className="overflow-hidden rounded-[28px] border border-[#dfe1d8] bg-white/85 shadow-[0_22px_70px_rgba(36,45,26,0.1)]"><div className="border-b border-[#e6e8e0] bg-[#fbfbf8] px-5 py-4 sm:px-6"><div className="flex items-start gap-4"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#c9f36b] text-[#35530a]"><Key className="h-4 w-4" aria-hidden /></div><div><p className="eyebrow text-[#718239]">Session-only access</p><h2 className="mt-1 font-display text-2xl leading-none text-[#171a16]">API access</h2><p className="mt-1.5 text-sm leading-relaxed text-[#73786f]">Used only while you search; never stored on our servers.</p></div></div></div><div className="space-y-5 px-5 py-5 sm:px-6">{error && <div className="flex items-start gap-2.5 rounded-2xl border border-[#ebd5cd] bg-[#fff5f1] px-4 py-3"><XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#b25c43]" aria-hidden /><p className="text-sm leading-relaxed text-[#8e4937]">{error}</p></div>}{needsScraper && <KeyInput label="ScraperAPI key" id="scraperapi-key" value={scraperKey} onChange={setScraperKey} placeholder="your-scraperapi-key" helpUrl="https://www.scraperapi.com/" helpText="Fetches live listings from marketplaces." status={status ? (status.scraping.available ? 'ok' : 'error') : 'idle'} />}{needsGemini && <KeyInput label="Gemini API key (optional)" id="gemini-key" value={geminiKey} onChange={setGeminiKey} placeholder="your-gemini-api-key" helpUrl="https://aistudio.google.com/app/apikey" helpText="Generates grounded buying recommendations." status={status ? (status.ai.available ? 'ok' : 'error') : 'idle'} />}{needsOpenRouter && <KeyInput label="OpenRouter key (optional fallback)" id="openrouter-key" value={openrouterKey} onChange={setOpenrouterKey} placeholder="your-openrouter-key" helpUrl="https://openrouter.ai/keys" helpText="Optional fallback if Gemini is busy." status={status ? (status.alternative_ai.available ? 'ok' : (openrouterKey ? 'error' : 'idle')) : 'idle'} />}{status && <div className="space-y-2 rounded-2xl border border-[#e1e6d5] bg-[#f7faef] px-4 py-3"><div className="flex items-center gap-2 text-sm">{status.scraping.available ? <CheckCircle className="h-4 w-4 text-[#6c9a27]" /> : <XCircle className="h-4 w-4 text-[#b25c43]" />}<span className={status.scraping.available ? 'font-semibold text-[#55751f]' : 'text-[#9a503d]'}>Scraping: {status.scraping.available ? 'Working' : friendlyUserError(status.scraping.error, 'setup')}</span></div><div className="flex items-center gap-2 text-sm">{status.ai.available ? <CheckCircle className="h-4 w-4 text-[#6c9a27]" /> : <XCircle className="h-4 w-4 text-[#b68a31]" />}<span className={status.ai.available ? 'font-semibold text-[#55751f]' : 'text-[#9b762b]'}>Gemini: {status.ai.available ? 'Working' : friendlyUserError(status.ai.error || 'Not configured', 'ai')}</span></div>{needsOpenRouter && openrouterKey && <div className="flex items-center gap-2 text-sm">{status.alternative_ai.available ? <CheckCircle className="h-4 w-4 text-[#6c9a27]" /> : <XCircle className="h-4 w-4 text-[#b25c43]" />}<span className={status.alternative_ai.available ? 'font-semibold text-[#55751f]' : 'text-[#9a503d]'}>OpenRouter fallback: {status.alternative_ai.available ? 'Working' : friendlyUserError(status.alternative_ai.error || 'Unavailable', 'ai')}</span></div>}</div>}<button onClick={handleValidate} disabled={validating || (needsScraper && !scraperKey.trim())} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171a16] py-3.5 text-sm font-bold text-[#f5f4ef] transition hover:bg-[#303a27] disabled:cursor-not-allowed disabled:opacity-40">{validating ? <><Loader2 className="h-4 w-4 animate-spin" /> Validating…</> : <>Validate & continue <span aria-hidden>↗</span></>}</button><p className="text-center text-[11px] leading-relaxed text-[#9a9f95]">Close this tab to clear access.</p></div></div></div>
}
