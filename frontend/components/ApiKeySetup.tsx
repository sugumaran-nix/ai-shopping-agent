'use client'
import { useState } from 'react'
import { Key, ExternalLink, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { validateKeys, type KeyStatus } from '@/lib/api'
import { saveKeys } from '@/lib/keys'

interface Props {
  onKeysReady: (scraperKey: string, geminiKey: string) => void
  needsScraper: boolean
  needsGemini: boolean
  initialError?: string
}

function KeyInput({
  label,
  id,
  value,
  onChange,
  placeholder,
  helpUrl,
  helpText,
  status,
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  helpUrl: string
  helpText: string
  status: 'idle' | 'ok' | 'error'
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          Get free key <ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 pr-20 rounded-xl border text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     transition-colors
                     border-gray-300 bg-white text-gray-900 placeholder-gray-400"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
          {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400">{helpText}</p>
    </div>
  )
}

export function ApiKeySetup({ onKeysReady, needsScraper, needsGemini, initialError }: Props) {
  const [scraperKey, setScraperKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [error, setError] = useState(initialError || '')

  const handleValidate = async () => {
    if (needsScraper && !scraperKey.trim()) {
      setError('Please enter your ScraperAPI key')
      return
    }
    setValidating(true)
    setError('')
    setStatus(null)
    try {
      const result = await validateKeys(
        scraperKey.trim() || undefined,
        geminiKey.trim() || undefined,
      )
      setStatus(result)

      // If scraping is available (which is the minimum), let them proceed
      if (result.scraping.available) {
        saveKeys(scraperKey.trim(), geminiKey.trim())
        onKeysReady(scraperKey.trim(), geminiKey.trim())
      } else {
        setError(result.scraping.error || 'ScraperAPI key is invalid')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Key className="w-5 h-5 text-blue-600" aria-hidden />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">API Keys Required</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              The search service needs API keys to work. Both are free.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {needsScraper && (
            <KeyInput
              label="ScraperAPI Key"
              id="scraperapi-key"
              value={scraperKey}
              onChange={setScraperKey}
              placeholder="your-scraperapi-key"
              helpUrl="https://www.scraperapi.com/"
              helpText="Free — 1,000 requests/month. Used to fetch product prices from marketplaces."
              status={status ? (status.scraping.available ? 'ok' : 'error') : 'idle'}
            />
          )}

          {needsGemini && (
            <KeyInput
              label="Gemini API Key (optional)"
              id="gemini-key"
              value={geminiKey}
              onChange={setGeminiKey}
              placeholder="your-gemini-api-key"
              helpUrl="https://aistudio.google.com/app/apikey"
              helpText="Free — unlimited for personal use. Used for AI buying recommendations. You can skip this."
              status={status ? (status.ai.available ? 'ok' : 'error') : 'idle'}
            />
          )}

          {status && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {status.scraping.available
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <XCircle className="w-4 h-4 text-red-400" />}
                <span className={status.scraping.available ? 'text-green-700' : 'text-red-600'}>
                  Scraping: {status.scraping.available ? 'Working' : status.scraping.error}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {status.ai.available
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <XCircle className="w-4 h-4 text-amber-400" />}
                <span className={status.ai.available ? 'text-green-700' : 'text-amber-600'}>
                  AI: {status.ai.available ? 'Working' : (status.ai.error || 'Not configured')}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleValidate}
            disabled={validating || (needsScraper && !scraperKey.trim())}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                       text-sm rounded-xl transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed flex items-center justify-center gap-2
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {validating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Validating…</>
            ) : (
              'Validate & Continue'
            )}
          </button>

          <p className="text-xs text-center text-gray-400">
            Keys are stored in your browser session only — never sent to third parties.
            They clear when you close the tab.
          </p>
        </div>
      </div>
    </div>
  )
}
