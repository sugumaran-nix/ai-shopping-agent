"use client";

import { motion } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface AIAnalysisProps {
  analysis: string;
  query: string;
  total: number;
}

export default function AIAnalysis({ analysis, query, total }: AIAnalysisProps) {
  const [expanded, setExpanded] = useState(true);

  const lines = analysis.split("\n").filter(l => l.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(109,40,217,0.3)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]"
        onClick={() => setExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(v => !v); } }}
        aria-expanded={expanded}
        style={{ borderBottom: expanded ? "1px solid rgba(109,40,217,0.15)" : "none" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.4)" }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent-violet)" }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              AI Recommendation
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Based on {total} results for &ldquo;{query}&rdquo;
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4"  style={{ color: "var(--text-secondary)" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        }
      </div>

      {/* Body */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="p-4"
        >
          <div className="space-y-3">
            {lines.map((line, i) => {
              const isHeader = /^(BEST PICK|BEST VALUE|COMPARISON|TIPS|\d+\.)/.test(line.trim());
              return (
                <p
                  key={i}
                  className={`text-sm leading-relaxed ${isHeader ? "font-semibold" : ""}`}
                  style={{ color: isHeader ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {line}
                </p>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
