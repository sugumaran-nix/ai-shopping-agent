export function AnalysisSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 mb-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-5/6 rounded" />
        <div className="skeleton h-3 w-4/6 rounded" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl overflow-hidden flex flex-col">
          <div className="skeleton w-full h-44" style={{ borderRadius: 0 }} />
          <div className="p-4 flex flex-col gap-3">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-5 w-1/3 rounded" />
            <div className="skeleton h-9 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default GridSkeleton;
