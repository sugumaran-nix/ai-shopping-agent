"use client";

import { useState, FormEvent, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SITES = ["amazon", "flipkart", "meesho", "myntra"] as const;
const SITE_META: Record<string, { label: string; color: string }> = {
  amazon:   { label: "Amazon",   color: "#FF9900" },
  flipkart: { label: "Flipkart", color: "#2874F0" },
  meesho:   { label: "Meesho",   color: "#F43397" },
  myntra:   { label: "Myntra",   color: "#FF3F6C" },
};

interface SearchBarProps {
  defaultQuery?: string;
  defaultSites?: string[];
  onSearch: (query: string, sites: string[]) => void;
  loading: boolean;
}

export default function SearchBar({ defaultQuery = "", defaultSites = [...SITES], onSearch, loading }: SearchBarProps) {
  const [query,          setQuery]          = useState(defaultQuery);
  const [selectedSites,  setSelectedSites]  = useState<string[]>(defaultSites);
  const [showFilters,    setShowFilters]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSite = (site: string) => {
    setSelectedSites((prev) =>
      prev.includes(site)
        ? prev.length > 1 ? prev.filter((s) => s !== site) : prev
        : [...prev, site]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) onSearch(query.trim(), selectedSites);
  };

  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const allSelected = selectedSites.length === SITES.length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} role="search" aria-label="Product search">
        <div className="glass rounded-2xl p-2 flex gap-2">
          <label htmlFor="search-input" className="sr-only">Search for a product</label>
          <div className="flex-1 flex items-center gap-2.5 px-3 min-w-0">
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search any product — "iPhone 15" or "kurta under ₹500"'
              className="flex-1 min-w-0 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
              minLength={2}
              required
              autoFocus
              autoComplete="off"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={clear}
                  className="p-1.5 rounded-full hover:bg-white/10 shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Platform filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="p-2.5 rounded-xl transition-colors shrink-0 relative"
            aria-label={showFilters ? "Hide platform filters" : "Show platform filters"}
            aria-pressed={showFilters}
            style={{
              background: showFilters ? "rgba(109,40,217,0.2)" : "transparent",
              color: showFilters ? "#A78BFA" : "var(--text-secondary)",
            }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {!allSelected && !showFilters && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "var(--accent-violet)" }}
                aria-label="Custom platforms selected"
              />
            )}
          </button>

          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="btn-primary shrink-0 py-2.5 px-5 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Searching…</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" aria-hidden="true" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Platform filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 glass rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Platforms:</span>
                {SITES.map((site) => {
                  const active = selectedSites.includes(site);
                  const m = SITE_META[site];
                  return (
                    <button
                      key={site}
                      type="button"
                      onClick={() => toggleSite(site)}
                      aria-pressed={active}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: active ? `${m.color}18` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${active ? m.color + "55" : "rgba(255,255,255,0.08)"}`,
                        color: active ? m.color : "var(--text-secondary)",
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
                {!allSelected && (
                  <button
                    type="button"
                    onClick={() => setSelectedSites([...SITES])}
                    className="text-xs underline underline-offset-2 ml-auto"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Select all
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
