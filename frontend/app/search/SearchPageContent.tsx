"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";

import SearchBar    from "@/components/search/SearchBar";
import ProductCard  from "@/components/search/ProductCard";
import AIAnalysis   from "@/components/search/AIAnalysis";
import SiteFilter   from "@/components/search/SiteFilter";
import EmptyState   from "@/components/search/EmptyState";
import ErrorState   from "@/components/search/ErrorState";
import { GridSkeleton, AnalysisSkeleton } from "@/components/search/SearchSkeleton";
import { searchProducts } from "@/lib/api";
import { Product, SearchResponse } from "@/types";

type SortKey = "price_asc" | "price_desc" | "rating" | "discount";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating",     label: "Best Rated" },
  { value: "discount",   label: "Biggest Discount" },
];

export default function SearchPageContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const initQ   = params.get("q") || "";

  const [result,     setResult]     = useState<SearchResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [currentQ,   setCurrentQ]   = useState(initQ);
  const [siteFilter, setSiteFilter] = useState("all");
  const [sort,       setSort]       = useState<SortKey>("price_asc");
  const [sortOpen,   setSortOpen]   = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (query: string, sites: string[]) => {
    if (!query || query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSiteFilter("all");
    setCurrentQ(query);
    router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });

    try {
      const data = await searchProducts({ query, sites });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Auto-search from URL param
  useEffect(() => {
    if (initQ.trim().length >= 2) {
      doSearch(initQ, ["amazon", "flipkart", "meesho", "myntra"]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayed = useMemo<Product[]>(() => {
    if (!result) return [];
    const prods = siteFilter === "all"
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

  const hasResults = !!result && result.products.length > 0;
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  // Dynamic page heading
  const heading = currentQ
    ? loading
      ? `Searching for "${currentQ}"…`
      : hasResults
        ? `${result!.total_results} results for "${currentQ}"`
        : `No results for "${currentQ}"`
    : "Search products";

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Search header */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <AnimatePresence mode="wait">
            <motion.h1
              key={heading}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="display-md gradient-text text-center text-balance"
              aria-live="polite"
            >
              {heading}
            </motion.h1>
          </AnimatePresence>
          <SearchBar defaultQuery={initQ} onSearch={doSearch} loading={loading} />
        </div>

        {/* Loading status text */}
        <AnimatePresence>
          {loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm mb-6"
              style={{ color: "var(--text-secondary)" }}
              aria-live="polite"
            >
              Scanning Amazon, Flipkart, Meesho &amp; Myntra in parallel&hellip;
            </motion.p>
          )}
        </AnimatePresence>

        {/* AI Analysis skeleton */}
        {loading && <div className="mb-6"><AnalysisSkeleton /></div>}

        {/* AI Analysis */}
        {hasResults && !loading && (
          <div className="mb-6">
            <AIAnalysis analysis={result!.ai_analysis} query={result!.query} total={result!.total_results} />
          </div>
        )}

        {/* Filters + sort bar */}
        {hasResults && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-6"
          >
            <SiteFilter selected={siteFilter} onChange={setSiteFilter} counts={siteCounts} total={result!.total_results} />

            {/* Custom sort dropdown — no native <select> */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-colors"
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
                          className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/[0.05]"
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

              <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                {displayed.length} item{displayed.length !== 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        )}

        {/* Product grid */}
        {loading && <GridSkeleton count={8} />}

        {!loading && hasResults && displayed.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayed.map((product, i) => (
              <ProductCard key={`${product.product_url}-${i}`} product={product} index={i} />
            ))}
          </div>
        )}

        {/* Filter-empty guard */}
        {!loading && hasResults && displayed.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            aria-live="polite"
            className="flex flex-col items-center py-20 text-center"
          >
            <p className="text-4xl mb-4">🔍</p>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              No results on {siteFilter.charAt(0).toUpperCase() + siteFilter.slice(1)}
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              This platform didn&apos;t return results for that search.
            </p>
            <button
              type="button"
              onClick={() => setSiteFilter("all")}
              className="text-sm underline underline-offset-2 transition-colors"
              style={{ color: "var(--accent-violet)" }}
            >
              Show all platforms
            </button>
          </motion.div>
        )}

        {/* No results */}
        {!loading && result && result.products.length === 0 && (
          <EmptyState query={currentQ} onReset={() => { setResult(null); setError(null); }} />
        )}

        {/* Error */}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => doSearch(currentQ, ["amazon", "flipkart", "meesho", "myntra"])} />
        )}

        {/* Idle state */}
        {!loading && !result && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-24 text-center"
            role="status"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 glass-card"
              style={{ border: "1px solid rgba(109,40,217,0.28)" }}
            >
              <Search className="w-7 h-7" style={{ color: "var(--accent-violet)" }} aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Find the best price across 4 stores
            </h2>
            <p className="text-sm max-w-sm" style={{ color: "var(--text-secondary)" }}>
              Type any product — iPhone, kurta, boAt headphones — and get AI-ranked results in seconds.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
