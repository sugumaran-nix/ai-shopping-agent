import Image from 'next/image'
import type { Product } from '@/lib/api'
import { formatPrice } from '@/lib/api'

export function ProductCard({ product }: { product: Product }) {
  const price = formatPrice(product.price, product.currency)

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3 rounded-xl bg-white border border-gray-100
                 hover:border-blue-200 hover:shadow-md active:scale-[0.99]
                 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`${product.title}, ${price} — opens in new tab`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg bg-gray-50
                      border border-gray-100 overflow-hidden">
        {product.image_url ? (
          <Image src={product.image_url} alt="" fill sizes="64px"
                 className="object-contain p-0.5" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-gray-200"
               aria-hidden>📦</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <p className="text-xs text-gray-800 font-medium line-clamp-2 leading-snug
                      group-hover:text-blue-700 transition-colors">
          {product.title}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-gray-900 tabular-nums">{price}</p>
            {product.rating !== null && (
              <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                ⭐ {product.rating.toFixed(1)}
                {product.review_count !== null && (
                  <span className="ml-1">({product.review_count.toLocaleString('en-IN')})</span>
                )}
              </p>
            )}
          </div>
          <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0
                          transition-colors mb-0.5"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </div>
      </div>
    </a>
  )
}
