"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Menu, X, Github, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Home",         href: "/" },
  { label: "Search",       href: "/search" },
  { label: "Features",     href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const isCurrent = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(6,6,15,0.85)" : "rgba(6,6,15,0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid transparent",
        }}
      >
        <nav
          className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center gap-2 group" aria-label="Shopiq home">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
            >
              <Zap className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>
              Shopiq
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1" role="list">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="listitem"
                className="nav-link px-3 py-1.5 rounded-lg text-sm font-medium"
                aria-current={isCurrent(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* FIXED: was missing <a opening tag before href= */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="https://github.com/sugumaran-nix/ai-shopping-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost py-1.5 px-3 text-sm"
              aria-label="View source on GitHub (opens in new tab)"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
              GitHub
            </a>
            <Link href="/search" className="btn-primary py-1.5 px-4 text-sm">
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              Search Now
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen
              ? <X className="w-5 h-5" aria-hidden="true" />
              : <Menu className="w-5 h-5" aria-hidden="true" />
            }
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 inset-x-0 z-40 md:hidden"
            style={{
              background: "rgba(6,6,15,0.97)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
            }}
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] flex items-center"
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {/* FIXED: was missing <a opening tag */}
              <div
                className="border-t mt-2 pt-3 flex gap-2"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                <a
                  href="https://github.com/sugumaran-nix/ai-shopping-agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost flex-1 justify-center text-sm py-2 min-h-[44px]"
                  aria-label="View source on GitHub (opens in new tab)"
                >
                  <Github className="w-4 h-4" aria-hidden="true" /> GitHub
                </a>
                <Link
                  href="/search"
                  className="btn-primary flex-1 justify-center text-sm py-2 min-h-[44px]"
                  onClick={() => setMenuOpen(false)}
                >
                  <Search className="w-3.5 h-3.5" aria-hidden="true" /> Search
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
