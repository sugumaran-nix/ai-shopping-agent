"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const GUARANTEES = [
  "No account or signup required",
  "Works on mobile & desktop",
  "Free forever for shoppers",
  "Powered by Gemini AI",
];

export default function CTA() {
  return (
    <section aria-labelledby="cta-title" className="py-20 px-4">
      <div className="section-divider mb-16" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center glass-card rounded-3xl p-12 md:p-16 relative overflow-hidden"
      >
        {/* Background radial glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 90% 65% at 50% -10%, rgba(109,40,217,0.22), transparent 70%)",
          }}
        />

        <motion.h2
          id="cta-title"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.55 }}
          className="display-lg text-balance mb-4 relative z-10"
          style={{ color: "var(--text-primary)" }}
        >
          Stop tab-switching.{" "}
          <span className="gradient-text">Start saving.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.22 }}
          className="text-lg mb-8 max-w-md mx-auto relative z-10"
          style={{ color: "var(--text-secondary)" }}
        >
          One search. Four stores. The best deal picked by AI — in under 5 seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.32 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 relative z-10"
        >
          <Link href="/search" className="btn-primary text-base px-8 py-4">
            Search for free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/#features" className="btn-ghost text-base px-6 py-4">
            See how it works
          </Link>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.44 }}
          className="flex flex-wrap gap-x-5 gap-y-2 justify-center relative z-10"
        >
          {GUARANTEES.map((g) => (
            <li key={g} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Check className="w-3.5 h-3.5" style={{ color: "var(--accent-emerald)" }} />
              {g}
            </li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}
