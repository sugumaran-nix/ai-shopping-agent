// frontend/components/search/AIAnalysis.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, ShieldCheck, Lightbulb } from "lucide-react";
import { useState, ReactNode } from "react";

interface AIAnalysisProps {
  analysis: string;
  query: string;
  total: number;
}

function renderLine(line: string, i: number): ReactNode {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const isHeader = /^#{1,3}\s/.test(trimmed) || /^(BEST|COMPARISON|TIPS|BUYING)/i.test(trimmed);
  const isBullet = /^[-•*]\s/.test(trimmed);
  const stripped = trimmed.replace(/^#{1,3}\s+/, "").replace(/^[-•*]\s+/, "");
  
  // Parse **bold** text
  const parts = stripped.split(/\*\*(.+?)\*\*/g);
  const content = parts.map((p, j) =>
    j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{p}</strong> : p
  );

  if (isHeader) {
    return (
      <h4 key={i} className="text-sm font-bold text-white mt-5 mb-2 flex items-center gap-2 first:mt-0">
        {trimmed.toLowerCase().includes("best") && <TrendingUp className="w-4 h-4 text-emerald-400" />}
        {trimmed.toLowerCase().includes("tip") && <Lightbulb className="w-4 h-4 text-amber-400" />}
        {trimmed.toLowerCase().includes("compar") && <ShieldCheck className="w-4 h-4 text-sky-400" />}
        {content}
      </h4>
    );
  }

  if (isBullet) {
    return (
      <p key={i} className="text-sm text-gray-300 pl-4 my-1.5 leading-relaxed border-l-2 border-violet-500/40">
        {content}
      </p>
    );
  }

  return (
    <p key={i} className="text-sm text-gray-400 leading-relaxed my-1">
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
      className="relative group rounded-2xl overflow-hidden"
    >
      {/* Animated Gradient Border Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 rounded-2xl opacity-30 group-hover:opacity-60 blur-sm transition duration-500" />
      
      <div className="relative bg-[#0C0C1E]/80 backdrop-blur-xl border border-white/10 rounded-2xl">
        <button
          type="button"
          className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <Sparkles className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <p className="text-base font-bold text-white flex items-center gap-2">
                AI Shopping Insight
                <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-300 uppercase tracking-wider">
                  Beta
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Analysed <span className="text-white font-medium">{total}</span> products for &ldquo;{query}&rdquo;
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 space-y-1 border-t border-white/5">
                {lines.map((line, i) => renderLine(line, i))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
