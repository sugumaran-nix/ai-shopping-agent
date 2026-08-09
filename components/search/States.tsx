"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, SearchX } from "lucide-react";

const SUGGESTIONS = ["Wireless earbuds","Nike shoes","Samsung phone","Laptop bag","Formal shirts","Smart watch"];

export function EmptyState({ query, onReset, onSearch }: {
  query:     string;
  onReset:   () => void;
  onSearch?: (q: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1,  y:  0 }}
      className="flex flex-col items-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 glass-card">
        <SearchX className="w-7 h-7 text-muted" />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "#F0F0FF" }}>
        No results for &ldquo;{query}&rdquo;
      </h2>
      <p className="text-sm text-secondary mb-6 max-w-xs">
        Try a different or shorter term. All 5 stores were checked.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {SUGGESTIONS.map(s => (
          <button
            key={s} type="button"
            onClick={() => onSearch ? onSearch(s) : onReset()}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
            style={{ background: "rgba(124,58,237,0.09)", border: "1px solid rgba(124,58,237,0.22)", color: "rgba(240,240,255,0.7)" }}
          >
            {s}
          </button>
        ))}
      </div>
      <button type="button" onClick={onReset} className="btn-ghost text-sm">Back to home</button>
    </motion.div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1,  y:  0 }}
      className="flex flex-col items-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 glass-card"
           style={{ border: "1px solid rgba(244,63,94,0.2)" }}>
        <AlertTriangle className="w-7 h-7" style={{ color: "var(--danger)" }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "#F0F0FF" }}>Something went wrong</h2>
      <p className="text-sm text-secondary mb-6 max-w-sm">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary gap-2">
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </motion.div>
  );
}
