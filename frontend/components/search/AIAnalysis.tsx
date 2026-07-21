"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState, ReactNode } from "react";

interface AIAnalysisProps {
  analysis: string;
  query: string;
  total: number;
}

/** Render one line of Gemini markdown → JSX */
function renderLine(line: string, i: number): ReactNode {
  const isHeader = /^#{1,3}\s/.test(line) || /^(BEST PICK|BEST VALUE|COMPARISON|TIPS|BUYING)/i.test(line.trim());
  const isBullet = /^[-•*]\s/.test(line.trim());

  // Strip markdown prefixes
  const stripped = line.replace(/^#{1,3}\s+/, "").replace(/^[-•*]\s+/, "");

  // Inline bold **text**
  const parts = stripped.split(/\*\*(.+?)\*\*/g);
  const content = parts.map((p, j) =>
    j % 2 === 1 ? (
      <strong key={j} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{p}</strong>
    ) : p
  );

  if (!stripped.trim()) return null;

  if (isHeader) {
    return (
      <p key={i} className="text-sm font-semibold mt-4 mb-1 first:mt-0" style={{ color: "var(--text-primary)" }}>
        {content}
      </p>
    );
  }

  if (isBullet) {
    return (
      <p
        key={i}
        className="text-sm pl-3 my-1 leading-relaxed"
        style={{
          color: "var(--text-secondary)",
          borderLeft: "2px solid rgba(109,40,217,0.45)",
        }}
      >
        {content}
      </p>
    );
  }

  return (
    <p key={i} className="text-sm leading-relaxed text-[var(--text-secondary)]">
      {content}
    </p>
  );
}

export default function AIAnalysis({ analysis, query, total }: AIAnalysisProps) {
  const [expanded, setExpanded] = useState(true);
  const lines = analysis.split("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="glass-card rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(109,40,217,0.28)" }}
    >
      {/* Header — button for accessibility */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left cursor-pointer transition-colors hover:bg-white/[0.025]"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="ai-analysis-body"
        style={{ borderBottom: expanded ? "1px solid rgba(109,40,217,0.14)" : "none" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "rgba(109,40,217,0.18)",
              border: "1px solid rgba(109,40,217,0.38)",
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "#A78BFA" }} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              AI Recommendation
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Analysed {total} results for &ldquo;{query}&rdquo;
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp  className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
        }
      </button>

      {/* Body with AnimatePresence so collapse is also animated */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="ai-analysis-body"
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="p-4 space-y-0.5">
              {lines.map((line, i) => renderLine(line, i))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
