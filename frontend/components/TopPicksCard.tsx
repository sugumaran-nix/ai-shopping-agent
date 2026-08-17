import { Sparkles } from 'lucide-react'
import type { Product } from '@/lib/api'
import { ProductCard } from './ProductCard'

export function TopPicksCard({ products, query }: { products: Product[]; query: string }) {
  if (products.length === 0) return null

  return (
    <section className="overflow-hidden rounded-[26px] border border-[#b8d16f] bg-[#f7faed] shadow-[0_18px_50px_rgba(137,173,53,0.1)]" aria-labelledby="top-picks-title">
      <div className="flex flex-col gap-3 border-b border-[#d7e4b5] bg-[#eff7d9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#171a16] text-[#c9f36b]"><Sparkles className="h-4 w-4" aria-hidden /></div><div><p className="eyebrow text-[#64832b]">Shortlist for “{query}”</p><h2 id="top-picks-title" className="mt-1 font-display text-2xl leading-none text-[#171a16]">Top 10 picks</h2></div></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#718239]">Comparable prices · sorted by value</p>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-5">{products.map((product, index) => <div key={`${product.source}-${product.url}-${index}`} className="relative"><span className="absolute left-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#171a16] px-1.5 text-[9px] font-black text-[#c9f36b]">{index + 1}</span><ProductCard product={product} isLowestPrice={index === 0} showSource /></div>)}</div>
    </section>
  )
}
