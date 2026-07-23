"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Brain } from "lucide-react";

interface AIAnalysisProps {
  analysis: string;
  query: string;
  total: number;
}

export default function AIAnalysis({ analysis, query, total }: AIAnalysisProps) {
  const [expanded, setExpanded] = useState(false);

  const isError = analysis.includes("unavailable") || analysis.includes("temporarily");

  // Format markdown-like text into clean paragraphs
  const lines = analysis.split("\n").filter((l) => l.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(124,58,237,0.2)" }}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          {isError ? (
            <Brain className="w-4 h-4" style={{ color: "#A78BFA" }} />
          ) : (
            <Sparkles className="w-4 h-4" style={{ color: "#A78BFA" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              AI Shopping Insight
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA" }}
            >
              Beta
            </span>
          </div>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
            {isError
              ? "Analysis temporarily unavailable"
              : `Analysed ${total} products for "${query}"`}
          </p>
        </div>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: expanded ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {/* Expandable body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              {isError ? (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {analysis}
                </p>
              ) : (
                <div className="space-y-2">
                  {lines.map((line, i) => {
                    const isHeading = /^(BEST|PROS|CONS|VERDICT|\d\.)/i.test(line.trim());
                    return (
                      <p
                        key={i}
                        className="text-sm leading-relaxed"
                        style={{
                          color: isHeading ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: isHeading ? 600 : 400,
                        }}
                      >
                        {line.replace(/^\*+|\*+$/g, "").replace(/^#+\s*/, "")}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
