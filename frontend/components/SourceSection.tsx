'use client'
import { useState } from 'react'
import type { SourceResult, SortKey } from '@/lib/api'
import { SOURCE_META, sortProducts } from '@/lib/api'
import { StatusBadge } from './StatusBadge'
import { ProductCard } from './ProductCard'

const PAGE_SIZE = 5

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',    label: 'Best match' },
  { key: 'price_asc',  label: '↑ Price'   },
  { key: 'price_desc', label: '↓ Price'   },
  { key: 'rating',     label: '★ Rating'  },
]

export function SourceSection({ result }: { result: SourceResult }) {
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState<SortKey>('default')

  const meta = SOURCE_META[result.source]
  const sorted = sortProducts(result.products, sort)
  const visible = expanded ? sorted : sorted.slice(0, PAGE_SIZE)
  const hasMore = sorted.length > PAGE_SIZE

  return (
    <section className={`rounded-2xl border overflow-hidden ${meta.color}`}
             aria-labelledby={`src-${result.source}`}>

      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${meta.headerColor}`}>
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>{meta.logo}</span>
          <h2 id={`src-${result.source}`} className={`font-semibold text-sm ${meta.accent}`}>
            {meta.label}
          </h2>
          {result.products.length > 0 && (
            <span className="text-xs text-gray-500 font-normal">
              {result.products.length} result{result.products.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <StatusBadge status={result.status} />
      </div>

      <div className="p-3">
        {/* Sort pills — only when multiple products */}
        {result.products.length > 1 && (
          <div className="flex gap-1 mb-2 flex-wrap" role="group" aria-label="Sort results">
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

        {/* Product list */}
        {visible.length > 0 ? (
          <div className="space-y-2">
            {visible.map((product, i) => (
              <ProductCard key={`${result.source}-${i}`} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2" aria-hidden>
              {result.status === 'unavailable' ? '🔌' : '🔍'}
            </p>
            <p className="text-sm font-medium text-gray-500">
              {result.status === 'unavailable' ? 'Source unavailable' : 'No results found'}
            </p>
            {result.error && (
              <p className="text-xs text-gray-400 mt-1 px-2 leading-relaxed">
                {result.error}
              </p>
            )}
          </div>
        )}

        {/* Show more / less */}
        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            className="mt-2 w-full py-2 text-xs font-medium text-gray-500
                       hover:text-blue-600 rounded-lg hover:bg-white/70
                       transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {expanded
              ? '▲ Show fewer'
              : `▼ Show all ${sorted.length} results`}
          </button>
        )}
      </div>
    </section>
  )
}
