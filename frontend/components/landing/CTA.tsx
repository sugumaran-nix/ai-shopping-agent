"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(109,40,217,0.2), transparent 70%)",
          }}
        />

        <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight"
          style={{ color: "var(--text-primary)" }}>
          Stop Tab-Switching.{" "}
          <span className="gradient-text">Start Saving.</span>
        </h2>

        <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
          One search. Four stores. AI does the comparing.
        </p>

        <Link
          href="/search"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:opacity-90 hover:scale-[1.02]"
          style={{ background: "var(--gradient-accent)" }}
        >
          Try It Free — No Signup
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="mt-5 text-xs" style={{ color: "var(--text-muted)" }}>
          No account needed &nbsp;&middot;&nbsp; Works on mobile &nbsp;&middot;&nbsp; Powered by Gemini AI
        </p>
      </motion.div>
    </section>
  );
}
