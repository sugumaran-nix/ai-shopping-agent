"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center glass mb-6"
        style={{ border: "1px solid rgba(220,38,38,0.3)" }}
      >
        <AlertTriangle className="w-9 h-9" style={{ color: "#EF4444" }} />
      </div>

      <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Something went wrong
      </h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>

      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: "var(--gradient-accent)" }}
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </motion.div>
  );
}
