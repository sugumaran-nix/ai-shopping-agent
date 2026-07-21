"use client";

export function CardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-pulse" aria-hidden="true">
      <div className="aspect-square bg-white/[0.04]" />
      <div className="p-4 space-y-3">
        <div className="h-3 rounded-full bg-white/[0.07] w-full" />
        <div className="h-3 rounded-full bg-white/[0.07] w-3/4" />
        <div className="h-5 rounded-full bg-white/[0.07] w-1/3" />
        <div className="h-3 rounded-full bg-white/[0.07] w-1/2" />
        <div className="h-9 rounded-xl bg-white/[0.07] w-full mt-2" />
      </div>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div
      className="glass-card rounded-2xl p-4 animate-pulse"
      style={{ border: "1px solid rgba(109,40,217,0.18)" }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-white/[0.07] shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 rounded-full bg-white/[0.07] w-1/3" />
          <div className="h-2.5 rounded-full bg-white/[0.07] w-1/2" />
        </div>
      </div>
      <div className="space-y-2.5">
        {[90, 75, 85, 65, 80].map((w, i) => (
          <div key={i} className="h-3 rounded-full bg-white/[0.07]" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
