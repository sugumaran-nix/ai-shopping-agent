'use client'
import { useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSearch: (q: string) => void
  loading: boolean
}

export function SearchBar({ value, onChange, onSearch, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const q = value.trim()
    if (q.length >= 2) onSearch(q)
    else inputRef.current?.focus()
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 items-stretch">
        <label htmlFor="search-input" className="sr-only">Search for a product</label>
        <input
          id="search-input"
          ref={inputRef}
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          disabled={loading}
          placeholder="e.g. wireless mouse, running shoes, iPhone 15..."
          autoFocus
          maxLength={200}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white
                     text-gray-900 placeholder-gray-400 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
                     transition-colors"
        />
        <button
          onClick={submit}
          disabled={loading || value.trim().length < 2}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     text-white font-semibold text-sm rounded-xl shadow-sm
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     transition-colors whitespace-nowrap flex items-center gap-2"
          aria-label={loading ? 'Searching…' : 'Search'}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Searching…</>
            : <><Search className="w-4 h-4" aria-hidden /> Search</>
          }
        </button>
      </div>
      {value.trim().length > 0 && value.trim().length < 2 && (
        <p className="mt-1 text-xs text-amber-600 pl-1" role="alert">
          Enter at least 2 characters
        </p>
      )}
    </div>
  )
}
