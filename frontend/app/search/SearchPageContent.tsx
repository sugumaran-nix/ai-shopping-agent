"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, ChevronDown, Search, Link2, Check } from "lucide-react";

import SearchBar   from "@/components/search/SearchBar";
import ProductCard from "@/components/search/ProductCard";
import AIAnalysis  from "@/components/search/AIAnalysis";
import SiteFilter  from "@/components/search/SiteFilter";
import EmptyState  from "@/components/search/EmptyState";
import ErrorState  from "@/components/search/ErrorState";
import { GridSkeleton, AnalysisSkeleton } from "@/components/search/SearchSkeleton";
import { searchProducts } from "@/lib/api";
import { Product, SearchResponse } from "@/types";

type SortKey = "price_asc" | "price_desc" | "rating" | "discount";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating",     label: "Best Rated" },
  { value: "discount",   label: "Biggest Discount" },
];

const ALL_SITES = ["amazon", "flipkart", "meesho", "myntra"];

// How long to wait before showing the "backend warming up" message
const COLD_START_THRESHOLD_MS = 5000;

export default function SearchPageContent() {
  const params   = useSearchParams();
  const router   = useRouter();
  const initQ    = params.get("q") || "";

  const [result,     setResult]     = useState<SearchResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [slowLoad,   setSlowLoad]   = useState(false); // Cold-start UX
  const [error,      setError]      = useState<string | null>(null);
  const [currentQ,   setCurrentQ]   = useState(initQ);
  const [siteFilter, setSiteFilter] = useState("all");
  const [sort,       setSort]       = useState<SortKey>("price_asc");
  const [sortOpen,   setSortOpen]   = useState(false);
  const [copied,     setCopied]     = useState(false); // Share button

  const sortRef  = useRef<HTMLDivElement>(null);
  // AbortController ref: cancel the previous in-flight fetch when a new search starts
  const abortRef = useRef<AbortController | null>(null);

  // Close sort dropdown on outside click or Escape key
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const doSearch = useCallback(
    async (query: string, sites: string[]) => {
      if (!query || query.trim().length < 2) return;

      // Cancel any in-flight request to prevent stale results overwriting newer ones
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setSlowLoad(false);
      setError(null);
      setResult(null);
      setSiteFilter("all");
      setCurrentQ(query);
      router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });

      // Show cold-start message if backend takes longer than threshold
      const slowTimer = setTimeout(() => setSlowLoad(true), COLD_START_THRESHOLD_MS);

      try {
        const data = await searchProducts({ query, sites }, controller.signal);
        // Only update state if this request wasn't cancelled by a newer search
        if (!controller.signal.aborted) {
          setResult(data);
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return; // Expected: newer search cancelled this one
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Search failed. Please try again.");
        }
      } finally {
        clearTimeout(slowTimer);
        if (!controller.signal.aborted) {
          setLoading(false);
          setSlowLoad(false);
        }
      }
    },
    [router]
  );

  // Auto-search from URL param on first mount
  useEffect(() => {
    if (initQ.trim().length >= 2) {
      doSearch(initQ, ALL_SITES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayed = useMemo<Product[]>(() => {
    if (!result) return [];
    const prods =
      siteFilter === "all"
        ? result.products
        : result.products.filter((p) => p.site === siteFilter);

    return [...prods].sort((a, b) => {
      switch (sort) {
        case "price_asc":  return a.price - b.price;
        case "price_desc": return b.price - a.price;
        case "rating":     return (b.rating ?? 0) - (a.rating ?? 0);
        case "discount":   return (b.discount ?? 0) - (a.discount ?? 0);
        default:           return 0;
      }
    });
  }, [result, siteFilter, sort]);

  const siteCounts = useMemo(() => {
    if (!result) return {} as Record<string, number>;
    return result.products.reduce<Record<string, number>>((acc, p) => {
      acc[p.site] = (acc[p.site] ?? 0) + 1;
      return acc;
    }, {});
  }, [result]);

  const hasResults       = !!result && result.products.length > 0;
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  const shareSearch = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g., non-HTTPS dev env) — silently skip
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Search bar */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <SearchBar defaultQuery={initQ} onSearch={doSearch} loading={loading} />
        </div>

        {/* Result heading + item count + share — shown when results exist */}
        {(hasResults || loading) && (
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={currentQ + loading.toString()}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="display-md gradient-text"
                  aria-live="polite"
                >
                  {loading
                    ? `Searching for "${currentQ}"…`
                    : `${result!.total_results} results for "${currentQ}"`
                  }
                </motion.h1>
              </AnimatePresence>
              {/* Item count shown here so it stays near the heading on wrap */}
              {!loading && hasResults && (
                <span
                  className="text-xs tabular-nums px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    color: "var(--text-muted)",
                  }}
                >
                  {displayed.length} shown
                </span>
              )}
            </div>

            {/* Share button — copy current URL to clipboard */}
            {hasResults && !loading && (
              <button
                type="button"
                onClick={shareSearch}
                className="btn-ghost text-xs py-1.5 px-3 min-h-[36px] shrink-0"
                aria-label="Copy search link to clipboard"
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5" aria-hidden="true" /> Copied!</>
                  : <><Link2 className="w-3.5 h-3.5" aria-hidden="true" /> Share</>
                }
              </button>
            )}
          </div>
        )}

        {/* Cold-start message — shown after 5s of loading */}
        <AnimatePresence>
          {loading && slowLoad && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.2)",
                color: "var(--text-secondary)",
              }}
              role="status"
              aria-live="polite"
            >
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
                style={{ borderColor: "rgba(124,58,237,0.3)", borderTopColor: "#7C3AED" }}
                aria-hidden="true"
              />
              Backend is warming up (free hosting) — results usually arrive in 20–30&nbsp;s on the first search of the day.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanning status */}
        <AnimatePresence>
          {loading && !slowLoad && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm mb-6"
              style={{ color: "var(--text-secondary)" }}
              role="status"
              aria-live="polite"
            >
              Scanning Amazon, Flipkart, Meesho &amp; Myntra in parallel&hellip;
            </motion.p>
          )}
        </AnimatePresence>

        {/* Skeletons */}
        {loading && <div className="mb-6"><AnalysisSkeleton /></div>}
        {loading && <GridSkeleton count={8} />}

        {/* AI Analysis */}
        {hasResults && !loading && (
          <div className="mb-6">
            <AIAnalysis
              analysis={result!.ai_analysis}
              query={result!.query}
              total={result!.total_results}
            />
          </div>
        )}

        {/* Filter + sort bar */}
        {hasResults && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-6"
          >
            <SiteFilter
              selected={siteFilter}
              onChange={setSiteFilter}
              counts={siteCounts}
              total={result!.total_results}
            />

            <div className="flex items-center gap-2">
              <ArrowUpDown
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-colors min-h-[36px]"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                    minWidth: 168,
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  aria-label={`Sort by: ${currentSortLabel}`}
                >
                  <span className="flex-1 text-left">{currentSortLabel}</span>
                  <ChevronDown
                    className="w-3.5 h-3.5 shrink-0 transition-transform"
                    style={{
                      color: "var(--text-muted)",
                      transform: sortOpen ? "rotate(180deg)" : "none",
                    }}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      key="sort-dd"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-full mt-1.5 glass rounded-xl overflow-hidden z-30"
                      style={{ minWidth: 180 }}
                      role="listbox"
                      aria-label="Sort options"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          role="option"
                          aria-selected={o.value === sort}
                          onClick={() => { setSort(o.value); setSortOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/[0.05] min-h-[40px]"
                          style={{
                            color: o.value === sort ? "#A78BFA" : "var(--text-secondary)",
                            fontWeight: o.value === sort ? 600 : 400,
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* Product grid */}
        {!loading && hasResults && displayed.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayed.map((product, i) => (
              <ProductCard
                key={`${product.product_url}-${i}`}
                product={product}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Site filter returned 0 for selected platform */}
        {!loading && hasResults && displayed.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            aria-live="polite"
            className="flex flex-col items-center py-20 text-center"
          >
            <p className="text-4xl mb-4" aria-hidden="true">🔍</p>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              No results on {siteFilter.charAt(0).toUpperCase() + siteFilter.slice(1)}
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              This platform didn&apos;t return results for that search.
            </p>
            <button
              type="button"
              onClick={() => setSiteFilter("all")}
              className="text-sm underline underline-offset-2 transition-colors min-h-[44px] px-4"
              style={{ color: "var(--accent-violet)" }}
            >
              Show all platforms
            </button>
          </motion.div>
        )}

        {/* No results from API */}
        {!loading && result && result.products.length === 0 && (
          <EmptyState
            query={currentQ}
            onReset={() => { setResult(null); setError(null); }}
            onSearch={(q) => doSearch(q, ALL_SITES)}
          />
        )}

        {/* Error */}
        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => doSearch(currentQ, ALL_SITES)}
          />
        )}

        {/* Idle state — no search yet */}
        {!loading && !result && !error && !currentQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-24 text-center"
            role="status"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 glass-card"
              style={{ border: "1px solid rgba(124,58,237,0.28)" }}
            >
              <Search className="w-7 h-7" style={{ color: "var(--accent-violet)" }} aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Find the best price across 4 stores
            </h1>
            <p className="text-sm max-w-sm" style={{ color: "var(--text-secondary)" }}>
              Type any product — iPhone, kurta, boAt headphones — and get AI-ranked results in seconds.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
