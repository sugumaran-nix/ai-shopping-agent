import { SearchRequest, SearchResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://ai-shopping-agent-backend-z0wq.onrender.com";

export async function searchProducts(input: string | SearchRequest): Promise<SearchResponse> {
  const body: SearchRequest = typeof input === "string" ? { query: input } : input;

  const response = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Search failed (${response.status})`);
  }

  return response.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export const SITE_META: Record<string, { label: string; color: string; bg: string }> = {
  amazon:   { label: "Amazon",   color: "#FF9900", bg: "rgba(255,153,0,0.12)"  },
  flipkart: { label: "Flipkart", color: "#2874F0", bg: "rgba(40,116,240,0.12)" },
  meesho:   { label: "Meesho",   color: "#F43397", bg: "rgba(244,51,151,0.12)" },
  myntra:   { label: "Myntra",   color: "#FF3F6C", bg: "rgba(255,63,108,0.12)" },
};
