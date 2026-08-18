'use client'

import { useMemo, useRef, useState } from 'react'
import { ArrowUpRight, ChevronRight, Loader2, Search, Sparkles } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSearch: (q: string) => void
  loading: boolean
  compact?: boolean
  onNewSearch?: () => void
}

const SUGGESTIONS = [
  'wireless mouse for work',
  'running shoes under ₹2000',
  'bluetooth earbuds with noise cancellation',
  'cotton kurti for women',
  'iPhone 15 best price',
  'laptop stand for desk setup',
  'office chair under ₹10000',
  'best power bank for travel',
  'mechanical keyboard for coding',
  'waterproof backpack for college',
  'smartwatch with good battery life',
  'air fryer for a small family',
]

export function SearchBar({ value, onChange, onSearch, loading, compact = false, onNewSearch }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const trimmedValue = value.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!trimmedValue) return []
    const matching = SUGGESTIONS.filter(item => item.toLowerCase().includes(trimmedValue))
    return matching.length > 0 ? matching.slice(0, 5) : SUGGESTIONS.filter(item => item.toLowerCase().split(' ').some(word => word.startsWith(trimmedValue))).slice(0, 5)
  }, [trimmedValue])

  const submit = (nextValue = value) => {
    const q = nextValue.trim()
    if (q.length >= 2) onSearch(q)
    else inputRef.current?.focus()
  }

  const showSuggestions = focused && !loading && value.trim().length > 0 && suggestions.length > 0

  return (
    <div className={`relative mx-auto w-full ${compact ? 'max-w-none' : 'max-w-3xl'}`}>
      <div className={`group flex items-center gap-2 border border-[#cfd4c5] bg-white/85 backdrop-blur transition-all duration-300 focus-within:border-[#9abb4d] focus-within:shadow-[0_18px_50px_rgba(137,173,53,0.17)] ${compact ? 'rounded-[18px] p-1.5 shadow-[0_8px_24px_rgba(44,52,31,0.07)]' : 'rounded-[22px] p-2 shadow-[0_16px_40px_rgba(44,52,31,0.09)]'}`}>
        <label htmlFor={compact ? 'search-input-results' : 'search-input'} className="sr-only">Search for a product</label>
        <div className={`${compact ? 'ml-2 h-8 w-8' : 'ml-3 h-10 w-10'} flex flex-shrink-0 items-center justify-center rounded-full bg-[#f0f3e9] text-[#657258]`} aria-hidden>
          <Search className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </div>
        <input
          id={compact ? 'search-input-results' : 'search-input'}
          ref={inputRef}
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 140)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') { setFocused(false); inputRef.current?.blur() }
          }}
          disabled={loading}
          placeholder={compact ? 'Search another product…' : 'Search a product, model, or category'}
          autoFocus={!compact}
          maxLength={200}
          className={`min-w-0 flex-1 bg-transparent px-2 font-medium text-[#171a16] outline-none placeholder:text-[#a0a59a] disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'py-2 text-sm' : 'py-3 text-[15px]'}`}
        />
        {compact && onNewSearch && <button onClick={onNewSearch} className="focus-ring hidden rounded-xl border border-[#dfe1d8] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#73786f] transition hover:border-[#b7c19e] hover:bg-[#f0f5e4] hover:text-[#4e6d19] sm:block">New search</button>}
        <button onClick={() => submit()} disabled={loading || value.trim().length < 2} className={`focus-ring flex items-center gap-2 rounded-[14px] bg-[#171a16] font-bold text-[#f5f4ef] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#303a27] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${compact ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm sm:px-6'}`} aria-label={loading ? 'Searching…' : 'Search'}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowUpRight className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{loading ? 'Searching…' : compact ? 'Search' : 'Find prices'}</span>
        </button>
      </div>

      {showSuggestions && <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[20px] border border-[#dfe1d8] bg-[#fbfbf8] p-2 shadow-[0_18px_45px_rgba(35,44,25,0.14)]" role="listbox" aria-label="Related searches"><div className="flex items-center gap-2 px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9a9f95]"><Sparkles className="h-3.5 w-3.5 text-[#88a942]" /> Related searches</div>{suggestions.map(suggestion => <button key={suggestion} type="button" role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(suggestion); submit(suggestion) }} className="focus-ring flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#5f665b] transition hover:bg-[#eff7d9] hover:text-[#35530a]"><span className="flex min-w-0 items-center gap-2"><Search className="h-3.5 w-3.5 flex-shrink-0 text-[#a5ad99]" /><span className="truncate">{suggestion}</span></span><ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[#b3b9aa]" /></button>)}</div>}
      {value.trim().length > 0 && value.trim().length < 2 && <p className="mt-2 pl-4 text-xs font-semibold text-[#b16c18]" role="alert">Add one more character to start searching.</p>}
      {!compact && <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9f95]">Enter to search · Real listings · No sponsored rankings</p>}
    </div>
  )
}
