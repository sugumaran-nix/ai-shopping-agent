"use client";

import { motion } from "framer-motion";
import { SearchX, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  query: string;
  onReset: () => void;
}

const SUGGESTIONS = [
  "Nike shoes", "boAt headphones", "Samsung Galaxy", "Saree under 500", "Laptop bag"
];

export default function EmptyState({ query, onReset }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      <div className="relative mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center glass"
          style={{ border: "1px solid rgba(109,40,217,0.3)" }}
        >
          <SearchX className="w-9 h-9" style={{ color: "var(--accent-violet)" }} />
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl -z-10"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ background: "radial-gradient(circle, rgba(109,40,217,0.2), transparent 70%)" }}
        />
      </div>

      <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        No results for &ldquo;{query}&rdquo;
      </h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-secondary)" }}>
        The stores didn&apos;t return results for this search. Try a shorter or different term.
      </p>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => window.location.href = `/search?q=${encodeURIComponent(s)}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]"
            style={{
              background: "rgba(109,40,217,0.1)",
              border: "1px solid rgba(109,40,217,0.25)",
              color: "var(--text-secondary)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-black)]"
        style={{ background: "var(--gradient-accent)" }}
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </motion.div>
  );
}
