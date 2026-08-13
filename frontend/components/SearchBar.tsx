'use client'
import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  loading?: boolean
}

export function SearchBar({ value, onChange, onSearch, loading = false }: Props) {
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const q = value.trim()
    if (q.length < 2) {
      setError('Please enter at least 2 characters.')
      return
    }
    setError('')
    onSearch(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-1">
      <div className="flex gap-2">
        <label htmlFor="search-input" className="sr-only">Search for a product</label>
        <input
          id="search-input"
          type="search"
          value={value}
          onChange={e => { onChange(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="e.g. wireless mouse, running shoes, bluetooth earbuds"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white
                     text-gray-900 placeholder-gray-400 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Product search"
          aria-describedby={error ? 'search-error' : undefined}
          aria-invalid={!!error}
          maxLength={200}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary whitespace-nowrap"
          aria-label={loading ? 'Searching…' : 'Search'}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Searching
            </span>
          ) : 'Search'}
        </button>
      </div>
      {error && (
        <p id="search-error" className="text-xs text-red-600 pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
