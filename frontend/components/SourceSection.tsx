'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal, WifiOff, SearchX } from 'lucide-react'
import type { SourceResult, SortKey } from '@/lib/api'
import { SOURCE_META, sortProducts } from '@/lib/api'
import { SourceIcon } from './SourceIcon'
import { StatusBadge } from './StatusBadge'
import { ProductCard } from './ProductCard'

const PAGE_SIZE = 5

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',    label: 'Best match' },
  { key: 'price_asc',  label: '↑ Price'   },
  { key: 'price_desc', label: '↓ Price'   },
  { key: 'rating',     label: 'Top rated' },
]

export function SourceSection({ result }: { result: SourceResult }) {
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState<SortKey>('default')

  const meta = SOURCE_META[result.source]
  const sorted = sortProducts(result.products, sort)
  const visible = expanded ? sorted : sorted.slice(0, PAGE_SIZE)
  const hasMore = sorted.length > PAGE_SIZE

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${meta.color}`}
      aria-labelledby={`src-${result.source}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${meta.headerColor}`}>
        <div className="flex items-center gap-2">
          <SourceIcon source={result.source} className="w-4 h-4" />
          <h2
            id={`src-${result.source}`}
            className={`font-semibold text-sm ${meta.accent}`}
          >
            {meta.label}
          </h2>
          {result.products.length > 0 && (
            <span className="text-xs text-gray-400 font-normal">
              {result.products.length} result{result.products.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <StatusBadge status={result.status} />
      </div>

      <div className="p-3">
        {/* Sort controls */}
        {result.products.length > 1 && (
          <div
            className="flex items-center gap-1 mb-2 flex-wrap"
            role="group"
            aria-label="Sort results"
          >
            <SlidersHorizontal className="w-3 h-3 text-gray-400 mr-0.5 flex-shrink-0" aria-hidden />
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                aria-pressed={sort === opt.key}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all
                  ${sort === opt.key
                    ? 'bg-white border-blue-400 text-blue-700 shadow-sm'
                    : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Products or empty state */}
        {visible.length > 0 ? (
          <div className="space-y-2">
            {visible.map((product, i) => (
              <ProductCard key={`${result.source}-${i}`} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <div className="flex justify-center">
              {result.status === 'unavailable'
                ? <WifiOff className="w-8 h-8 text-gray-300" aria-hidden />
                : <SearchX className="w-8 h-8 text-gray-300" aria-hidden />
              }
            </div>
            <p className="text-sm font-medium text-gray-500">
              {result.status === 'unavailable' ? 'Source unavailable' : 'No results found'}
            </p>
            {result.error && (
              <p className="text-xs text-gray-400 px-2 leading-relaxed">{result.error}</p>
            )}
          </div>
        )}

        {/* Show more / less */}
        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            className="mt-2 w-full py-2 flex items-center justify-center gap-1.5
                       text-xs font-medium text-gray-500 hover:text-blue-600
                       rounded-lg hover:bg-white/70 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" aria-hidden /> Show fewer</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" aria-hidden /> Show all {sorted.length} results</>
            )}
          </button>
        )}
      </div>
    </section>
  )
}
