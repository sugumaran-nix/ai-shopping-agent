"use client";

import { MotionConfig } from "framer-motion";

/**
 * Wraps the entire app in Framer Motion's MotionConfig with reducedMotion="user".
 * This makes EVERY motion.* component respect the OS-level "Reduce Motion" setting —
 * a single fix that covers all animated components without touching them individually.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
