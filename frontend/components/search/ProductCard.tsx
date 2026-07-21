"use client";

import { motion } from "framer-motion";
import Image from "next/image";
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
  const meta    = SITE_META[product.site] || { label: product.site, color: "#888", bg: "rgba(136,136,136,0.1)" };
  const imgSrc  = product.image_url || PLACEHOLDER;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="glass glass-hover rounded-2xl overflow-hidden flex flex-col group"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-white/5">
        <Image
          src={imgSrc}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
        />

        {/* Site badge */}
        <div
          className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold z-10"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
        >
          {meta.label}
        </div>

        {/* Discount badge */}
        {product.discount && product.discount > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 z-10"
            style={{ background: "rgba(5,150,105,0.2)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
            <TrendingDown className="w-3 h-3" />
            {product.discount}% off
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
          {truncate(product.title, 80)}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-black gradient-text">
            {formatPrice(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star
                  key={s}
                  className="w-3 h-3"
                  fill={s <= Math.round(product.rating!) ? "#F59E0B" : "transparent"}
                  style={{ color: "#F59E0B" }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {product.rating.toFixed(1)}
              {product.reviews ? ` (${product.reviews.toLocaleString("en-IN")})` : ""}
            </span>
          </div>
        )}

        {/* CTA */}
        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.01] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]"
          style={{ background: meta.color }}
        >
          View on {meta.label}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
