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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center glass-card mb-6"
        style={{ border: "1px solid rgba(220,38,38,0.28)" }}
      >
        <AlertTriangle className="w-9 h-9" style={{ color: "#F87171" }} aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Something went wrong
      </h2>
      <p className="text-sm mb-6 max-w-sm" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>

      <button type="button" onClick={onRetry} className="btn-primary">
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Retry
      </button>
    </motion.div>
  );
}
