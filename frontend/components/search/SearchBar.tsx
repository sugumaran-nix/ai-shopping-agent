"use client";

import { useState, FormEvent } from "react";
import { Search, X, Filter } from "lucide-react";
import { motion } from "framer-motion";

const SITES = ["amazon", "flipkart", "meesho", "myntra"];
const SITE_LABELS: Record<string, string> = {
  amazon: "Amazon", flipkart: "Flipkart", meesho: "Meesho", myntra: "Myntra"
};
const SITE_COLORS: Record<string, string> = {
  amazon: "#FF9900", flipkart: "#2874F0", meesho: "#F43397", myntra: "#FF3F6C"
};

interface SearchBarProps {
  defaultQuery?: string;
  defaultSites?: string[];
  onSearch: (query: string, sites: string[]) => void;
  loading: boolean;
}

export default function SearchBar({ defaultQuery = "", defaultSites = SITES, onSearch, loading }: SearchBarProps) {
  const [query,        setQuery]        = useState(defaultQuery);
  const [selectedSites, setSelectedSites] = useState<string[]>(defaultSites);
  const [showFilters,  setShowFilters]  = useState(false);

  const toggleSite = (site: string) => {
    setSelectedSites(prev =>
      prev.includes(site)
        ? prev.length > 1 ? prev.filter(s => s !== site) : prev
        : [...prev, site]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) onSearch(query.trim(), selectedSites);
  };

  const clear = () => { setQuery(""); };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="glass rounded-2xl p-2 flex gap-2">
          <div className="flex-1 flex items-center gap-3 px-3">
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-secondary)" }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Search any product — "iPhone 15" or "kurta under 500"'
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
              style={{ color: "var(--text-primary)" }}
              minLength={2}
              required
              autoFocus
            />
            {query && (
              <button type="button" onClick={clear} className="p-1 rounded-full hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]">
                <X className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className="p-3 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]"
            style={{
              background: showFilters ? "rgba(109,40,217,0.2)" : "transparent",
              color: showFilters ? "var(--accent-violet)" : "var(--text-secondary)",
            }}
            title="Filter platforms"
            aria-label="Filter platforms"
            aria-expanded={showFilters}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-black)]"
            style={{ background: "var(--gradient-accent)" }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Platform filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 glass rounded-xl p-3 flex flex-wrap gap-2"
          >
            <span className="text-xs self-center mr-1" style={{ color: "var(--text-secondary)" }}>Platforms:</span>
            {SITES.map(site => {
              const active = selectedSites.includes(site);
              return (
                <button
                  key={site}
                  type="button"
                  onClick={() => toggleSite(site)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-violet)]"
                  style={{
                    background: active ? `${SITE_COLORS[site]}20` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? SITE_COLORS[site] + "60" : "rgba(255,255,255,0.08)"}`,
                    color: active ? SITE_COLORS[site] : "var(--text-secondary)",
                  }}
                >
                  {SITE_LABELS[site]}
                </button>
              );
            })}
          </motion.div>
        )}
      </form>
    </div>
  );
}
