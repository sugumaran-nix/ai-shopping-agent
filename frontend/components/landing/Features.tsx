"use client";

import { motion } from "framer-motion";
import { Search, Brain, TrendingDown, Zap, ShoppingBag, Star } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "4-Platform Search",
    desc: "Simultaneously searches Amazon, Flipkart, Meesho, and Myntra in one shot. No tab-switching, no manual comparison.",
    accent: "#7C3AED",
    span: "col-span-1",
  },
  {
    icon: Brain,
    title: "Gemini AI Analysis",
    desc: "Google's Gemini 2.0 Flash reads all results and tells you the best pick, best value, and buying tips — in plain language.",
    accent: "#C026D3",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: TrendingDown,
    title: "Real-time Prices",
    desc: "Prices scraped live. What you see is what's actually on the site right now.",
    accent: "#0891B2",
    span: "col-span-1",
  },
  {
    icon: Zap,
    title: "Instant Results",
    desc: "Async scraping across all 4 platforms in parallel. Results in seconds, not minutes.",
    accent: "#059669",
    span: "col-span-1",
  },
  {
    icon: Star,
    title: "Ratings & Reviews",
    desc: "See star ratings and review counts from each platform side by side so you make an informed choice.",
    accent: "#D97706",
    span: "col-span-1",
  },
  {
    icon: ShoppingBag,
    title: "Direct Links",
    desc: "Every result links directly to the product page on the original store. One click to checkout.",
    accent: "#DC2626",
    span: "col-span-1",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-4 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ color: "var(--accent-violet)", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}>
          Features
        </span>
        <h2 className="text-4xl md:text-5xl font-black mt-4 mb-4 leading-tight"
          style={{ color: "var(--text-primary)" }}>
          Everything you need to{" "}
          <span className="gradient-text">shop smarter</span>
        </h2>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Stop wasting time jumping between apps. Shopiq does it all in one search.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className={`glass glass-hover rounded-2xl p-6 cursor-default ${f.span}`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `${f.accent}20`, border: `1px solid ${f.accent}40` }}
            >
              <f.icon className="w-5 h-5" style={{ color: f.accent }} />
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
