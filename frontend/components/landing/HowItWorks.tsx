"use client";

import { motion } from "framer-motion";
import { Type, Layers, Sparkles } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Type,
    title: "Type your search",
    desc: 'Enter any product — "Sony WH-1000XM5" or "kurta under ₹500". Natural language works too.',
    accent: "#7C3AED",
  },
  {
    num: "02",
    icon: Layers,
    title: "We search 4 platforms",
    desc: "Shopiq simultaneously scrapes Amazon, Flipkart, Meesho, and Myntra for real-time results — sorted by price.",
    accent: "#C026D3",
  },
  {
    num: "03",
    icon: Sparkles,
    title: "AI recommends the best",
    desc: "Gemini AI reads all results and gives you a best pick, best value, a comparison summary, and buying tips.",
    accent: "#0891B2",
  },
];

export default function HowItWorks() {
  return (
    <section id="howitworks" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
            style={{ color: "var(--accent-pink)", background: "rgba(192,38,211,0.12)", border: "1px solid rgba(192,38,211,0.25)" }}>
            How it works
          </span>
          <h2 className="text-4xl md:text-5xl font-black mt-4 leading-tight"
            style={{ color: "var(--text-primary)" }}>
            Three steps to the{" "}
            <span className="gradient-text">best deal</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(124,58,237,0.4), rgba(192,38,211,0.4), rgba(8,145,178,0.4), transparent)" }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex flex-col items-center text-center"
              >
                {/* Icon circle */}
                <div
                  className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center mb-6 glass relative"
                  style={{ border: `1px solid ${step.accent}50` }}
                >
                  <step.icon className="w-8 h-8 mb-1" style={{ color: step.accent }} />
                  <span className="text-xs font-mono font-bold" style={{ color: `${step.accent}90` }}>
                    {step.num}
                  </span>
                  {/* Glow behind */}
                  <div
                    className="absolute inset-0 rounded-2xl -z-10 blur-xl"
                    style={{ background: `${step.accent}15` }}
                  />
                </div>

                <h3 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--text-secondary)" }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
