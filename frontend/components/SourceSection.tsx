'use client'
import { useState } from 'react'
import type { SourceResult } from '@/lib/api'
import { SOURCE_META } from '@/lib/api'
import { StatusBadge } from './StatusBadge'
import { ProductCard } from './ProductCard'

const PAGE_SIZE = 5

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'rating'

function sortProducts(products: SourceResult['products'], key: SortKey) {
  const copy = [...products]
  switch (key) {
    case 'price_asc':  return copy.sort((a, b) => a.price - b.price)
    case 'price_desc': return copy.sort((a, b) => b.price - a.price)
    case 'rating':     return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    default:           return copy
  }
}

export function SourceSection({ result }: { result: SourceResult }) {
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState<SortKey>('default')

  const { label, color, accent } = SOURCE_META[result.source]
  const sorted = sortProducts(result.products, sort)
  const visible = expanded ? sorted : sorted.slice(0, PAGE_SIZE)
  const hasMore = result.products.length > PAGE_SIZE

  return (
    <section
      className={`rounded-2xl border p-4 ${color}`}
      aria-labelledby={`source-heading-${result.source}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 id={`source-heading-${result.source}`}
            className={`font-semibold ${accent}`}>
          {label}
        </h2>
        <div className="flex items-center gap-2">
          {result.products.length > 0 && (
            <span className="text-xs text-gray-400">{result.products.length}</span>
          )}
          <StatusBadge status={result.status} />
        </div>
      </div>

      {/* Sort controls — only show when there's something to sort */}
      {result.products.length > 1 && (
        <div className="flex gap-1 mb-3 flex-wrap">
          {([
            ['default',    'Relevance'],
            ['price_asc',  '↑ Price'],
            ['price_desc', '↓ Price'],
            ['rating',     '⭐ Rating'],
          ] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors
                ${sort === key
                  ? 'bg-white border-gray-400 text-gray-900 font-medium shadow-sm'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/60'
                }`}
              aria-pressed={sort === key}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      {visible.length > 0 ? (
        <div className="space-y-2">
          {visible.map((product, i) => (
            <ProductCard key={`${product.url}-${i}`} product={product} />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">
            {result.status === 'unavailable'
              ? (result.error ?? 'This source is currently unavailable.')
              : 'No results found for this query.'}
          </p>
        </div>
      )}

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="mt-3 w-full text-xs text-gray-500 hover:text-gray-700 font-medium
                     py-1.5 rounded-lg hover:bg-white/60 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {expanded
            ? '▲ Show fewer'
            : `▼ Show all ${result.products.length} results`}
        </button>
      )}
    </section>
  )
}
