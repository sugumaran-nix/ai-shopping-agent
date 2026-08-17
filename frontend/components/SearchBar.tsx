'use client'

import { useRef } from 'react'
import { ArrowUpRight, Loader2, Search } from 'lucide-react'

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
    <div className="mx-auto w-full max-w-3xl">
      <div className="group flex items-center gap-2 rounded-[22px] border border-[#cfd4c5] bg-white/85 p-2 shadow-[0_16px_40px_rgba(44,52,31,0.09)] backdrop-blur transition-all duration-300 focus-within:border-[#9abb4d] focus-within:shadow-[0_18px_50px_rgba(137,173,53,0.17)]">
        <label htmlFor="search-input" className="sr-only">Search for a product</label>
        <div className="ml-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f0f3e9] text-[#657258]" aria-hidden>
          <Search className="h-4 w-4" />
        </div>
        <input
          id="search-input"
          ref={inputRef}
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          disabled={loading}
          placeholder="Search a product, model, or category"
          autoFocus
          maxLength={200}
          className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[15px] font-medium text-[#171a16] outline-none placeholder:text-[#a0a59a] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={loading || value.trim().length < 2}
          className="focus-ring flex items-center gap-2 rounded-[16px] bg-[#171a16] px-5 py-3 text-sm font-bold text-[#f5f4ef] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#303a27] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:px-6"
          aria-label={loading ? 'Searching…' : 'Search'}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowUpRight className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{loading ? 'Searching…' : 'Find prices'}</span>
        </button>
      </div>
      {value.trim().length > 0 && value.trim().length < 2 && (
        <p className="mt-2 pl-4 text-xs font-semibold text-[#b16c18]" role="alert">
          Add one more character to start searching.
        </p>
      )}
      <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9f95]">
        Enter to search · Real listings · No sponsored rankings
      </p>
    </div>
  )
}
