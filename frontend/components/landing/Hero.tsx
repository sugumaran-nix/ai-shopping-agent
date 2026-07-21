"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import gsap from "gsap";

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

const FLIP_WORDS = [
  { text: "AMAZON",   color: "#FF9900" },
  { text: "FLIPKART", color: "#2874F0" },
  { text: "MEESHO",   color: "#F43397" },
  { text: "MYNTRA",   color: "#FF3F6C" },
];

const ALL_IMAGES = [...MARQUEE_IMAGES, ...MARQUEE_IMAGES];

export default function Hero() {
  const trackRef  = useRef<HTMLDivElement>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const [query, setQuery]     = useState("");
  const router = useRouter();

  // GSAP marquee
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const itemW = 200 + 16;
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
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">

      {/* Marquee strip — floats at top */}
      <div className="absolute top-20 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: 180 }}>
        <div ref={trackRef} className="flex gap-4 absolute top-0 left-0" style={{ willChange: "transform" }}>
          {ALL_IMAGES.map((img, i) => (
            <div
              key={i}
              className="shrink-0 rounded-2xl overflow-hidden relative"
              style={{
                width: 200, height: 160,
                border: "1px solid var(--glass-border)",
                background: "var(--glass-bg)",
              }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="200px"
                className="object-cover opacity-60"
              />
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-24 pointer-events-none"
          style={{ background: "linear-gradient(to right, var(--color-black), transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-24 pointer-events-none"
          style={{ background: "linear-gradient(to left, var(--color-black), transparent)" }} />
      </div>

      {/* Centre content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 mt-28">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6"
          style={{
            background: "rgba(109,40,217,0.12)",
            border: "1px solid rgba(109,40,217,0.3)",
            color: "var(--text-primary)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-violet)" }} />
          Powered by Gemini AI · Searches Amazon, Flipkart, Meesho {"&"} Myntra
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-4"
        >
          <span style={{ color: "var(--text-primary)" }}>Compare Prices.</span>
          <br />
          <span className="gradient-text">Buy Smarter.</span>
        </motion.h1>

        {/* Flip word */}
        <div className="h-12 flex items-center justify-center my-4">
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIdx}
              initial={{ rotateX: 90, opacity: 0, y: 10 }}
              animate={{ rotateX: 0,  opacity: 1, y: 0  }}
              exit={{    rotateX: -90, opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.2, 0.65, 0.3, 0.9] }}
              className="text-2xl md:text-3xl font-bold tracking-widest"
              style={{
                color: FLIP_WORDS[wordIdx].color,
                fontVariantNumeric: "tabular-nums",
                display: "inline-block",
              }}
            >
              {FLIP_WORDS[wordIdx].text}
            </motion.span>
          </AnimatePresence>
          <span className="ml-3 text-xl md:text-2xl font-medium" style={{ color: "var(--text-secondary)" }}>
            compared instantly
          </span>
        </div>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-base md:text-lg max-w-xl mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          Search once across Amazon, Flipkart, Meesho and Myntra. Gemini AI picks the best deal.
        </motion.p>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-xl mb-8"
        >
          <form
            onSubmit={e => { e.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`) }}
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
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-black)]"
              style={{ background: "var(--gradient-accent)" }}
            >
              Search <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
