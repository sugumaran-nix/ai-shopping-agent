// ─── Backend response shapes (must match backend/models.py exactly) ───────────

export type ScrapeStatus = "fresh" | "stale" | "unavailable";

export interface Product {
  source: string;          // "amazon" | "flipkart" | "meesho" | "myntra" | "ebay"
  title: string;
  price: number;
  currency: string;
  rating: number | null;
  review_count: number | null;
  url: string;
  image_url: string | null;
  fetched_at: string;
}

export interface SourceResult {
  source: string;
  status: ScrapeStatus;
  products: Product[];
  error: string | null;
  fetched_at: string | null;
}

export interface SearchResponse {
  query: string;
  results: SourceResult[];          // per-source, each has its own products[]
  ai_recommendation: string | null;
  ai_error: string | null;
}

// ─── Derived / UI helpers ──────────────────────────────────────────────────────

/** Flat product with site attached — used by the product grid after aggregation */
export interface FlatProduct extends Product {
  site: string;  // same as source, aliased for legacy UI code
}
