import { Suspense } from "react";
import SearchPageContent from "./SearchPageContent";

export const metadata = {
  title: "Search — Shopiq",
  description: "Compare prices on Amazon, Flipkart, Meesho and Myntra. AI picks the best deal.",
};

function SearchFallback() {
  return (
    <div className="min-h-screen pt-24 px-4 flex items-start justify-center">
      <div className="w-full max-w-2xl mt-8 h-12 rounded-2xl animate-pulse" style={{ background: "var(--glass-bg)" }} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
