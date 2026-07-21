"use client";

import Link from "next/link";
import { Zap, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t py-12 px-4" style={{ borderColor: "var(--glass-border)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-accent)" }}>
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold">
            <span className="gradient-text">Shop</span>
            <span style={{ color: "var(--text-primary)" }}>iq</span>
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">Home</Link>
          <Link href="/search" className="hover:text-[var(--text-primary)] transition-colors">Search</Link>
          <a
            href="https://github.com/sugumaran-nix/ai-shopping-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
        </div>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Built by Sugumaran &middot; Next.js + FastAPI + Gemini AI
        </p>
      </div>
    </footer>
  );
}
