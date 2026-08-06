import type { SearchResponse } from "@/types";

export type { SearchResponse, Product, SourceResult, ScrapeStatus } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export const SITE_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  amazon:   { label: "Amazon",   color: "#FF9900", bg: "rgba(255,153,0,0.12)" },
  flipkart: { label: "Flipkart", color: "#2874F0", bg: "rgba(40,116,240,0.12)" },
  ebay:     { label: "eBay",     color: "#E43137", bg: "rgba(228,49,55,0.12)" },
};

export interface SearchParams {
  query: string;
  sites?: string[];
}

export class ApiError extends Error {}

export async function searchProducts(
  params: string | SearchParams,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const query = typeof params === "string" ? params : params.query;

  if (!API_BASE) {
    throw new ApiError(
      "Backend URL not configured. Set NEXT_PUBLIC_API_BASE_URL in Vercel environment variables."
    );
  }

  const url = `${API_BASE}/api/search?q=${encodeURIComponent(query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      "Could not reach the backend. Check NEXT_PUBLIC_API_BASE_URL in Vercel environment variables."
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? `Search failed (HTTP ${response.status})`);
  }

  return response.json() as Promise<SearchResponse>;
}
