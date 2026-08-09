"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import SearchBar                          from "@/components/search/SearchBar";
import ProductCard                        from "@/components/search/ProductCard";
import AIAnalysis                         from "@/components/search/AIAnalysis";
import { AnalysisSkeleton, GridSkeleton } from "@/components/search/SearchSkeleton";
import { EmptyState, ErrorState }         from "@/components/search/States";
import StatusBadge                        from "@/components/search/StatusBadge";

import { ApiError, searchProducts, SITE_META } from "@/lib/api";
import type { FlatProduct, SearchResponse, Source, SourceResult, SortKey } from "@/types";

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

export default function SearchPageContent() {
  const router  = useRouter();
  const params  = useSearchParams();
  const initQ   = params.get("q") ?? "";

  const [data,     setData]     = useState<SearchResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [sort,     setSort]     = useState<SortKey>("price_asc");
  const [selected, setSelected] = useState<string[]>([]);

  const abortRef    = useRef<AbortController | null>(null);
  const searchedRef = useRef(false);

  // FIX: searchProducts takes a plain string, not an object
  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setData(null);
    setSelected([]);
    router.replace(`/search?q=${encodeURIComponent(q)}`);

    try {
      const result = await searchProducts(q, ctrl.signal);
      setData(result);
      setSelected(
        result.results
          .filter(r => r.products.length > 0)
          .map(r => r.source)
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof ApiError ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (initQ && !searchedRef.current) {
      searchedRef.current = true;
      runSearch(initQ);
    }
  }, [initQ, runSearch]);

  const allFlat   = data ? flatten(data.results) : [];
  const filtered  = selected.length
    ? allFlat.filter(p => selected.includes(p.site))
    : allFlat;
  const displayed = applySort(filtered, sort);
  const hasProds  = allFlat.length > 0;

  const staleSources = data?.results
    .filter(r => r.status === "stale")
    .map(r => SITE_META[r.source as Source]?.label ?? r.source) ?? [];

  function toggleSite(s: string) {
    setSelected(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 glass border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-2 rounded-xl glass-card flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 text-secondary" />
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">

        {loading && (
          <>
            <AnalysisSkeleton />
            <GridSkeleton count={10} />
          </>
        )}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => runSearch(params.get("q") ?? "")}
          />
        )}

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

              {/* Source filter + sort */}
              {hasProds && (
                <div className="flex flex-wrap items-center gap-2">
                  {data.results.map(r => (
                    <button
                      key={r.source}
                      type="button"
                      onClick={() => toggleSite(r.source)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: selected.includes(r.source)
                          ? (SITE_META[r.source as Source]?.bg ?? "rgba(124,58,237,0.12)")
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${selected.includes(r.source)
                          ? (SITE_META[r.source as Source]?.color ?? "#7C3AED") + "45"
                          : "rgba(255,255,255,0.07)"}`,
                        color: selected.includes(r.source)
                          ? (SITE_META[r.source as Source]?.color ?? "#A78BFA")
                          : "rgba(240,240,255,0.5)",
                      }}
                      aria-pressed={selected.includes(r.source)}
                    >
                      {SITE_META[r.source as Source]?.label ?? r.source}
                      <StatusBadge status={r.status} />
                      <span className="text-[10px] opacity-60">({r.products.length})</span>
                    </button>
                  ))}

                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value as SortKey)}
                    className="ml-auto text-xs rounded-xl px-3 py-2 outline-none glass min-h-[44px]"
                    style={{
                      color: "rgba(240,240,255,0.8)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    aria-label="Sort products"
                  >
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="rating">Best Rated</option>
                    <option value="discount">Best Discount</option>
                  </select>
                </div>
              )}

              {!hasProds ? (
                <EmptyState
                  query={data.query}
                  onReset={() => router.push("/")}
                  onSearch={runSearch}
                />
              ) : displayed.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">
                  No results for selected stores.{" "}
                  <button
                    type="button"
                    className="text-violet-400 underline underline-offset-2"
                    onClick={() =>
                      setSelected(
                        data.results
                          .filter(r => r.products.length > 0)
                          .map(r => r.source)
                      )
                    }
                  >
                    Show all
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayed.map((p, i) => (
                    <ProductCard
                      key={`${p.source}-${p.url}-${i}`}
                      product={p}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && !error && !data && (
          <div className="flex items-center justify-center flex-1 py-20">
            <p className="text-sm text-muted">
              Enter a product above to compare prices.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
