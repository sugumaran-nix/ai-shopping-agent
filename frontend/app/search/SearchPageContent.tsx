"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

import SearchBar from "@/components/search/SearchBar";
import ProductCard from "@/components/search/ProductCard";
import AIAnalysis from "@/components/search/AIAnalysis";
import SiteFilter from "@/components/search/SiteFilter";
import EmptyState from "@/components/search/EmptyState";
import ErrorState from "@/components/search/ErrorState";
import { GridSkeleton, AnalysisSkeleton } from "@/components/search/SearchSkeleton";
import StatusBadge from "@/components/search/StatusBadge";

import { searchProducts, ApiError, SITE_META } from "@/lib/api";
import type { SearchResponse, FlatProduct, SourceResult } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenResults(results: SourceResult[]): FlatProduct[] {
  return results.flatMap((r) =>
    r.products.map((p) => ({ ...p, site: p.source }))
  );
}

type SortKey = "price_asc" | "price_desc" | "rating";

function sortProducts(products: FlatProduct[], key: SortKey): FlatProduct[] {
  return [...products].sort((a, b) => {
    if (key === "price_asc") return a.price - b.price;
    if (key === "price_desc") return b.price - a.price;
    if (key === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    return 0;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("price_asc");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const hasSearched = useRef(false);

  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setData(null);
    setSelectedSites([]);

    // Update URL without full navigation
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });

    try {
      const result = await searchProducts({ query: q }, ctrl.signal);
      setData(result);
      // Pre-select all sites that returned at least one product
      setSelectedSites(
        result.results
          .filter((r) => r.products.length > 0)
          .map((r) => r.source)
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the search service. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Run on first mount if URL has a query
  useEffect(() => {
    if (initialQuery && !hasSearched.current) {
      hasSearched.current = true;
      runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  // Derived display data
  const allFlat = data ? flattenResults(data.results) : [];
  const filtered =
    selectedSites.length > 0
      ? allFlat.filter((p) => selectedSites.includes(p.site))
      : allFlat;
  const sorted = sortProducts(filtered, sort);
  const hasProducts = allFlat.length > 0;
  const staleSources = data?.results
    .filter((r) => r.status === "stale")
    .map((r) => SITE_META[r.source]?.label ?? r.source) ?? [];

  function toggleSite(site: string) {
    setSelectedSites((prev) =>
      prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-2 rounded-xl transition-colors glass-card hover:border-white/15 flex-shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </button>
          <div className="flex-1">
            <SearchBar
              defaultValue={params.get("q") ?? ""}
              loading={loading}
              onSearch={runSearch}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-5">
            <AnalysisSkeleton />
            <GridSkeleton count={8} />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <ErrorState
            message={error}
            onRetry={() => runSearch(params.get("q") ?? "")}
          />
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
              {/* AI panel */}
              <AIAnalysis
                recommendation={data.ai_recommendation}
                error={data.ai_error}
                staleSources={staleSources}
              />

              {/* Controls row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {sorted.length}
                  </span>
                  {sorted.length !== allFlat.length && (
                    <span>/ {allFlat.length}</span>
                  )}
                  &nbsp;products for &ldquo;{data.query}&rdquo;

                  {/* Per-source status pills */}
                  <div className="hidden sm:flex items-center gap-1.5 ml-2">
                    {data.results.map((r) => (
                      <StatusBadge key={r.source} status={r.status} />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="text-xs rounded-xl px-3 py-2 outline-none cursor-pointer glass"
                    style={{
                      color: "var(--text-secondary)",
                      border: "1px solid var(--glass-border)",
                    }}
                    aria-label="Sort products"
                  >
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="rating">Best Rated</option>
                  </select>

                  {/* Filter toggle */}
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    className="btn-ghost text-xs py-2 px-3"
                    aria-expanded={showFilters}
                    aria-label="Toggle site filters"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filter
                  </button>
                </div>
              </div>

              {/* Site filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <SiteFilter
                      results={data.results}
                      selected={selectedSites}
                      onToggle={toggleSite}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {!hasProducts ? (
                <EmptyState
                  query={data.query}
                  onReset={() => router.push("/")}
                  onSearch={runSearch}
                />
              ) : sorted.length === 0 ? (
                <EmptyState
                  query={data.query}
                  onReset={() => setSelectedSites(data.results.filter((r) => r.products.length > 0).map((r) => r.source))}
                  onSearch={runSearch}
                />
              ) : (
                // Product grid
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {sorted.map((product, i) => (
                    <ProductCard
                      key={`${product.source}-${product.url}-${i}`}
                      product={product}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Initial state — no search run yet */}
        {!loading && !error && !data && (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Enter a product above to compare prices across stores.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
