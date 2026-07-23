"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { SITE_META } from "@/lib/api";

const SITES = ["amazon", "flipkart", "meesho", "myntra"] as const;

interface SearchBarProps {
  onSearch: (query: string, sites: string[]) => void;
  loading: boolean;
  defaultQuery?: string;
}

export default function SearchBar({ onSearch, loading, defaultQuery = "" }: SearchBarProps) {
  const [query,         setQuery]         = useState(defaultQuery);
  const [selectedSites, setSelectedSites] = useState<string[]>([...SITES]);
  const [showFilters,   setShowFilters]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allSelected = selectedSites.length === SITES.length;

  const toggleSite = (site: string) => {
    setSelectedSites((prev) =>
      prev.includes(site)
        ? prev.length > 1 ? prev.filter((s) => s !== site) : prev
        : [...prev, site]
    );
  };

  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim(), selectedSites);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} role="search" aria-label="Product search">
        <div className="group relative glass rounded-2xl p-1.5 flex gap-1.5 transition-all duration-300 search-sweep focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-500/40">
          <label htmlFor="search-input" className="sr-only">Search for a product</label>

          <div className="flex-1 flex items-center gap-3 px-3 min-w-0 relative z-10">
            <Search
              className="w-4 h-4 shrink-0 text-gray-500 group-focus-within:text-violet-400 transition-colors"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search any product — "iPhone 15" or "kurta under ₹500"'
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-600 text-white"
              style={{ fontSize: "1rem" }}
              minLength={2}
              required
              // autoFocus REMOVED: unconditional autoFocus pops the mobile keyboard
              // immediately on /search page load, covering the viewport before results arrive.
              // The Hero input handles focus for the landing page separately.
              autoComplete="off"
              spellCheck={false}
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={clear}
                  className="p-1.5 rounded-full hover:bg-white/10 shrink-0 text-gray-500 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`p-2.5 rounded-xl transition-all shrink-0 relative z-10 min-w-[44px] min-h-[44px] flex items-center justify-center ${
              showFilters
                ? "bg-violet-500/15 text-violet-300"
                : "hover:bg-white/5 text-gray-400 hover:text-white"
            }`}
            aria-label={showFilters ? "Hide platform filters" : "Show platform filters"}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            {!allSelected && !showFilters && (
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-[#0C0C1E]"
                aria-label="Some platforms are filtered"
              />
            )}
          </button>

          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="btn-primary shrink-0 py-2.5 px-4 sm:px-6 text-sm relative z-10 min-h-[44px]"
            aria-label={loading ? "Searching…" : "Search"}
          >
            {loading ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                {/* Hidden on very small screens to prevent button overflow at 320px */}
                <span className="hidden sm:inline">Searching…</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 glass rounded-xl px-4 py-3 flex flex-wrap items-center gap-2.5 border border-white/5">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
                  Stores:
                </span>
                {SITES.map((site) => {
                  const active = selectedSites.includes(site);
                  const m      = SITE_META[site];
                  return (
                    <motion.button
                      key={site}
                      type="button"
                      onClick={() => toggleSite(site)}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-[36px] ${
                        active ? "shadow-lg" : "hover:bg-white/5"
                      }`}
                      style={{
                        background: active ? `${m.color}20` : "transparent",
                        border: `1px solid ${active ? m.color + "60" : "rgba(255,255,255,0.08)"}`,
                        color: active ? m.color : "var(--text-secondary)",
                      }}
                      aria-pressed={active}
                    >
                      {m.label}
                    </motion.button>
                  );
                })}
                {!allSelected && (
                  <button
                    type="button"
                    onClick={() => setSelectedSites([...SITES])}
                    className="text-xs font-medium text-violet-400 hover:text-violet-300 underline underline-offset-4 ml-auto transition-colors"
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
