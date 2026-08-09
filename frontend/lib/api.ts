import type { SearchResponse, Source } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export const SITE_META: Record<
  Source,
  { label: string; color: string; bg: string; logo?: string }
> = {
  amazon:   { label: "Amazon",   color: "#FF9900", bg: "rgba(255,153,0,0.1)"   },
  flipkart: { label: "Flipkart", color: "#2874F0", bg: "rgba(40,116,240,0.1)"  },
  ajio:     { label: "AJIO",     color: "#FF4D4D", bg: "rgba(255,77,77,0.1)"   },
  snapdeal: { label: "Snapdeal", color: "#E40046", bg: "rgba(228,0,70,0.1)"    },
  croma:    { label: "Croma",    color: "#00A651", bg: "rgba(0,166,81,0.1)"    },
};

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
  }
}

export async function searchProducts(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  if (!API_BASE) {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL is not set. Add it in Vercel → Environment Variables.",
    );
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/search?q=${encodeURIComponent(query)}`,
      { signal, cache: "no-store" },
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      "Cannot reach the backend. Check NEXT_PUBLIC_API_BASE_URL or wait for Render to wake up (free tier sleeps after 15 min).",
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.detail ?? `HTTP ${res.status}`, res.status);
  }

  return res.json() as Promise<SearchResponse>;
}
