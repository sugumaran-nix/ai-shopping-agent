"use client";

import Link from "next/link";
import { Zap, Github, ExternalLink } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",         href: "/" },
  { label: "Search",       href: "/search" },
  { label: "Features",     href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
];

const EXT_LINKS = [
  { label: "API Docs", href: "http://localhost:8000/docs" },
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

          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3 w-fit" aria-label="Shopiq home">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
              >
                <Zap className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">
                <span className="gradient-text">Shop</span>
                <span style={{ color: "var(--text-primary)" }}>iq</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              AI-powered price comparison across India&apos;s biggest e-commerce platforms.
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
                  <Link href={l.href} className="nav-link text-sm">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* External — FIXED: was missing <a opening tag */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Resources
            </p>
            <ul className="space-y-2.5">
              {EXT_LINKS.map((l) => (
                <li key={l.href}>
                  <a
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

        {/* Bottom — FIXED: was missing <a opening tag */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid rgba(109,40,217,0.12)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Shopiq · Built by{" "}
            <a
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
