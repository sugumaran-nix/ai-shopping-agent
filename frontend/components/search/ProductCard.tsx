"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, ExternalLink, ShoppingCart, ImageOff } from "lucide-react";
import type { FlatProduct, Source } from "@/types";
import { SITE_META } from "@/lib/api";

interface Props { product: FlatProduct; index: number }

export default function ProductCard({ product, index }: Props) {
  const [imgErr, setImgErr] = useState(false);
  const meta = SITE_META[product.site as Source] ?? {
    label: product.site, color: "#888", bg: "rgba(136,136,136,0.1)"
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.3 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div
        className="relative w-full h-44 flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(255,255,255,0.025)" }}
      >
        {product.image_url && !imgErr ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgErr(true)}
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw"
            unoptimized
            loading={index < 4 ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageOff className="w-8 h-8 text-muted" />
            <span className="text-xs text-muted">No image</span>
          </div>
        )}

        {/* Discount badge */}
        {product.discount_pct && product.discount_pct >= 5 && (
          <span
            className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ background: "#E53E3E" }}
          >
            {product.discount_pct}% OFF
          </span>
        )}

        {/* Site badge */}
        <span
          className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          {meta.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {product.brand && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {product.brand}
          </p>
        )}

        <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: "#F0F0FF" }}>
          {product.title}
        </p>

        {/* Rating */}
        {product.rating != null && product.rating > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex" aria-label={`${product.rating.toFixed(1)} out of 5`}>
              {[1,2,3,4,5].map(s => (
                <Star key={s} className="w-3 h-3" style={{
                  color:  s <= Math.round(product.rating!) ? "#FBBF24" : "rgba(255,255,255,0.15)",
                  fill:   s <= Math.round(product.rating!) ? "#FBBF24" : "transparent",
                }} />
              ))}
            </div>
            <span className="text-xs text-secondary">{product.rating.toFixed(1)}</span>
            {product.review_count != null && (
              <span className="text-xs text-muted">
                ({product.review_count.toLocaleString("en-IN")})
              </span>
            )}
          </div>
        ) : null}

        {/* Price row */}
        <div className="flex items-end gap-2 mt-auto">
          <span className="text-lg font-bold" style={{ color: "#F0F0FF" }}>
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs line-through text-muted">
              ₹{product.original_price.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* CTA */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                     text-xs font-semibold transition-all hover:opacity-90 active:scale-95 min-h-[44px]"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}35` }}
          aria-label={`View on ${meta.label} (opens in new tab)`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          View on {meta.label}
          <ExternalLink className="w-3 h-3 opacity-60 ml-auto" />
        </a>
      </div>
    </motion.article>
  );
}
