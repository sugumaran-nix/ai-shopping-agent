"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const STATS = [
  {
    value: 4,
    suffix: "",
    label: "Platforms searched at once",
    sub: "Amazon · Flipkart · Meesho · Myntra",
  },
  {
    value: 5,
    suffix: "s",
    label: "Avg. time to results",
    sub: "Parallel async scraping",
  },
  {
    value: 100,
    suffix: "%",
    label: "Free, always",
    sub: "No account. No hidden fees.",
  },
  {
    // Fixed: "2.0" was confusing (looked like a score, was actually a model version).
    // Changed to a countable stat that makes sense in context.
    value: 20,
    suffix: "+",
    label: "Products compared per search",
    sub: "Scraped live, never cached",
  },
];

function Counter({ to, suffix, duration = 1.6 }: { to: number; suffix: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  // Store the RAF id so we can cancel it on unmount, preventing a memory leak
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;

    const step = (ts: number) => {
      if (!start) start = ts;
      const p    = Math.min((ts - start) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((to * ease).toFixed(to % 1 !== 0 ? 1 : 0)));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setVal(to);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    // Fixed: cancel the RAF on unmount to prevent state updates on unmounted component
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, to, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

export default function StatsBar() {
  return (
    <section aria-label="Key statistics" className="py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="glass max-w-5xl mx-auto rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(109,40,217,0.2)" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center justify-center py-8 px-5 text-center relative"
            >
              {/* Vertical dividers on desktop */}
              {i > 0 && (
                <div
                  className="hidden md:block absolute left-0 top-1/4 bottom-1/4 w-px"
                  aria-hidden="true"
                  style={{ background: "rgba(109,40,217,0.18)" }}
                />
              )}
              {/* Horizontal divider between top row and bottom row on mobile */}
              {i >= 2 && (
                <div
                  className="md:hidden absolute top-0 inset-x-4 h-px"
                  aria-hidden="true"
                  style={{ background: "rgba(109,40,217,0.18)" }}
                />
              )}

              <span className="text-4xl font-black mb-1 gradient-text tabular-nums" aria-label={`${stat.value}${stat.suffix}`}>
                <Counter to={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                {stat.label}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stat.sub}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
