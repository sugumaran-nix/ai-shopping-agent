"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/search/SearchBar";
import ProductCard from "@/components/search/ProductCard";
import AIAnalysis from "@/components/search/AIAnalysis";
import SkeletonLoader from "@/components/search/SkeletonLoader";
import { searchProducts } from "@/lib/api";
import { Product } from "@/types";
import { ArrowUpDown, Filter } from "lucide-react";

type SortOption = "relevance" | "price-low" | "price-high" | "rating";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [analysis, setAnalysis] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  const handleSearch = async (searchQuery: string) => {
    setLoading(true);
    setError("");
    setQuery(searchQuery);

    try {
      const data = await searchProducts(searchQuery);
      setProducts(data.products);
      setAnalysis(data.ai_analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case "price-low":
        return sorted.sort((a, b) => a.price - b.price);
      case "price-high":
        return sorted.sort((a, b) => b.price - a.price);
      case "rating":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return sorted;
    }
  }, [products, sortBy]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0A0A1A] via-[#0C0C1E] to-[#0F0F2E] text-white">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
            AI Shopping Agent
          </h1>
          <p className="text-gray-400 text-lg">
            Compare prices across Amazon, Flipkart, Meesho & Myntra
          </p>
        </div>

        {/* Search */}
        <div className="mb-10">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Loading State */}
        {loading && <SkeletonLoader />}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {!loading && !error && products.length > 0 && (
          <div className="space-y-8">
            {/* AI Analysis */}
            {analysis && (
              <AIAnalysis analysis={analysis} query={query} total={products.length} />
            )}

            {/* Sort Controls */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {products.length} Products Found
              </h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sortedProducts.map((product, index) => (
                <ProductCard key={`${product.site}-${index}`} product={product} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
