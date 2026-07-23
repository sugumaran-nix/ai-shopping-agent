"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, ExternalLink, ShoppingCart, ImageOff } from "lucide-react";
import { Product } from "@/types";
import { SITE_META } from "@/lib/api";

// Domains configured in next.config.js remotePatterns — use Next.js optimisation for these.
// Everything else gets unoptimized=true so Next.js doesn't reject unknown hostnames.
const OPTIMISED_PATTERN =
  /amazon\.(in|com)|flipkart\.com|fkimg\.com|meesho\.(com|net)|myntra\.com|myntassets\.com/;

interface ProductCardProps {
  product: Product;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const meta      = SITE_META[product.site] ?? { label: product.site, color: "#888", bg: "rgba(136,136,136,0.12)" };
  const [imgError, setImgError] = useState(false);

  // Memoised inline to avoid running on every render — this component is
  // rendered 20+ times per search so keep per-instance work minimal.
  const isOptimised = product.image_url
    ? OPTIMISED_PATTERN.test(product.image_url)
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div
        className="relative w-full h-44 flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {product.image_url && !imgError ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            className="object-contain p-3 transition-transform duration-300 hover:scale-105"
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized={!isOptimised}
            loading={index < 4 ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex flex-col items-center gap-2" role="img" aria-label="No product image available">
            <ImageOff className="w-8 h-8" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>No image</span>
          </div>
        )}

        {/* Discount badge — the only place discount % is shown (removed duplicate from price row) */}
        {product.discount && product.discount > 0 && (
          <span
            className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white"
            aria-label={`${product.discount}% discount`}
          >
            -{product.discount}%
          </span>
        )}

        {/* Site badge */}
        <span
          className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.color}30`,
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title */}
        <p
          className="text-sm font-medium leading-snug line-clamp-2"
          style={{ color: "var(--text-primary)" }}
        >
          {product.title}
        </p>

        {/* Rating */}
        {product.rating && product.rating > 0 ? (
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-0.5"
              role="img"
              aria-label={`${product.rating.toFixed(1)} out of 5 stars`}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="w-3 h-3"
                  aria-hidden="true"
                  style={{
                    color: s <= Math.round(product.rating!) ? "#FBBF24" : "rgba(255,255,255,0.15)",
                    fill:  s <= Math.round(product.rating!) ? "#FBBF24" : "transparent",
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {product.rating.toFixed(1)}
            </span>
            {product.reviews && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                ({product.reviews.toLocaleString("en-IN")})
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No rating yet</span>
        )}

        {/* Price row — discount % removed here (shown once on the image badge above) */}
        <div className="flex items-end gap-2 mt-auto">
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs line-through mb-0.5" style={{ color: "var(--text-muted)" }}>
              ₹{product.original_price.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* CTA */}
        
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 mt-1 min-h-[44px]"
          style={{
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.color}35`,
          }}
          aria-label={`View ${product.title} on ${meta.label} (opens in new tab)`}
        >
          <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
          View on {meta.label}
          <ExternalLink className="w-3 h-3 opacity-60 ml-auto" aria-hidden="true" />
        </a>
      </div>
    </motion.div>
  );
}
