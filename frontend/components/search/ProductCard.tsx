"use client";

import { motion } from "framer-motion";
import { Star, ExternalLink, TrendingDown } from "lucide-react";
import { Product } from "@/types";
import { formatPrice, truncate } from "@/lib/utils";
import { SITE_META } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  index: number;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop";

export default function ProductCard({ product, index }: ProductCardProps) {
  const meta   = SITE_META[product.site] ?? { label: product.site, color: "#888", bg: "rgba(136,136,136,0.1)" };
  const imgSrc = product.image_url || PLACEHOLDER;

  const savings = product.original_price && product.original_price > product.price
    ? product.original_price - product.price
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.38 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col group"
      aria-label={`${product.title} — ${formatPrice(product.price)} on ${meta.label}`}
    >
      {/* Image — aspect-square keeps all product types consistent */}
      <div className="relative aspect-square overflow-hidden bg-white/[0.03]">
        <img
          src={imgSrc}
          alt={truncate(product.title, 60)}
          className="w-full h-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
          loading="lazy"
          decoding="async"
        />

        {/* Platform badge */}
        <div
          className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold leading-none"
          style={{
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.color}35`,
          }}
        >
          {meta.label}
        </div>

        {/* Discount badge */}
        {product.discount != null && product.discount > 0 && (
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
            style={{
              background: "rgba(5,150,105,0.18)",
              color: "#34D399",
              border: "1px solid rgba(52,211,153,0.28)",
            }}
          >
            <TrendingDown className="w-3 h-3" />
            {product.discount}% off
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <p
          className="text-sm font-medium leading-snug mb-3 line-clamp-2"
          style={{ color: "var(--text-primary)" }}
          title={product.title}
        >
          {product.title}
        </p>

        {/* Price row */}
        <div className="flex items-baseline gap-2 flex-wrap mb-2">
          <span className="text-xl font-black gradient-text">{formatPrice(product.price)}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs line-through" style={{ color: "var(--text-muted)" }}>
              {formatPrice(product.original_price)}
            </span>
          )}
          {savings && (
            <span className="text-xs font-semibold" style={{ color: "#34D399" }}>
              save {formatPrice(savings)}
            </span>
          )}
        </div>

        {/* Rating */}
        {product.rating != null && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-0.5" aria-label={`${product.rating.toFixed(1)} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="w-3 h-3"
                  fill={s <= Math.round(product.rating!) ? "#F59E0B" : "transparent"}
                  style={{ color: "#F59E0B" }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {product.rating.toFixed(1)}
              {product.reviews ? ` · ${product.reviews.toLocaleString("en-IN")} reviews` : ""}
            </span>
          </div>
        )}

        {/* CTA — always white text for legibility */}
        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${truncate(product.title, 45)} on ${meta.label} (opens in new tab)`}
          className="mt-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-88 hover:scale-[1.015]"
          style={{
            background: `${meta.color}20`,
            border: `1px solid ${meta.color}55`,
            color: "#fff",
          }}
        >
          View on {meta.label}
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </motion.article>
  );
}
