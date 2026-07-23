"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, ExternalLink, ShoppingCart, ImageOff } from "lucide-react";
import { Product } from "@/types";
import { SITE_META } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const meta = SITE_META[product.site] ?? {
    label: product.site,
    color: "#888",
    bg: "rgba(136,136,136,0.12)",
  };
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Image area */}
      <div
        className="relative w-full h-44 flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {product.image_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            className="object-contain h-full w-full p-3 transition-transform duration-300 hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageOff className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              No image
            </span>
          </div>
        )}

        {/* Discount badge */}
        {product.discount && product.discount > 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white">
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
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="w-3 h-3"
                  style={{
                    color:
                      s <= Math.round(product.rating!)
                        ? "#FBBF24"
                        : "rgba(255,255,255,0.15)",
                    fill:
                      s <= Math.round(product.rating!)
                        ? "#FBBF24"
                        : "transparent",
                  }}
                />
              ))}
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {product.rating.toFixed(1)}
            </span>
            {product.reviews && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                ({product.reviews.toLocaleString()})
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No rating
          </span>
        )}

        {/* Price row */}
        <div className="flex items-end gap-2 mt-auto">
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span
              className="text-xs line-through mb-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              ₹{product.original_price.toLocaleString("en-IN")}
            </span>
          )}
          {product.discount && product.discount > 0 && (
            <span
              className="text-xs font-semibold mb-0.5 ml-auto"
              style={{ color: "#6EE7B7" }}
            >
              {product.discount}% off
            </span>
          )}
        </div>

        {/* CTA button */}
        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 mt-1"
          style={{
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.color}35`,
          }}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          View on {meta.label}
          <ExternalLink className="w-3 h-3 opacity-60 ml-auto" />
        </a>
      </div>
    </motion.div>
  );
}
