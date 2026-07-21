"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import gsap from "gsap";

// Real Indian e-commerce product images (Unsplash CDN — free)
const MARQUEE_IMAGES = [
  { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop", alt: "Watch" },
  { src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop", alt: "Sneakers" },
  { src: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300&h=300&fit=crop", alt: "Perfume" },
  { src: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=300&h=300&fit=crop", alt: "Running shoes" },
  { src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop", alt: "Headphones" },
  { src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=300&fit=crop", alt: "Camera" },
  { src: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=300&h=300&fit=crop", alt: "Shoes" },
  { src: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop", alt: "Sunglasses" },
  { src: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop", alt: "Bag" },
  { src: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=300&fit=crop", alt: "Fashion" },
];

const FLIP_WORDS = ["SEARCHING", "COMPARING", "ANALYZING", "FINDING", "SAVING"];

const SITE_LOGOS = [
  { name: "Amazon",   color: "#FF9900", letter: "A" },
  { name: "Flipkart", color: "#2874F0", letter: "F" },
  { name: "Meesho",   color: "#F43397", letter: "M" },
  { name: "Myntra",   color: "#FF3F6C", letter: "M" },
];

// Duplicate for seamless loop
const ALL_IMAGES = [...MARQUEE_IMAGES, ...MARQUEE_IMAGES];

export default function Hero() {
  const trackRef  = useRef<HTMLDivElement>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const [query, setQuery]     = useState("");

  // GSAP marquee
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const itemW = 200 + 16; // width + gap
    const oneSet = MARQUEE_IMAGES.length * itemW;
    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: `-=${oneSet}`,
        duration: oneSet / 80,
        ease: "none",
        repeat: -1,
        modifiers: {
          x: (x) => `${gsap.utils.wrap(-oneSet, 0, parseFloat(x))}px`,
        },
      });
    });
    return () => ctx.revert();
  }, []);

  // Flip words
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % FLIP_WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden pt-28 md:pt-32 pb-20">

      {/* Marquee strip — sits in flow at the top of the hero */}
      <div className="relative w-full overflow-hidden mb-14 md:mb-16" style={{ height: 150 }} aria-hidden="true">
        <div ref={trackRef} className="flex gap-4 absolute top-0 left-0" style={{ willChange: "transform" }}>
          {ALL_IMAGES.map((img, i) => (
            <div
              key={i}
              className="shrink-0 rounded-2xl overflow-hidden glass"
              style={{ width: 190, height: 150 }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover opacity-50"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, var(--color-black), transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-32 pointer-events-none z-10"
          style={{ background: "linear-gradient(to left, var(--color-black), transparent)" }} />
      </div>

      {/* Centre content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8 glass"
          style={{ color: "var(--text-secondary)" }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-violet)" }} />
          <span className="hidden sm:inline">Powered by Gemini AI · Searches Amazon, Flipkart, Meesho &amp; Myntra</span>
          <span className="sm:hidden">Powered by Gemini AI</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6 text-balance"
        >
          <span style={{ color: "var(--text-primary)" }}>Search </span>
          <span className="gradient-text">Smarter.</span>
          <br />
          <span style={{ color: "var(--text-primary)" }}>Shop Better.</span>
        </motion.h1>

        {/* Flip word */}
        <div className="h-10 flex items-center justify-center gap-3 mb-6">
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIdx}
              initial={{ rotateX: 90, opacity: 0, y: 10 }}
              animate={{ rotateX: 0,  opacity: 1, y: 0  }}
              exit={{    rotateX: -90, opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.2, 0.65, 0.3, 0.9] }}
              className="text-lg md:text-2xl font-bold tracking-widest"
              style={{
                color: "var(--accent-violet)",
                fontVariantNumeric: "tabular-nums",
                display: "inline-block",
              }}
            >
              {FLIP_WORDS[wordIdx]}
            </motion.span>
          </AnimatePresence>
          <span className="text-base md:text-xl font-medium" style={{ color: "var(--text-secondary)" }}>
            across 4 platforms
          </span>
        </div>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-base md:text-lg max-w-xl mb-10 leading-relaxed text-pretty"
          style={{ color: "var(--text-secondary)" }}
        >
          One search. Four stores. AI picks the best deal for you — instantly.
        </motion.p>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-xl mb-8"
        >
          <form
            onSubmit={e => { e.preventDefault(); if (query.trim()) window.location.href = `/search?q=${encodeURIComponent(query.trim())}` }}
            className="flex gap-2 glass rounded-2xl p-2"
          >
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-secondary)" }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Try "Nike shoes under 3000" or "boAt headphones"'
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] shrink-0"
              style={{ background: "var(--gradient-accent)" }}
            >
              Search <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>

        {/* Site logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-2.5 flex-wrap justify-center"
        >
          <span className="text-xs mr-1" style={{ color: "var(--text-muted)" }}>Searches across</span>
          {SITE_LOGOS.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: `${s.color}14`,
                border: `1px solid ${s.color}33`,
                color: s.color,
              }}
            >
              <span className="font-black">{s.letter}</span>
              {s.name}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
