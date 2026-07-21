"use client";

import { motion } from "framer-motion";
import { Search, Brain, TrendingDown, Zap, ShoppingBag, Star, Shield, RefreshCw } from "lucide-react";

const PLATFORM_PILLS = [
  { name: "Amazon",   color: "#FF9900" },
  { name: "Flipkart", color: "#2874F0" },
  { name: "Meesho",   color: "#F43397" },
  { name: "Myntra",   color: "#FF3F6C" },
];

const FEATURES = [
  {
    icon: Search,
    accent: "#6D28D9",
    title: "One search, four stores",
    desc: "Stop opening four browser tabs. Shopiq fires all four searches in parallel and brings results back in a single, clean view.",
    span: "md:col-span-1",
    extra: null,
  },
  {
    icon: Brain,
    accent: "#4F46E5",
    title: "AI-ranked recommendations",
    desc: "Gemini 2.0 Flash reads all results and gives you a plain-language verdict — best pick, best value, and what to watch out for.",
    span: "md:col-span-2",
    extra: "platforms",
  },
  {
    icon: TrendingDown,
    accent: "#0EA5E9",
    title: "Live prices, not cached",
    desc: "Every search scrapes the platforms in real time. No stale prices. No bait-and-switch.",
    span: "md:col-span-1",
    extra: null,
  },
  {
    icon: Zap,
    accent: "#059669",
    title: "Results in seconds",
    desc: "Parallel async scraping means all four platforms finish at once. Typical search returns in under 5 seconds.",
    span: "md:col-span-1",
    extra: null,
  },
  {
    icon: Star,
    accent: "#D97706",
    title: "Ratings side by side",
    desc: "Star ratings and review counts from every platform in one view, so you pick the most trusted listing.",
    span: "md:col-span-1",
    extra: null,
  },
  {
    icon: Shield,
    accent: "#DC2626",
    title: "Free forever. No signup.",
    desc: "No account, no email, no paywalls. Shopiq will always be free for shoppers.",
    span: "md:col-span-1",
    extra: null,
  },
  {
    icon: ShoppingBag,
    accent: "#7C3AED",
    title: "One tap to checkout",
    desc: "Every card links directly to the product page. Buy on the platform you already trust.",
    span: "md:col-span-1",
    extra: null,
  },
  {
    icon: RefreshCw,
    accent: "#0891B2",
    title: "Filter & sort freely",
    desc: "Narrow to a platform, sort by price or rating, and find exactly what you need without re-searching.",
    span: "md:col-span-1",
    extra: null,
  },
];

export default function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-14"
        >
          <span className="pill pill-violet mb-5 mx-auto inline-flex">Features</span>
          <h2 id="features-title" className="display-lg text-balance mb-4" style={{ color: "var(--text-primary)" }}>
            Everything you need to{" "}
            <span className="gradient-text">shop smarter</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Stop bouncing between apps. One search surfaces all the data you need to decide.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              className={`glass-card rounded-2xl p-6 flex flex-col ${f.span}`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 shrink-0"
                style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}38` }}
              >
                <f.icon className="w-4.5 h-4.5" style={{ color: f.accent, width: 18, height: 18 }} />
              </div>
              <h3 className="text-[0.95rem] font-bold mb-2 leading-snug" style={{ color: "var(--text-primary)" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {f.desc}
              </p>

              {f.extra === "platforms" && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {PLATFORM_PILLS.map((p) => (
                    <span
                      key={p.name}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: `${p.color}14`,
                        color: p.color,
                        border: `1px solid ${p.color}35`,
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
