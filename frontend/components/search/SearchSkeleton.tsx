"use client";

import { motion } from "framer-motion";

export function AnalysisSkeleton() {
  return (
    <div className="rounded-2xl p-5 glass">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl skeleton" />
        <div className="space-y-2 flex-1">
          <div className="h-4 skeleton w-1/3" />
          <div className="h-3 skeleton w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 skeleton" />
        <div className="h-3 skeleton w-5/6" />
        <div className="h-3 skeleton w-4/6" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-2xl overflow-hidden glass-card"
        >
          <div className="h-44 skeleton rounded-none" />
          <div className="p-4 space-y-3">
            <div className="h-4 skeleton w-full" />
            <div className="h-4 skeleton w-2/3" />
            <div className="h-6 skeleton w-1/3" />
            <div className="h-10 skeleton" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-5">
      <AnalysisSkeleton />
      <GridSkeleton count={8} />
    </div>
  );
}
