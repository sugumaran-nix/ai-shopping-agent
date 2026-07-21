"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import gsap from "gsap";

const MARQUEE_ITEMS = [
  { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=280&h=220&fit=crop&q=80", alt: "Watch" },
  { src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=280&h=220&fit=crop&q=80", alt: "Sneakers" },
  { src: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=280&h=220&fit=crop&q=80", alt: "Perfume" },
  { src: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=280&h=220&fit=crop&q=80", alt: "Running shoes" },
  { src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=280&h=220&fit=crop&q=80", alt: "Headphones" },
  { src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=280&h=220&fit=crop&q=80", alt: "Camera" },
  { src: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=280&h=220&fit=crop&q=80", alt: "Shoes" },
  { src: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=280&h=220&fit=crop&q=80", alt: "Sunglasses" },
  { src: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=280&h=220&fit=crop&q=80", alt: "Bag" },
  { src: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=280&h=220&fit=crop&q=80", alt: "Fashion" },
];

const PLATFORMS = [
  { name: "Amazon",   color: "#FF9900" },
  { name: "Flipkart", color: "#2874F0" },
  { name: "Meesho",   color: "#F43397" },
  { name: "Myntra",   color: "#FF3F6C" },
];

const QUICK_SEARCHES = [
  "boAt headphones", "Nike shoes", "Samsung Galaxy", "Formal shirt under ₹999", "Laptop bag",
];

const ALL_IMAGES = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

export default function Hero() {
  const trackRef  = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const [idx,    setIdx]    = useState(0);
  const [query,  setQuery]  = useState("");
  const [going,  setGoing]  = useState(false);

  // GSAP marquee
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const W      = 200 + 12; // item width + gap
    const oneSet = MARQUEE_ITEMS.length * W;
    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: `-=${oneSet}`,
        duration: oneSet / 75,
        ease: "none",
        repeat: -1,
        modifiers: {
          x: (x) => `${gsap.utils.wrap(-oneSet, 0, parseFloat(x))}px`,
        },
      });
    });
    return () => ctx.revert();
  }, []);

  // Platform flip
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PLATFORMS.length), 2200);
    return () => clearInterval(t);
  }, []);

  const handleSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    setGoing(true);
    window.location.href = `/search?q=${encodeURIComponent(trimmed)}`;
  };

  const p = PLATFORMS[idx];

  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden pt-28 pb-20 min-h-screen">

      {/* ── Marquee strip — in flow so it doesn't collide with content ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.1 }}
        className="relative w-full overflow-hidden mb-12 md:mb-16"
        style={{ height: 148 }}
        aria-hidden="true"
      >
        <div
          ref={trackRef}
          className="flex gap-3 absolute top-0 left-0"
          style={{ willChange: "transform" }}
        >
          {ALL_IMAGES.map((img, i) => (
            <div
              key={i}
              className="shrink-0 rounded-2xl overflow-hidden"
              style={{
                width: 200, height: 148,
                border: "1px solid rgba(109,40,217,0.15)",
                background: "rgba(12,12,30,0.5)",
              }}
            >
              <img src={img.src} alt="" className="w-full h-full object-cover opacity-50" loading="lazy" />
            </div>
          ))}
        </div>
        {/* Edge fades */}
        <div className="absolute inset-y-0 left-0 w-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, var(--color-black), transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to left, var(--color-black), transparent)" }} />
      </motion.div>

      {/* ── Hero content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-4xl mx-auto">

        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pill pill-violet mb-6"
        >
          <Sparkles className="w-3 h-3" style={{ color: "#A78BFA" }} />
          Powered by Gemini AI · Real-time prices · No signup
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="display-xl text-balance mb-4"
        >
          <span style={{ color: "var(--text-primary)" }}>Compare prices across</span>
          <br />
          {/* Platform flip */}
          <span
            style={{
              display: "inline-block",
              minWidth: 280,
              minHeight: "1.1em",
              verticalAlign: "bottom",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={idx}
                initial={{ rotateX: 80, opacity: 0, y: 8 }}
                animate={{ rotateX: 0,  opacity: 1, y: 0 }}
                exit={{   rotateX: -80, opacity: 0, y: -8 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                style={{ color: p.color, display: "inline-block" }}
              >
                {p.name}
              </motion.span>
            </AnimatePresence>
          </span>
          <br />
          <span className="gradient-text">instantly.</span>
        </motion.h1>

        {/* Sub copy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          One search. Four stores. AI-ranked results with buying tips — so you always pay less.
        </motion.p>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-2xl mb-5"
        >
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
            className="flex gap-2 p-2 rounded-2xl glass"
            role="search"
            aria-label="Search products"
          >
            <label htmlFor="hero-search" className="sr-only">Search for a product</label>
            <div className="flex-1 flex items-center gap-3 px-3 min-w-0">
              <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <input
                ref={inputRef}
                id="hero-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "Nike shoes under ₹3000" or "boAt headphones"'
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                style={{ color: "var(--text-primary)" }}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={going}
              className="btn-primary shrink-0"
            >
              {going ? (
                <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <>Search <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </motion.div>

        {/* Quick searches */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.72 }}
          className="flex flex-wrap gap-2 justify-center mb-12"
          aria-label="Quick search suggestions"
        >
          <span className="text-xs self-center" style={{ color: "var(--text-muted)" }}>Try:</span>
          {QUICK_SEARCHES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSearch(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
              style={{
                background: "rgba(109,40,217,0.09)",
                border: "1px solid rgba(109,40,217,0.22)",
                color: "var(--text-secondary)",
              }}
            >
              {s}
            </button>
          ))}
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          {[
            { icon: Shield, text: "No account needed" },
            { icon: Zap,    text: "Results in under 5s" },
            { icon: Sparkles, text: "Gemini 2.0 Flash" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Icon className="w-3.5 h-3.5" />
              {text}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
