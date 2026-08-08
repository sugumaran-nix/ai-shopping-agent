"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Check, ChevronDown, Share2, Zap } from "lucide-react";

import SearchBar                          from "@/components/search/SearchBar";
import ProductCard                        from "@/components/search/ProductCard";
import AIAnalysis                         from "@/components/search/AIAnalysis";
import { AnalysisSkeleton, GridSkeleton } from "@/components/search/SearchSkeleton";
import { EmptyState, ErrorState }         from "@/components/search/States";
import StatusBadge                        from "@/components/search/StatusBadge";

import { ApiError, searchProducts, SITE_META } from "@/lib/api";
import type { FlatProduct, SearchResponse, SortKey, Source, SourceResult } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function flatten(results: SourceResult[]): FlatProduct[] {
  return results.flatMap(r => r.products.map(p => ({ ...p, site: p.source })));
}

function applySort(products: FlatProduct[], key: SortKey): FlatProduct[] {
  return [...products].sort((a, b) => {
    if (key === "price_asc")  return a.price - b.price;
    if (key === "price_desc") return b.price - a.price;
    if (key === "rating")     return (b.rating ?? 0) - (a.rating ?? 0);
    if (key === "discount")   return (b.discount_pct ?? 0) - (a.discount_pct ?? 0);
    return 0;
  });
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating",     label: "Best Rated"        },
  { value: "discount",   label: "Best Discount"     },
];

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ onSearch, loading }: { onSearch: (q: string) => void; loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh] text-center px-4 gap-8">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
        >
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1
          className="text-5xl sm:text-6xl font-extrabold tracking-tight gradient-text"
          style={{ lineHeight: 1.1 }}
        >
          Shopiq
        </h1>
        <p className="text-secondary max-w-md text-base">
          Compare real, live prices across Amazon, Flipkart, AJIO, Snapdeal &amp; Croma.
          Smart recommendations. No fake data — ever.
        </p>
      </div>
      <div className="w-full max-w-xl">
        <SearchBar onSearch={onSearch} loading={loading} />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(SITE_META) as Source[]).map(s => (
          <span
            key={s}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              background: SITE_META[s].bg,
              border: `1px solid ${SITE_META[s].color}30`,
              color: SITE_META[s].color,
            }}
          >
            {SITE_META[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [data,       setData]       = useState<SearchResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [query,      setQuery]      = useState("");
  const [sort,       setSort]       = useState<SortKey>("price_asc");
  const [sortOpen,   setSortOpen]   = useState(false);
  const [siteFilter, setSiteFilter] = useState<Source | "all">("all");
  const [copied,     setCopied]     = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const sortRef  = useRef<HTMLDivElement>(null);

  // FIX: doSearch defined BEFORE the useEffect that calls it
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setData(null);
    setQuery(trimmed);
    setSiteFilter("all");
    window.history.replaceState(null, "", `/?q=${encodeURIComponent(trimmed)}`);

    try {
      const result = await searchProducts(trimmed, ctrl.signal);
      setData(result);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(
        e instanceof ApiError
          ? e.message
          : "Search failed. Check the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setSortOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Run search from URL on first load — doSearch is now stable above
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    if (q.trim().length >= 2) doSearch(q);
  }, [doSearch]);

  // Derived state
  const allFlat = useMemo(() => (data ? flatten(data.results) : []), [data]);

  const displayed = useMemo<FlatProduct[]>(() => {
    const filtered = siteFilter === "all"
      ? allFlat
      : allFlat.filter(p => p.site === siteFilter);
    return applySort(filtered, sort);
  }, [allFlat, siteFilter, sort]);

  const siteCounts = useMemo(() =>
    allFlat.reduce<Record<string, number>>((acc, p) => {
      acc[p.site] = (acc[p.site] ?? 0) + 1;
      return acc;
    }, {}),
  [allFlat]);

  const staleSources = data?.results
    .filter(r => r.status === "stale")
    .map(r => SITE_META[r.source as Source]?.label ?? r.source) ?? [];

  const sortLabel   = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Sort";
  const hasProducts = allFlat.length > 0;
  const hasSearched = !!query || loading || !!data || !!error;

  function copyShare() {
    navigator.clipboard
      .writeText(`${window.location.origin}/?q=${encodeURIComponent(query)}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function reset() {
    setData(null); setError(null); setQuery("");
    window.history.replaceState(null, "", "/");
  }

  return (
    <main className="min-h-screen pb-20">
      {!hasSearched ? (
        <Hero onSearch={doSearch} loading={loading} />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.h1
                key={loading ? "loading" : query}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1,  y:  0 }}
                exit={{ opacity: 0 }}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center"
                style={{ color: "#F0F0FF" }}
                aria-live="polite"
              >
                {loading
                  ? `Searching "${query}"…`
                  : hasProducts
                    ? `${allFlat.length} results for "${query}"`
                    : `No results for "${query}"`}
              </motion.h1>
            </AnimatePresence>

            <SearchBar onSearch={doSearch} loading={loading} defaultValue={query} />

            {data && (
              <div className="flex flex-wrap gap-2 justify-center">
                {data.results.map(r => (
                  <div key={r.source} className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: SITE_META[r.source as Source]?.color }}
                    >
                      {SITE_META[r.source as Source]?.label}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <>
              <AnalysisSkeleton />
              <GridSkeleton count={10} />
            </>
          )}

          {/* Error */}
          {!loading && error && (
            <ErrorState message={error} onRetry={() => doSearch(query)} />
          )}

          {/* Results */}
          {!loading && !error && data && (
            <AnimatePresence mode="wait">
              <motion.div
                key={data.query}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-5"
              >
                <AIAnalysis
                  recommendation={data.ai_recommendation}
                  error={data.ai_error}
                  staleSources={staleSources}
                />

                {hasProducts && (
                  <>
                    {/* Filter + Sort bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {(["all", ...Object.keys(SITE_META)] as (Source | "all")[]).map(site => {
                          const meta   = site === "all" ? null : SITE_META[site as Source];
                          const count  = site === "all" ? allFlat.length : (siteCounts[site] ?? 0);
                          const active = siteFilter === site;
                          if (site !== "all" && !count) return null;
                          return (
                            <button
                              key={site}
                              type="button"
                              onClick={() => setSiteFilter(site)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                              style={{
                                background: active
                                  ? (meta?.bg ?? "rgba(124,58,237,0.12)")
                                  : "rgba(255,255,255,0.04)",
                                border: `1px solid ${active
                                  ? (meta?.color ?? "#7C3AED") + "45"
                                  : "rgba(255,255,255,0.07)"}`,
                                color: active
                                  ? (meta?.color ?? "#A78BFA")
                                  : "rgba(240,240,255,0.5)",
                              }}
                              aria-pressed={active}
                            >
                              {meta && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: active ? meta.color : "rgba(255,255,255,0.2)" }}
                                />
                              )}
                              {site === "all" ? "All stores" : meta?.label}
                              <span
                                className="text-[10px] px-1 rounded-full"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  color: "rgba(240,240,255,0.4)",
                                }}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        {query && (
                          <button
                            type="button"
                            onClick={copyShare}
                            className="btn-ghost text-xs py-1.5 px-3"
                          >
                            {copied
                              ? <Check className="w-3.5 h-3.5 text-green-400" />
                              : <Share2 className="w-3.5 h-3.5" />}
                            {copied ? "Copied!" : "Share"}
                          </button>
                        )}

                        <ArrowUpDown className="w-4 h-4 text-muted" />
                        <div className="relative" ref={sortRef}>
                          <button
                            type="button"
                            onClick={() => setSortOpen(v => !v)}
                            className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "#F0F0FF",
                              minWidth: 172,
                            }}
                            aria-expanded={sortOpen}
                            aria-haspopup="listbox"
                          >
                            <span className="flex-1 text-left">{sortLabel}</span>
                            <ChevronDown
                              className="w-3.5 h-3.5 text-muted transition-transform"
                              style={{ transform: sortOpen ? "rotate(180deg)" : "none" }}
                            />
                          </button>
                          <AnimatePresence>
                            {sortOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1,  y:  0, scale: 1    }}
                                exit={{   opacity: 0,   y: -6, scale: 0.97 }}
                                transition={{ duration: 0.14 }}
                                className="absolute right-0 top-full mt-1 glass rounded-xl overflow-hidden z-30"
                                style={{ minWidth: 180 }}
                                role="listbox"
                              >
                                {SORT_OPTIONS.map(o => (
                                  <button
                                    key={o.value}
                                    type="button"
                                    role="option"
                                    aria-selected={o.value === sort}
                                    onClick={() => { setSort(o.value); setSortOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/5"
                                    style={{
                                      color: o.value === sort ? "#A78BFA" : "rgba(240,240,255,0.6)",
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

                        <span className="text-xs tabular-nums text-muted">
                          {displayed.length} item{displayed.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Product grid */}
                    {displayed.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {displayed.map((p, i) => (
                          <ProductCard
                            key={`${p.source}-${p.url}-${i}`}
                            product={p}
                            index={i}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-center">
                        <p className="text-secondary mb-3 text-sm">
                          No results from{" "}
                          {siteFilter === "all"
                            ? "any store"
                            : SITE_META[siteFilter as Source]?.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSiteFilter("all")}
                          className="text-sm text-violet-400 underline underline-offset-2"
                        >
                          Show all stores
                        </button>
                      </div>
                    )}
                  </>
                )}

                {!hasProducts && (
                  <EmptyState
                    query={data.query}
                    onReset={reset}
                    onSearch={doSearch}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </main>
  );
}
