"use client";

import { motion } from "framer-motion";
import { Type, Layers, Sparkles, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Type,
    title: "Describe what you want",
    desc: "Type any product — a brand name, a category, or a natural language query like \"kurta under ₹500\". The more specific, the better.",
    accent: "#6D28D9",
    bullets: ["Brand names work", "Natural language works", "Price ranges work"],
  },
  {
    num: "02",
    icon: Layers,
    title: "We scan 4 platforms",
    desc: "Shopiq fires parallel requests to Amazon, Flipkart, Meesho, and Myntra simultaneously. Real-time scraping — no cached, stale data.",
    accent: "#4F46E5",
    bullets: ["All 4 stores at once", "Live prices", "Ratings & discounts"],
  },
  {
    num: "03",
    icon: Sparkles,
    title: "AI ranks the best deals",
    desc: "Gemini 2.0 Flash reads every result and writes a plain-language verdict: best pick, best value, and what to watch out for.",
    accent: "#0EA5E9",
    bullets: ["Best pick named", "Best value flagged", "Buying tips included"],
  },
];

export default function HowItWorks() {
  return (
    <section id="howitworks" aria-labelledby="hiw-title" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="pill pill-violet mb-5 inline-flex mx-auto">How it works</span>
          <h2 id="hiw-title" className="display-lg text-balance" style={{ color: "var(--text-primary)" }}>
            Three steps to your{" "}
            <span className="gradient-text">best deal</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connector line — inline style avoids invalid Tailwind fraction class */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute h-px"
            style={{
              top: 52,
              left: "16.666%",
              right: "16.666%",
              background: "linear-gradient(to right, transparent, rgba(109,40,217,0.35), rgba(14,165,233,0.35), transparent)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.18, duration: 0.5 }}
                className="flex flex-col items-center text-center"
              >
                {/* Step icon */}
                <div
                  className="relative w-[104px] h-[104px] rounded-2xl flex flex-col items-center justify-center mb-6 glass-card"
                  style={{ border: `1px solid ${step.accent}45` }}
                >
                  <step.icon className="w-8 h-8 mb-1" style={{ color: step.accent }} />
                  <span className="text-xs font-mono font-bold" style={{ color: `${step.accent}80` }}>
                    {step.num}
                  </span>
                  {/* Glow */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-2xl -z-10 blur-2xl opacity-40"
                    style={{ background: step.accent }}
                  />
                </div>

                <h3 className="text-lg font-bold mb-2 text-balance" style={{ color: "var(--text-primary)" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed mb-4 max-w-xs" style={{ color: "var(--text-secondary)" }}>
                  {step.desc}
                </p>

                {/* Bullet points */}
                <ul className="flex flex-col gap-1.5 items-center">
                  {step.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: step.accent }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
