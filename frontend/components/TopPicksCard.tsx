import { useMemo, useState } from 'react'
import { ListFilter, Sparkles } from 'lucide-react'
import type { Product } from '@/lib/api'
import { ProductCard } from './ProductCard'

type TopPickSort = 'overall' | 'rating' | 'price' | 'reviews'

const FILTERS: { key: TopPickSort; label: string }[] = [
  { key: 'overall', label: 'Overall best' },
  { key: 'rating', label: 'Top rated' },
  { key: 'price', label: 'Best price' },
  { key: 'reviews', label: 'Most reviewed' },
]

function queryRelevance(product: Product, query: string): number {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 1)
  if (terms.length === 0) return 0.5
  const title = product.title.toLowerCase()
  return terms.filter(term => title.includes(term) || (term.endsWith('s') && title.includes(term.slice(0, -1)))).length / terms.length
}

function ratingStrength(product: Product): number {
  if (product.rating === null) return 0
  const rating = product.rating / 5
  const reviewConfidence = Math.min(1, Math.log10((product.review_count ?? 0) + 1) / 4)
  return rating * (0.7 + reviewConfidence * 0.3)
}

export function rankTopPicks(products: Product[], query: string, sort: TopPickSort = 'overall'): Product[] {
  const prices = products.map(product => product.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = Math.max(1, maxPrice - minPrice)

  return [...products].sort((a, b) => {
    if (sort === 'price') return a.price - b.price || (b.rating ?? 0) - (a.rating ?? 0)
    if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0) || (b.review_count ?? 0) - (a.review_count ?? 0)
    if (sort === 'reviews') return (b.review_count ?? 0) - (a.review_count ?? 0) || (b.rating ?? 0) - (a.rating ?? 0)

    const score = (product: Product) => {
      const relevance = queryRelevance(product, query)
      const rating = ratingStrength(product)
      const affordability = 1 - (product.price - minPrice) / priceRange
      return relevance * 0.4 + rating * 0.45 + affordability * 0.15
    }
    return score(b) - score(a) || (b.rating ?? 0) - (a.rating ?? 0) || a.price - b.price
  })
}

export function TopPicksCard({ products, query }: { products: Product[]; query: string }) {
  const [sort, setSort] = useState<TopPickSort>('overall')
  const ranked = useMemo(() => rankTopPicks(products, query, sort).slice(0, 10), [products, query, sort])
  if (ranked.length === 0) return null

  const activeLabel = FILTERS.find(filter => filter.key === sort)?.label ?? 'Overall best'

  return (
    <section className="overflow-hidden rounded-[26px] border border-[#b8d16f] bg-[#f7faed] shadow-[0_18px_50px_rgba(137,173,53,0.1)]" aria-labelledby="top-picks-title">
      <div className="border-b border-[#d7e4b5] bg-[#eff7d9] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#171a16] text-[#c9f36b]"><Sparkles className="h-4 w-4" aria-hidden /></div><div><p className="eyebrow text-[#64832b]">Ranked shortlist for “{query}”</p><h2 id="top-picks-title" className="mt-1 font-display text-2xl leading-none text-[#171a16]">Top 10 picks</h2></div></div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rank Top 10 picks"><ListFilter className="mr-1 h-3.5 w-3.5 text-[#718239]" aria-hidden />{FILTERS.map(filter => <button key={filter.key} type="button" onClick={() => setSort(filter.key)} aria-pressed={sort === filter.key} className={`focus-ring rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition-all ${sort === filter.key ? 'border-[#b8d16f] bg-[#c9f36b] text-[#35530a]' : 'border-[#c7d8a2] bg-transparent text-[#718239] hover:bg-white/70'}`}>{filter.label}</button>)}</div>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-5">{ranked.map((product, index) => <div key={`${product.source}-${product.url}-${index}`} className="relative"><span className="absolute left-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#171a16] px-1.5 text-[9px] font-black text-[#c9f36b]" aria-label={`Rank ${index + 1}`}>{index + 1}</span><ProductCard product={product} isBestPick={index === 0} showSource /></div>)}</div>
      <p className="border-t border-[#d7e4b5] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#718239]">{activeLabel} uses ratings, review confidence, relevance, and price context. Open a product to verify delivery and availability.</p>
    </section>
  )
}
