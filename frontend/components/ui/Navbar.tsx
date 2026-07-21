"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { animate, motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Zap, Menu, X, Github } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home",         href: "/" },
  { label: "Search",       href: "/search" },
  { label: "Features",     href: "/#features" },
  { label: "How it works", href: "/#howitworks" },
];

export default function Navbar() {
  const pathname = usePathname();
  const navRef   = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const spotlightX = useRef(0);
  const ambienceX  = useRef(0);
  const [hovered,  setHovered]  = useState(false);

  const activeIndex = NAV_ITEMS.findIndex(
    (item) => item.href === pathname || (item.href !== "/" && !item.href.startsWith("/#") && pathname.startsWith(item.href))
  );

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Spotlight follows cursor
  const handleNavMove = useCallback((e: MouseEvent) => {
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    const x = e.clientX - rect.left;
    spotlightX.current = x;
    nav.style.setProperty("--spotlight-x", `${x}px`);
    setHovered(true);
  }, []);

  const handleNavLeave = useCallback(() => {
    setHovered(false);
    const nav = navRef.current;
    const item = nav?.querySelector(`[data-active="true"]`) as HTMLElement | null;
    if (!nav || !item) return;
    const navRect  = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const target   = itemRect.left - navRect.left + itemRect.width / 2;
    animate(spotlightX.current, target, {
      type: "spring", stiffness: 220, damping: 22,
      onUpdate: (v) => { spotlightX.current = v; nav.style.setProperty("--spotlight-x", `${v}px`); },
    });
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.addEventListener("mousemove", handleNavMove);
    nav.addEventListener("mouseleave", handleNavLeave);
    return () => { nav.removeEventListener("mousemove", handleNavMove); nav.removeEventListener("mouseleave", handleNavLeave); };
  }, [handleNavMove, handleNavLeave]);

  // Ambience tracks active item
  useEffect(() => {
    const nav  = navRef.current;
    const item = nav?.querySelector(`[data-active="true"]`) as HTMLElement | null;
    if (!nav || !item) return;
    const navRect  = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const target   = itemRect.left - navRect.left + itemRect.width / 2;
    animate(ambienceX.current, target, {
      type: "spring", stiffness: 220, damping: 22,
      onUpdate: (v) => { ambienceX.current = v; nav.style.setProperty("--ambience-x", `${v}px`); },
    });
  }, [activeIndex, pathname]);

  return (
    <header
      role="banner"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-2.5" : "py-4"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label="Shopiq home">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center shadow-lg"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-[1.05rem] tracking-tight leading-none">
            <span className="gradient-text">Shop</span>
            <span style={{ color: "var(--text-primary)" }}>iq</span>
          </span>
        </Link>

        {/* Desktop nav pill */}
        <nav
          ref={navRef}
          aria-label="Main navigation"
          className="hidden md:flex relative h-10 rounded-full overflow-hidden"
          style={{
            background: scrolled ? "rgba(12,12,30,0.85)" : "rgba(12,12,30,0.6)",
            border: "1px solid rgba(109,40,217,0.22)",
            backdropFilter: "blur(24px)",
          }}
        >
          <ul className="relative flex items-center h-full px-1.5 z-10 list-none">
            {NAV_ITEMS.map((item, i) => {
              const isActive = i === activeIndex;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-active={isActive}
                    className="px-3.5 py-1.5 text-[0.8rem] font-medium rounded-full block transition-colors duration-150"
                    style={{ color: isActive ? "#fff" : "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = isActive ? "#fff" : "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? "#fff" : "var(--text-secondary)")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Hover spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-200"
            style={{
              opacity: hovered ? 1 : 0,
              background: "radial-gradient(100px circle at var(--spotlight-x, 50%) 200%, rgba(109,40,217,0.18) 0%, transparent 65%)",
            }}
          />
          {/* Active ambience underline */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px z-[2]"
            style={{
              background: "radial-gradient(56px circle at var(--ambience-x, 50%) 0%, rgba(109,40,217,0.9) 0%, transparent 100%)",
            }}
          />
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://github.com/sugumaran-nix/ai-shopping-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex btn-ghost py-2 px-3 text-[0.8rem]"
            aria-label="View source on GitHub"
          >
            <Github className="w-4 h-4" />
            <span className="hidden xl:inline">GitHub</span>
          </a>
          <Link
            href="/search"
            className="hidden md:flex btn-primary py-2.5 px-4 text-[0.8rem]"
          >
            <Search className="w-3.5 h-3.5" />
            Search Now
          </Link>
          <button
            className="md:hidden p-2.5 rounded-xl"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="md:hidden mx-3 mt-2 rounded-2xl p-3 glass"
          >
            <nav>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && !item.href.startsWith("/#") && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      color: isActive ? "#fff" : "var(--text-secondary)",
                      background: isActive ? "rgba(109,40,217,0.15)" : "transparent",
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
              <Link
                href="/search"
                className="btn-primary w-full justify-center"
                onClick={() => setMenuOpen(false)}
              >
                <Search className="w-4 h-4" /> Start Searching — It&apos;s Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
