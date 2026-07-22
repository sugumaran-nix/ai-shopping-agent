"use client";

import { motion } from "framer-motion";
import { Star, ExternalLink, ShoppingCart } from "lucide-react";
import { Product } from "@/types";
import { SITE_META } from "@/lib/api";

interface ProductCardProps {
  product: Product;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const meta = SITE_META[product.site] ?? { label: product.site, color: "#888", bg: "rgba(136,136,136,0.12)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-200"
    >
      {/* Image */}
      {product.image_url && (
        <div className="relative w-full h-44 bg-white/5 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url}
            alt={product.title}
            className="object-contain h-full w-full p-3"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {product.discount && (
            <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{product.discount}%
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Site badge */}
        <span
          className="self-start text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>

        {/* Title */}
        <p className="text-sm text-gray-200 leading-snug line-clamp-2 flex-1">{product.title}</p>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs text-gray-300 font-medium">{product.rating.toFixed(1)}</span>
            {product.reviews && (
              <span className="text-xs text-gray-500">({product.reviews.toLocaleString()})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-end gap-2">
          <span className="text-lg font-bold text-white">₹{product.price.toLocaleString("en-IN")}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs text-gray-500 line-through mb-0.5">
              ₹{product.original_price.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* CTA */}
        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          View on {meta.label}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </motion.div>
  );
}
