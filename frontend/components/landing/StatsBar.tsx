"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "4",    label: "Platforms searched simultaneously" },
  { value: "AI",   label: "Powered by Gemini 2.0 Flash" },
  { value: "₹0",   label: "Free — no signup required" },
  { value: "<5s",  label: "Average search time" },
];

export default function StatsBar() {
  return (
    <section className="py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass rounded-2xl max-w-4xl mx-auto"
        style={{ border: "1px solid rgba(109,40,217,0.25)" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x"
          style={{ "--tw-divide-opacity": "1", borderColor: "rgba(109,40,217,0.15)" } as React.CSSProperties}>
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex flex-col items-center justify-center py-6 px-4 text-center"
              style={{ borderColor: "rgba(109,40,217,0.15)" }}
            >
              <span
                className="text-3xl md:text-4xl font-black mb-1 gradient-text"
              >
                {stat.value}
              </span>
              <span className="text-xs leading-tight" style={{ color: "var(--text-secondary)" }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
