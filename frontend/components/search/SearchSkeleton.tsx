"use client";

export function CardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-3 rounded bg-white/10 w-full" />
        <div className="h-3 rounded bg-white/10 w-3/4" />
        <div className="h-5 rounded bg-white/10 w-1/3" />
        <div className="h-3 rounded bg-white/10 w-1/2" />
        <div className="h-9 rounded-xl bg-white/10 w-full mt-2" />
      </div>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 animate-pulse" style={{ border: "1px solid rgba(109,40,217,0.2)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-white/10" />
        <div className="space-y-2 flex-1">
          <div className="h-3 rounded bg-white/10 w-1/3" />
          <div className="h-2.5 rounded bg-white/10 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-3 rounded bg-white/10" style={{ width: `${70 + i * 5}%` }} />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
