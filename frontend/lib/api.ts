import type { SearchResponse } from "@/types";

export type { SearchResponse, Product, SourceResult, ScrapeStatus } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {}

/** Per-source site display metadata */
export const SITE_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  amazon:   { label: "Amazon",   color: "#FF9900", bg: "rgba(255,153,0,0.12)" },
  flipkart: { label: "Flipkart", color: "#2874F0", bg: "rgba(40,116,240,0.12)" },
  meesho:   { label: "Meesho",   color: "#F43397", bg: "rgba(244,51,151,0.12)" },
  myntra:   { label: "Myntra",   color: "#FF3F6C", bg: "rgba(255,63,108,0.12)" },
  ebay:     { label: "eBay",     color: "#E43137", bg: "rgba(228,49,55,0.12)" },
};

export interface SearchParams {
  query: string;
  sites?: string[];
}

/**
 * POST /api/search — returns the backend SearchResponse which has
 * `results[]` (per-source) NOT a flat `products[]`.
 *
 * Previously: took (query: string) — broken when called as ({ query, sites }, signal).
 * Fixed: unified signature accepts both string and object forms.
 */
export async function searchProducts(
  params: string | SearchParams,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const query =
    typeof params === "string" ? params : params.query;

  const url = `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.detail || `Search failed with status ${response.status}`
    );
  }

  return response.json() as Promise<SearchResponse>;
}
