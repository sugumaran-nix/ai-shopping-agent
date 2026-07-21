export interface Product {
  title: string;
  price: number;
  original_price?: number;
  discount?: number;
  rating?: number;
  reviews?: number;
  image_url?: string;
  product_url: string;
  site: "amazon" | "flipkart" | "meesho" | "myntra";
  available: boolean;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  products: Product[];
  ai_analysis: string;
}

export interface SearchRequest {
  query: string;
  sites?: string[];
}
