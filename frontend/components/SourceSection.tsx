import type { SourceResult } from "@/lib/api";
import ProductCard from "./ProductCard";
import StatusBadge from "./StatusBadge";

const SOURCE_LABELS: Record<string, string> = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  meesho: "Meesho",
  myntra: "Myntra",
  ebay: "eBay",
};

export default function SourceSection({ result }: { result: SourceResult }) {
  const label = SOURCE_LABELS[result.source] ?? result.source;

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="display-md text-xl">{label}</h3>
        <StatusBadge status={result.status} />
      </div>

      {result.status === "unavailable" && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-[color:var(--text-secondary)]">
          Couldn&apos;t get results from {label} right now
          {result.error ? `: ${result.error}` : "."} Try again shortly, or check{" "}
          <span className="pill pill-violet">/api/health</span> if this keeps happening.
        </div>
      )}

      {result.status === "stale" && (
        <p className="text-xs text-[color:var(--text-secondary)] mb-3">
          Showing the last successful result for {label} — a fresh check failed just now
          {result.error ? ` (${result.error})` : ""}.
        </p>
      )}

      {result.products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {result.products.map((product) => (
            <ProductCard key={product.url} product={product} />
          ))}
        </div>
      )}

      {result.status !== "unavailable" && result.products.length === 0 && (
        <p className="text-sm text-[color:var(--text-secondary)]">No matching products found.</p>
      )}
    </section>
  );
}
