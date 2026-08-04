export type ScrapeStatus = "fresh" | "stale" | "unavailable";

export interface Product {
  source: string;
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
  results: SourceResult[];
  ai_recommendation: string | null;
  ai_error: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {}

export async function searchProducts(query: string, signal?: AbortSignal): Promise<SearchResponse> {
  const url = `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail || `Search failed with status ${response.status}`);
  }

  return response.json();
}
