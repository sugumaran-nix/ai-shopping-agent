// Single source of truth — matches backend models.py exactly.
// No other file defines these types.

export type Source  = "amazon" | "flipkart" | "ajio" | "snapdeal" | "croma";
export type Status  = "fresh" | "stale" | "unavailable";
export type SortKey = "price_asc" | "price_desc" | "rating" | "discount";

export interface Product {
  source:         Source;
  title:          string;
  price:          number;
  original_price: number | null;
  currency:       string;
  discount_pct:   number | null;
  rating:         number | null;
  review_count:   number | null;
  url:            string;
  image_url:      string | null;
  brand:          string | null;
  fetched_at:     string;
}

export interface SourceResult {
  source:   Source;
  status:   Status;
  products: Product[];
  error:    string | null;
}

export interface SearchResponse {
  query:             string;
  results:           SourceResult[];
  ai_recommendation: string | null;
  ai_error:          string | null;
  total_products:    number;
}

/** Flat product used by the product grid */
export type FlatProduct = Product & { site: Source };
