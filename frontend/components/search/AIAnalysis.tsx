"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Info, Sparkles } from "lucide-react";

interface Props {
  recommendation: string | null;
  error:          string | null;
  staleSources?:  string[];
}

export default function AIAnalysis({ recommendation, error, staleSources = [] }: Props) {
  if (!recommendation && !error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1,  y:  0 }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Gradient border glow */}
      <div className="absolute -inset-px bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 rounded-2xl opacity-30 blur-sm pointer-events-none" />

      <div className="relative rounded-2xl p-5" style={{ background: "hsl(222 40% 7% / 0.9)", border: "1px solid rgba(255,255,255,0.09)" }}>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
            {recommendation
              ? <Sparkles className="w-4 h-4 text-violet-400" />
              : <AlertTriangle className="w-4 h-4 text-yellow-400" />
            }
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#F0F0FF" }}>AI Recommendation</p>
            <p className="text-xs text-muted">Based strictly on real product data from this search</p>
          </div>
        </div>

        {recommendation && (
          <p className="text-sm leading-relaxed text-secondary whitespace-pre-wrap">
            {recommendation}
          </p>
        )}

        {!recommendation && error && (
          <p className="text-sm text-muted">{error}</p>
        )}

        {staleSources.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl p-3 text-xs"
               style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)", color: "#FCD34D" }}>
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{staleSources.join(", ")} returned cached data — prices may differ from current.</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
