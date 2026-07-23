"use client";

import Link from "next/link";
import { Zap, Github, ExternalLink } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",         href: "/" },
  { label: "Search",       href: "/search" },
  { label: "Features",     href: "/#features" },
  // Fixed: was "/#howitworks" (old ID) — matches the fixed id="how-it-works" in HowItWorks.tsx
  { label: "How it works", href: "/#how-it-works" },
];

const EXT_LINKS = [
  // Updated to match the actual API_BASE URL used in lib/api.ts
  { label: "API Docs", href: "https://ai-shopping-agent-backend-z0wq.onrender.com/docs" },
  { label: "GitHub",   href: "https://github.com/sugumaran-nix/ai-shopping-agent" },
];

const PLATFORMS = ["Amazon", "Flipkart", "Meesho", "Myntra"];

export default function Footer() {
  return (
    <footer aria-label="Site footer" className="mt-8 px-4 pb-10">
      <div
        className="max-w-6xl mx-auto rounded-2xl glass px-8 py-10"
        style={{ border: "1px solid rgba(109,40,217,0.15)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          {/* Brand column */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3 w-fit" aria-label="Shopiq home">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Zap className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">
                <span className="gradient-text">Shop</span>
                <span style={{ color: "var(--text-primary)" }}>iq</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              AI-powered price comparison across the four biggest Indian e-commerce platforms. Find the best deal in seconds.
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(109,40,217,0.1)",
                    border: "1px solid rgba(109,40,217,0.2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Navigation
            </p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  {/* nav-link class handles both hover and :focus-visible color change */}
                  <Link href={l.href} className="nav-link text-sm">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* External */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Resources
            </p>
            <ul className="space-y-2.5">
              {EXT_LINKS.map((l) => (
                <li key={l.href}>
                  
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-link flex items-center gap-1.5 text-sm"
                    aria-label={`${l.label} (opens in new tab)`}
                  >
                    {l.label === "GitHub"
                      ? <Github className="w-3.5 h-3.5" aria-hidden="true" />
                      : <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    }
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid rgba(109,40,217,0.12)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Shopiq. Built by{" "}
            
              href="https://github.com/sugumaran-nix"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link inline"
              aria-label="Sugumaran's GitHub (opens in new tab)"
            >
              Sugumaran
            </a>
            {" "}· Next.js + FastAPI + Gemini AI
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Not affiliated with Amazon, Flipkart, Meesho or Myntra.
          </p>
        </div>
      </div>
    </footer>
  );
}
