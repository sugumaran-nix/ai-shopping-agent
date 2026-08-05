"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown, ChevronDown, Search, Share2, Check,
  Zap, ShieldCheck, Clock,
} from "lucide-react";

import SearchBar    from "@/components/search/SearchBar";
import ProductCard  from "@/components/search/ProductCard";
import AIAnalysis   from "@/components/search/AIAnalysis";
import EmptyState   from "@/components/search/EmptyState";
import ErrorState   from "@/components/search/ErrorState";
import { GridSkeleton, AnalysisSkeleton } from "@/components/search/SearchSkeleton";

import { searchProducts, SITE_META, ApiError } from "@/lib/api";
import type { SearchResponse, FlatProduct, SourceResult, ScrapeStatus } from "@/types";

// ── Types & constants ─────────────────────────────────────────────────────────

type SortKey = "price_asc" | "price_desc" | "rating";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating",     label: "Best Rated" },
];

/** Only the three reliably-working sources */
const ACTIVE_SOURCES = ["amazon", "flipkart", "meesho", "myntra", "ebay"];

const STATUS_LABEL: Record<ScrapeStatus, string> = {
  fresh:       "Live",
  stale:       "Cached",
  unavailable: "Unavailable",
};
const STATUS_COLOR: Record<ScrapeStatus, string> = {
  fresh:       "#10B981",
  stale:       "#F59E0B",
  unavailable: "#F43F5E",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenResults(results: SourceResult[]): FlatProduct[] {
  return results
    .filter((r) => ACTIVE_SOURCES.includes(r.source))
    .flatMap((r) => r.products.map((p) => ({ ...p, site: p.source })));
}

function sortProducts(products: FlatProduct[], key: SortKey): FlatProduct[] {
  return [...products].sort((a, b) => {
    if (key === "price_asc")  return a.price - b.price;
    if (key === "price_desc") return b.price - a.price;
    if (key === "rating")     return (b.rating ?? 0) - (a.rating ?? 0);
    return 0;
  });
}

// ── Hero / idle screen ────────────────────────────────────────────────────────

function HeroIdle({ onSearch, loading }: { onSearch: (q: string) => void; loading: boolean }) {
  const features = [
    { icon: Zap,         text: "Live prices from 5 stores" },
    { icon: ShieldCheck, text: "Validated — no fabricated data" },
    { icon: Clock,       text: "Cached results are labeled" },
  ];

  return (
    <div className="flex flex-col items-center py-24 text-center gap-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
        >
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight"
          style={{
            background: "linear-gradient(135deg,#A78BFA,#818CF8,#38BDF8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Shopiq
        </h1>
        <p className="text-sm max-w-xs" style={{ color: "var(--text-secondary)" }}>
          AI-powered price comparison across Amazon, Flipkart, Meesho, Myntra &amp; eBay.
          Every result is real — fresh or cached, always labeled.
        </p>
      </div>

      {/* Search */}
      <div className="w-full max-w-xl">
        <SearchBar onSearch={onSearch} loading={loading} />
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {features.map(({ icon: Icon, text }) => (
          <span
            key={text}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              color: "var(--text-secondary)",
            }}
          >
            <Icon className="w-3 h-3" style={{ color: "var(--accent-violet)" }} />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Source status strip ───────────────────────────────────────────────────────

function SourceStatusStrip({ results }: { results: SourceResult[] }) {
  const active = results.filter((r) => ACTIVE_SOURCES.includes(r.source));
  if (!active.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-1">
      {active.map((r) => {
        const meta  = SITE_META[r.source] ?? { label: r.source, color: "#888", bg: "" };
        const color = STATUS_COLOR[r.status];
        return (
          <span
            key={r.source}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-secondary)",
            }}
            title={r.error ?? STATUS_LABEL[r.status]}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            />
            <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {STATUS_LABEL[r.status]}
              {r.products.length > 0 ? ` · ${r.products.length}` : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [result,     setResult]     = useState<SearchResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [currentQ,   setCurrentQ]   = useState("");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [sort,       setSort]       = useState<SortKey>("price_asc");
  const [sortOpen,   setSortOpen]   = useState(false);
  const [copied,     setCopied]     = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const sortRef  = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setSortOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const doSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setResult(null);
    setSiteFilter("all");
    setCurrentQ(q);
    window.history.replaceState(null, "", `/?q=${encodeURIComponent(q)}`);

    try {
      const data = await searchProducts({ query: q }, ctrl.signal);
      setResult(data);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof ApiError ? e.message : "Search failed. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Run search from URL on first load
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    if (q.trim().length >= 2) doSearch(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived display data
  const allFlat = useMemo(() => (result ? flattenResults(result.results) : []), [result]);

  const displayed = useMemo<FlatProduct[]>(() => {
    const filtered = siteFilter === "all"
      ? allFlat
      : allFlat.filter((p) => p.site === siteFilter);
    return sortProducts(filtered, sort);
  }, [allFlat, siteFilter, sort]);

  const siteCounts = useMemo(() => {
    return allFlat.reduce<Record<string, number>>((acc, p) => {
      acc[p.site] = (acc[p.site] ?? 0) + 1;
      return acc;
    }, {});
  }, [allFlat]);

  const hasProducts = allFlat.length > 0;
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  const staleSources = result?.results
    .filter((r) => ACTIVE_SOURCES.includes(r.source) && r.status === "stale")
    .map((r) => SITE_META[r.source]?.label ?? r.source) ?? [];

  const handleShare = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/?q=${encodeURIComponent(currentQ)}`
    ).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasSearched = !!(currentQ || loading || result || error);

  return (
    <main className="min-h-screen pb-20 px-4" style={{ paddingTop: hasSearched ? "1.5rem" : 0 }}>
      <div className="max-w-7xl mx-auto">

        {/* ── Idle / hero ──────────────────────────────────────────── */}
        {!hasSearched && (
          <HeroIdle onSearch={doSearch} loading={loading} />
        )}

        {/* ── Active search header ──────────────────────────────────── */}
        {hasSearched && (
          <div className="flex flex-col gap-4 mb-8">
            <AnimatePresence mode="wait">
              <motion.h1
                key={loading ? "loading" : currentQ}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center"
                style={{ color: "var(--text-primary)" }}
                aria-live="polite"
              >
                {loading
                  ? `Searching "${currentQ}"…`
                  : hasProducts
                    ? `${allFlat.length} results for "${currentQ}"`
                    : `No results for "${currentQ}"`}
              </motion.h1>
            </AnimatePresence>

            <SearchBar onSearch={doSearch} loading={loading} defaultValue={currentQ} />

            {/* Source status */}
            {result && <SourceStatusStrip results={result.results} />}
          </div>
        )}

        {/* ── Skeletons ─────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col gap-5">
            <AnalysisSkeleton />
            <GridSkeleton count={8} />
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => doSearch(currentQ)} />
        )}

        {/* ── Results ──────────────────────────────────────────────── */}
        {!loading && !error && result && (
          <AnimatePresence mode="wait">
            <motion.div
              key={result.query}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-5"
            >
              {/* AI panel */}
              <AIAnalysis
                recommendation={result.ai_recommendation}
                error={result.ai_error}
                staleSources={staleSources}
              />

              {hasProducts && (
                <>
                  {/* Filter + sort bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Site filter tabs */}
                    <div className="flex flex-wrap gap-2">
                      {(["all", ...ACTIVE_SOURCES] as string[]).map((site) => {
                        const meta   = site === "all" ? null : SITE_META[site];
                        const count  = site === "all" ? allFlat.length : (siteCounts[site] ?? 0);
                        const active = siteFilter === site;
                        return (
                          <button
                            key={site}
                            type="button"
                            onClick={() => setSiteFilter(site)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                            style={{
                              background: active
                                ? meta ? meta.bg : "rgba(124,58,237,0.12)"
                                : "rgba(255,255,255,0.04)",
                              border: `1px solid ${active ? (meta?.color ?? "#7C3AED") + "45" : "rgba(255,255,255,0.07)"}`,
                              color: active ? (meta?.color ?? "#A78BFA") : "var(--text-muted)",
                            }}
                            aria-pressed={active}
                          >
                            {meta && (
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: active ? meta.color : "rgba(255,255,255,0.2)" }}
                              />
                            )}
                            {site === "all" ? "All stores" : (meta?.label ?? site)}
                            <span
                              className="text-[10px] px-1 rounded-full"
                              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Share */}
                      {currentQ && (
                        <button
                          type="button"
                          onClick={handleShare}
                          className="btn-ghost py-1.5 px-3 text-xs gap-1.5"
                          title="Copy shareable link"
                        >
                          {copied
                            ? <Check className="w-3.5 h-3.5" style={{ color: "#6EE7B7" }} />
                            : <Share2 className="w-3.5 h-3.5" />}
                          {copied ? "Copied!" : "Share"}
                        </button>
                      )}

                      {/* Sort */}
                      <ArrowUpDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      <div className="relative" ref={sortRef}>
                        <button
                          type="button"
                          onClick={() => setSortOpen((v) => !v)}
                          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                          style={{
                            background: "var(--glass-bg)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                            minWidth: 172,
                          }}
                          aria-expanded={sortOpen}
                          aria-label="Sort products"
                        >
                          <span className="flex-1 text-left">{currentSortLabel}</span>
                          <ChevronDown
                            className="w-3.5 h-3.5 shrink-0 transition-transform"
                            style={{
                              color: "var(--text-muted)",
                              transform: sortOpen ? "rotate(180deg)" : "none",
                            }}
                          />
                        </button>
                        <AnimatePresence>
                          {sortOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.97 }}
                              transition={{ duration: 0.14 }}
                              className="absolute right-0 top-full mt-1.5 glass rounded-xl overflow-hidden z-30"
                              style={{ minWidth: 180 }}
                            >
                              {SORT_OPTIONS.map((o) => (
                                <button
                                  key={o.value}
                                  type="button"
                                  onClick={() => { setSort(o.value); setSortOpen(false); }}
                                  className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/5"
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
                  </div>

                  {/* Grid */}
                  {displayed.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {displayed.map((product, i) => (
                        <ProductCard
                          key={`${product.source}-${product.url}-${i}`}
                          product={product}
                          index={i}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Site filter produced 0 */
                    <div className="flex flex-col items-center py-16 text-center">
                      <p className="text-4xl mb-4">🔍</p>
                      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                        No results on {SITE_META[siteFilter]?.label ?? siteFilter}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSiteFilter("all")}
                        className="text-sm underline underline-offset-2 mt-2"
                        style={{ color: "var(--accent-violet)" }}
                      >
                        Show all stores
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* No products at all */}
              {!hasProducts && (
                <EmptyState
                  query={result.query}
                  onReset={() => { setResult(null); setError(null); setCurrentQ(""); window.history.replaceState(null, "", "/"); }}
                  onSearch={doSearch}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </main>
  );
}
