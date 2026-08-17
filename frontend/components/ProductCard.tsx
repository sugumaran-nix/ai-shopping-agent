import Image from 'next/image'
import { ArrowUpRight, ShoppingBag, Star } from 'lucide-react'
import type { Product } from '@/lib/api'
import { formatPrice } from '@/lib/api'

export function ProductCard({ product }: { product: Product }) {
  const price = formatPrice(product.price, product.currency)
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-[18px] border border-[#e5e7df] bg-white/85 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd48a] hover:bg-white hover:shadow-[0_10px_28px_rgba(42,53,25,0.08)] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9bc64c] focus-visible:ring-offset-2"
      aria-label={`${product.title}, ${price} — opens in new tab`}
    >
      <div className="relative h-[68px] w-[68px] flex-shrink-0 overflow-hidden rounded-[14px] border border-[#eceee8] bg-[#f8f8f4]">
        {product.image_url ? <Image src={product.image_url} alt="" fill sizes="68px" className="object-contain p-1 transition-transform duration-300 group-hover:scale-105" unoptimized /> : <div className="flex h-full w-full items-center justify-center text-[#c3c8bd]"><ShoppingBag className="h-6 w-6" aria-hidden /></div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <p className="line-clamp-2 text-xs font-bold leading-snug text-[#343a31] transition-colors group-hover:text-[#4e6d19]">{product.title}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div><p className="text-base font-black tabular-nums tracking-[-0.03em] text-[#171a16]">{price}</p>{product.rating !== null && <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[#92988e]"><Star className="h-3 w-3 fill-[#e3aa43] text-[#e3aa43]" aria-hidden /><span aria-label={`${product.rating} out of 5 stars`}>{product.rating.toFixed(1)}</span>{product.review_count !== null && <span className="text-[#b6bbb1]">({product.review_count.toLocaleString('en-IN')})</span>}</p>}</div>
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#e2e5dc] text-[#a4aa9e] transition-all group-hover:border-[#b8d16f] group-hover:bg-[#eff7d9] group-hover:text-[#4e6d19]"><ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></span>
        </div>
      </div>
    </a>
  )
}
