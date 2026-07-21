"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "4",   label: "Platforms searched simultaneously" },
  { value: "AI",  label: "Powered by Gemini 2.0 Flash" },
  { value: "₹0",  label: "Free. No signup required" },
  { value: "<5s", label: "Average search time" },
];

export default function StatsBar() {
  return (
    <section className="px-4 -mt-8 relative z-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 0.9] }}
        className="max-w-4xl mx-auto glass rounded-2xl px-6 py-7"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-0">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center text-center px-4 ${
                i < STATS.length - 1 ? "md:border-r md:border-[var(--glass-border)]" : ""
              }`}
            >
              <span className="text-3xl md:text-4xl font-black gradient-text leading-none">
                {stat.value}
              </span>
              <span className="mt-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
