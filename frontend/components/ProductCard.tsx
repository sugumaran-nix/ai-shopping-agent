import { Star } from "lucide-react";
import type { Product } from "@/lib/api";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card rounded-2xl p-4 flex flex-col gap-2 group"
    >
      <div className="aspect-square w-full rounded-xl bg-white/5 overflow-hidden flex items-center justify-center">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-[color:var(--text-muted)]">No image</span>
        )}
      </div>

      <p className="text-sm line-clamp-2 text-[color:var(--text-primary)]">{product.title}</p>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-gradient-price font-bold text-lg">
          {product.currency} {product.price.toLocaleString()}
        </span>
        {product.rating != null && (
          <span className="flex items-center gap-1 text-xs text-[color:var(--text-secondary)]">
            <Star size={12} fill="currentColor" />
            {product.rating.toFixed(1)}
            {product.review_count != null && (
              <span className="text-[color:var(--text-muted)]">({product.review_count})</span>
            )}
          </span>
        )}
      </div>
    </a>
  );
}
