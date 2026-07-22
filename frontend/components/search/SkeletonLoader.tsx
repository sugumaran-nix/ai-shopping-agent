"use client";

import { motion } from "framer-motion";

export default function SkeletonLoader() {
  return (
    <div className="space-y-6">
      {/* AI Analysis Skeleton */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 rounded-2xl opacity-20 blur-sm" />
        <div className="relative bg-[#0C0C1E]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/5 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded animate-pulse" />
            <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-white/5 rounded animate-pulse w-4/6" />
          </div>
        </div>
      </div>

      {/* Product Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#111128]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden"
          >
            <div className="aspect-square bg-white/[0.02] animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-white/5 rounded animate-pulse" />
              <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
              <div className="h-6 bg-white/5 rounded animate-pulse w-1/3" />
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
