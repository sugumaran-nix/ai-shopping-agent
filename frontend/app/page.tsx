"use client";

import { useRef, useState } from "react";
import AIRecommendation from "@/components/AIRecommendation";
import SearchBar from "@/components/SearchBar";
import SourceSection from "@/components/SourceSection";
import { ApiError, SearchResponse, searchProducts } from "@/lib/api";

export default function Home() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSearch(query: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await searchProducts(query, controller.signal);
      setData(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof ApiError ? err.message : "Something went wrong reaching the search API.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8">
      <header className="text-center flex flex-col gap-3 items-center">
        <span className="pill pill-violet">Real data only — every result is labeled</span>
        <h1 className="display-xl gradient-text">AI Shopping Agent</h1>
        <p className="text-[color:var(--text-secondary)] max-w-lg">
          Compares live prices across Amazon, Flipkart, Meesho, Myntra, and eBay.
          Every card shows whether it&apos;s live or cached — nothing is ever invented.
        </p>
      </header>

      <SearchBar onSearch={handleSearch} loading={loading} />

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="glass rounded-2xl p-5 border border-[rgba(244,63,94,0.3)] text-sm text-[color:var(--text-secondary)]">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-6">
          <AIRecommendation recommendation={data.ai_recommendation} error={data.ai_error} />
          {data.results.map((result) => (
            <SourceSection key={result.source} result={result} />
          ))}
        </div>
      )}
    </main>
  );
}
