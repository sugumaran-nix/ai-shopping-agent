"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Zap, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home",   href: "/" },
  { label: "Search", href: "/search" },
];

export default function Navbar() {
  const pathname  = usePathname();
  const navRef    = useRef<HTMLElement>(null);
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [hoverX,    setHoverX]    = useState<number | null>(null);
  const spotlightX  = useRef(0);
  const ambienceX   = useRef(0);

  const activeIndex = NAV_ITEMS.findIndex(item =>
    item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href))
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };
    const onLeave = () => {
      setHoverX(null);
      const item = nav.querySelector(`[data-active="true"]`) as HTMLElement;
      if (item) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const target = itemRect.left - navRect.left + itemRect.width / 2;
        animate(spotlightX.current, target, {
          type: "spring", stiffness: 200, damping: 20,
          onUpdate: v => { spotlightX.current = v; nav.style.setProperty("--spotlight-x", `${v}px`); }
        });
      }
    };
    nav.addEventListener("mousemove", onMove);
    nav.addEventListener("mouseleave", onLeave);
    return () => { nav.removeEventListener("mousemove", onMove); nav.removeEventListener("mouseleave", onLeave); };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const item = nav.querySelector(`[data-active="true"]`) as HTMLElement;
    if (!item) return;
    const navRect  = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const target   = itemRect.left - navRect.left + itemRect.width / 2;
    animate(ambienceX.current, target, {
      type: "spring", stiffness: 200, damping: 20,
      onUpdate: v => { ambienceX.current = v; nav.style.setProperty("--ambience-x", `${v}px`); }
    });
  }, [activeIndex, pathname]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3" : "py-5"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-accent)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="gradient-text">Shop</span>
            <span style={{ color: "var(--text-primary)" }}>iq</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav
          ref={navRef}
          className="hidden md:flex relative h-11 rounded-full overflow-hidden"
          style={{
            background: "rgba(13,13,26,0.6)",
            border: "1px solid rgba(109,40,217,0.25)",
            backdropFilter: "blur(20px)",
          }}
        >
          <ul className="relative flex items-center h-full px-2 z-10">
            {NAV_ITEMS.map((item, i) => {
              const isActive = i === activeIndex;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-active={isActive}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)] ${
                      isActive
                        ? "text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div
            className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
            style={{
              opacity: hoverX !== null ? 1 : 0,
              background: "radial-gradient(120px circle at var(--spotlight-x) 100%, rgba(109,40,217,0.15) 0%, transparent 50%)",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] z-[2]"
            style={{
              background: "radial-gradient(60px circle at var(--ambience-x) 0%, rgba(109,40,217,1) 0%, transparent 100%)",
            }}
          />
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 glow-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Search className="w-4 h-4" />
            Search Now
          </Link>
          <button
            className="md:hidden p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]"
            style={{ color: "var(--text-primary)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-2 mx-4 rounded-2xl p-4 glass" onClick={() => setMenuOpen(false)}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[rgba(109,40,217,0.15)]"
              style={{ color: "var(--text-primary)" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/search"
            className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Search className="w-4 h-4" /> Search Now
          </Link>
        </div>
      )}
    </header>
  );
}
