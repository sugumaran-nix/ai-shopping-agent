"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpDown, Loader2, ShoppingBag } from "lucide-react";

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
  const params   = useSearchParams();
  const router   = useRouter();
  const initQ    = params.get("q") || "";

  const [result,     setResult]     = useState<SearchResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [currentQ,   setCurrentQ]   = useState(initQ);
  const [siteFilter, setSiteFilter] = useState("all");
  const [sort,       setSort]       = useState<SortKey>("price_asc");

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
      const msg = e instanceof Error ? e.message : "Search failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Auto-search on mount if query in URL
  useEffect(() => {
    if (initQ.trim().length >= 2) {
      doSearch(initQ, ["amazon", "flipkart", "meesho", "myntra"]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered + sorted products
  const displayed = useMemo<Product[]>(() => {
    if (!result) return [];
    let prods = siteFilter === "all"
      ? result.products
      : result.products.filter(p => p.site === siteFilter);

    return [...prods].sort((a, b) => {
      switch (sort) {
        case "price_asc":  return a.price - b.price;
        case "price_desc": return b.price - a.price;
        case "rating":     return (b.rating || 0) - (a.rating || 0);
        case "discount":   return (b.discount || 0) - (a.discount || 0);
        default:           return 0;
      }
    });
  }, [result, siteFilter, sort]);

  // Per-site counts
  const siteCounts = useMemo(() => {
    if (!result) return {};
    return result.products.reduce<Record<string, number>>((acc, p) => {
      acc[p.site] = (acc[p.site] || 0) + 1;
      return acc;
    }, {});
  }, [result]);

  const hasResults = result && result.products.length > 0;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Search bar */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black gradient-text"
          >
            Shopiq Search
          </motion.h1>
          <SearchBar
            defaultQuery={initQ}
            onSearch={doSearch}
            loading={loading}
          />
        </div>

        {/* Status text while searching */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent-violet)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Searching Amazon, Flipkart, Meesho &amp; Myntra…
            </p>
          </motion.div>
        )}

        {/* AI Analysis skeleton */}
        {loading && <div className="mb-6"><AnalysisSkeleton /></div>}

        {/* AI Analysis result */}
        {hasResults && !loading && (
          <div className="mb-6">
            <AIAnalysis
              analysis={result.ai_analysis}
              query={result.query}
              total={result.total_results}
            />
          </div>
        )}

        {/* Filters + sort bar */}
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
              <ArrowUpDown className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="text-xs rounded-xl px-3 py-2 outline-none"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ background: "#131125" }}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {displayed.length} product{displayed.length !== 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        )}

        {/* Product grid */}
        {loading && <GridSkeleton />}

        {!loading && hasResults && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayed.map((product, i) => (
              <ProductCard key={`${product.product_url}-${i}`} product={product} index={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && result && result.products.length === 0 && (
          <EmptyState query={currentQ} onReset={() => { setResult(null); setError(null); }} />
        )}

        {/* Error state */}
        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => doSearch(currentQ, ["amazon", "flipkart", "meesho", "myntra"])}
          />
        )}

        {/* Initial idle state */}
        {!loading && !result && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-24 text-center"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5 glass">
              <ShoppingBag className="w-7 h-7" style={{ color: "var(--accent-violet)" }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              What are you looking for?
            </h2>
            <p className="text-sm max-w-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Search above to compare prices across Amazon, Flipkart, Meesho and Myntra.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
