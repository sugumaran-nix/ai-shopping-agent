import Image from 'next/image'
import type { Product } from '@/lib/api'
import { formatPrice } from '@/lib/api'

export function ProductCard({ product, rank }: { product: Product; rank?: number }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card flex gap-3 p-3 group focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`${product.title} — ${formatPrice(product.price, product.currency)}. Opens in new tab.`}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-blue-600 text-white
                        text-[10px] font-bold flex items-center justify-center shadow">
          {rank}
        </div>
      )}

      {/* Image */}
      <div className="relative flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt=""
            fill
            sizes="64px"
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl"
               aria-hidden>
            🛍
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2
                      group-hover:text-blue-600 transition-colors leading-snug">
          {product.title}
        </p>
        <p className="mt-1 text-base font-bold text-gray-900 tabular-nums">
          {formatPrice(product.price, product.currency)}
        </p>
        {product.rating !== null && (
          <p className="mt-0.5 text-xs text-gray-500">
            <span aria-label={`${product.rating} out of 5 stars`}>
              ⭐ {product.rating.toFixed(1)}
            </span>
            {product.review_count !== null && (
              <span className="ml-1 text-gray-400">
                ({product.review_count.toLocaleString('en-IN')} reviews)
              </span>
            )}
          </p>
        )}
      </div>

      {/* External link indicator */}
      <div className="self-center flex-shrink-0 text-gray-300 group-hover:text-blue-400
                      transition-colors" aria-hidden>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </div>
    </a>
  )
}
