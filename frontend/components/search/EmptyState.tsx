"use client";

import { motion } from "framer-motion";
import { SearchX } from "lucide-react";

const SUGGESTIONS = ["boAt headphones", "Nike shoes", "Samsung Galaxy", "Kurta under ₹500", "Laptop bag", "Formal shoes"];

interface EmptyStateProps {
  query: string;
  onReset: () => void;
}

export default function EmptyState({ query, onReset }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-20 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 glass-card"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <SearchX className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        No results for &ldquo;{query}&rdquo;
      </h2>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-secondary)" }}>
        The stores didn&apos;t return results. Try a shorter or more common term.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              onReset();
              // trigger search via window event
              window.dispatchEvent(new CustomEvent("shopiq:search", { detail: s }));
            }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
            style={{
              background: "rgba(124,58,237,0.09)",
              border: "1px solid rgba(124,58,237,0.22)",
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
        className="btn-ghost text-sm py-2 px-5"
      >
        Back to search
      </button>
    </motion.div>
  );
}
