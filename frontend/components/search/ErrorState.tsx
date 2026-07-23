"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Clock } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/**
 * Parses the raw API error message and returns user-friendly content.
 * The Render free tier cold-starts after 15 min of inactivity — 503s
 * and timeouts are the most common failure mode and deserve a specific message.
 */
function parseError(message: string): { heading: string; detail: string; isColdStart: boolean } {
  const msg = message.toLowerCase();

  if (msg.includes("503") || msg.includes("502") || msg.includes("service unavailable")) {
    return {
      heading: "Backend is starting up",
      detail:
        "The server is waking up from sleep (free hosting). This usually takes 20–30 seconds on the first search of the day. Please retry in a moment.",
      isColdStart: true,
    };
  }

  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("etimedout") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror")
  ) {
    return {
      heading: "Connection timed out",
      detail:
        "The request took too long. The backend may be starting up — wait 20 seconds and try again. If this keeps happening, check your internet connection.",
      isColdStart: true,
    };
  }

  if (msg.includes("404")) {
    return {
      heading: "Endpoint not found",
      detail: "The search API endpoint could not be reached. This is likely a deployment issue.",
      isColdStart: false,
    };
  }

  return {
    heading: "Something went wrong",
    detail: message || "An unexpected error occurred. Please try again.",
    isColdStart: false,
  };
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { heading, detail, isColdStart } = parseError(message);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-20 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: isColdStart ? "rgba(124,58,237,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${isColdStart ? "rgba(124,58,237,0.25)" : "rgba(239,68,68,0.2)"}`,
        }}
      >
        {isColdStart
          ? <Clock         className="w-7 h-7" style={{ color: "#A78BFA" }} aria-hidden="true" />
          : <AlertTriangle className="w-7 h-7 text-red-400"                 aria-hidden="true" />
        }
      </div>

      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {heading}
      </h2>
      <p className="text-sm mb-6 max-w-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {detail}
      </p>

      <button type="button" onClick={onRetry} className="btn-primary gap-2">
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        {isColdStart ? "Retry now" : "Try again"}
      </button>
    </motion.div>
  );
}
