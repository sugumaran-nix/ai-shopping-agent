"use client";

import { motion } from "framer-motion";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  query: string;
  onReset: () => void;
}

const SUGGESTIONS = [
  "boAt headphones", "Nike shoes", "Samsung Galaxy", "Kurta under ₹500", "Laptop bag", "Formal shoes",
];

export default function EmptyState({ query, onReset }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      <div className="relative mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center glass-card"
          style={{ border: "1px solid rgba(109,40,217,0.3)" }}
        >
          <SearchX className="w-9 h-9" style={{ color: "var(--accent-violet)" }} aria-hidden="true" />
        </div>
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl -z-10 blur-2xl"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ background: "rgba(109,40,217,0.3)" }}
        />
      </div>

      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        No results for &ldquo;{query}&rdquo;
      </h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color: "var(--text-secondary)" }}>
        The stores didn&apos;t return results. Try a shorter or more common term.
      </p>

      <div className="flex flex-wrap gap-2 justify-center mb-8" aria-label="Suggested searches">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { window.location.href = `/search?q=${encodeURIComponent(s)}`; }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
            style={{
              background: "rgba(109,40,217,0.1)",
              border: "1px solid rgba(109,40,217,0.22)",
              color: "var(--text-secondary)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="btn-ghost"
      >
        Back to search
      </button>
    </motion.div>
  );
}
