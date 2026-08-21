'use client'

import { useMemo, useState } from 'react'
import { SearchX, SlidersHorizontal, WifiOff } from 'lucide-react'
import type { Product, SourceResult, SortKey } from '@/lib/api'
import { friendlySourceError, SOURCE_META, sortProducts } from '@/lib/api'
import { SourceIcon } from './SourceIcon'
import { StatusBadge } from './StatusBadge'
import { ProductCard } from './ProductCard'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Best match' },
  { key: 'price_asc', label: 'Low price' },
  { key: 'price_desc', label: 'High price' },
  { key: 'rating', label: 'Top rated' },
]

export function SourceSection({ result, bestProduct }: { result: SourceResult; bestProduct?: Product }) {
  const [sort, setSort] = useState<SortKey>('default')
  const meta = SOURCE_META[result.source]
  const sorted = useMemo(() => sortProducts(result.products, sort), [result.products, sort])

  return (
    <section className={`overflow-hidden rounded-[24px] border border-[#dfe1d8] bg-white/65 ${meta.color}`} aria-labelledby={`src-${result.source}`}>
      <div className="flex items-start justify-between gap-3 border-b border-[#dfe1d8]/80 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-white shadow-sm"><SourceIcon source={result.source} className="h-4 w-4" /></div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id={`src-${result.source}`} className={`truncate text-sm font-bold ${meta.accent}`}>{meta.label}</h2>{result.products.length > 0 && <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a0a59a]">{result.products.length} result{result.products.length !== 1 ? 's' : ''}</span>}</div><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a0a59a]">Marketplace signal</p></div>
        </div>
        <StatusBadge status={result.status} />
      </div>

      <div className="p-3 sm:p-4">
        {result.products.length > 1 && <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={`Filter ${meta.label} results by price or rating`}><SlidersHorizontal className="mr-1 h-3.5 w-3.5 text-[#9ca399]" aria-hidden /><span className="mr-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#a0a59a]">Filter</span>{SORT_OPTIONS.map(opt => <button key={opt.key} onClick={() => setSort(opt.key)} aria-pressed={sort === opt.key} className={`focus-ring min-h-9 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition-all ${sort === opt.key ? 'border-[#b8d16f] bg-[#eff7d9] text-[#4e6d19]' : 'border-[#dfe1d8] bg-transparent text-[#858a81] hover:border-[#c7d3ac] hover:text-[#4e6d19]'}`}>{opt.label}</button>)}</div>}

        {sorted.length > 0 ? <><div className="source-products-scroll grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label={`${meta.label} product results`}>{sorted.map((product, i) => <ProductCard key={`${result.source}-${i}`} product={product} isBestPick={product === bestProduct} />)}</div>{sorted.length > 10 && <p className="source-scroll-hint" aria-hidden="true"><span>Scroll inside this card for more results</span><span className="source-scroll-arrow">↓</span></p>}</> : <div className="space-y-3 py-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f1ec] text-[#a4a99f]">{result.status === 'unavailable' ? <WifiOff className="h-5 w-5" aria-hidden /> : <SearchX className="h-5 w-5" aria-hidden />}</div><p className="text-sm font-bold text-[#73786f]">{result.status === 'unavailable' ? 'Source unavailable' : 'No results found'}</p><p className="px-2 text-xs leading-relaxed text-[#9a9f95]">{friendlySourceError(result.status, result.error)}</p></div>}
      </div>
    </section>
  )
}
