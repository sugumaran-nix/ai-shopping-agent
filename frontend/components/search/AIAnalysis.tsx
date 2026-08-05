"use client";

import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, Info } from "lucide-react";

interface AIAnalysisProps {
  recommendation: string | null;
  error: string | null;
  staleSources?: string[];  // sources returning stale data — shown as caveat
}

export default function AIAnalysis({ recommendation, error, staleSources = [] }: AIAnalysisProps) {
  if (!recommendation && !error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Glow border */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 rounded-2xl opacity-25 blur-sm pointer-events-none" />

      <div className="relative bg-[#0C0C1E]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
          >
            {recommendation ? (
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent-violet)" }} />
            ) : (
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--status-stale)" }} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              AI Recommendation
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Based solely on real product data from your search
            </p>
          </div>
        </div>

        {recommendation && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {recommendation}
          </p>
        )}

        {error && !recommendation && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Couldn&apos;t generate a recommendation: {error}
          </p>
        )}

        {staleSources.length > 0 && (
          <div
            className="mt-4 flex items-start gap-2 rounded-xl p-3 text-xs"
            style={{
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.18)",
              color: "#FCD34D",
            }}
          >
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {staleSources.join(", ")} returned cached data — prices shown may not be current.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
