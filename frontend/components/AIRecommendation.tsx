import { Sparkles, AlertTriangle } from "lucide-react";

export default function AIRecommendation({
  recommendation,
  error,
}: {
  recommendation: string | null;
  error: string | null;
}) {
  if (!recommendation && !error) return null;

  return (
    <section className="glass rounded-2xl p-5 border border-[rgba(124,58,237,0.25)]">
      <div className="flex items-center gap-2 mb-3">
        {recommendation ? (
          <Sparkles size={18} className="text-[color:var(--accent-violet)]" />
        ) : (
          <AlertTriangle size={18} className="text-[color:var(--status-stale)]" />
        )}
        <h3 className="display-md text-lg">AI Recommendation</h3>
      </div>

      {recommendation && (
        <p className="text-sm leading-relaxed text-[color:var(--text-primary)] whitespace-pre-wrap">
          {recommendation}
        </p>
      )}

      {error && !recommendation && (
        <p className="text-sm text-[color:var(--text-secondary)]">
          Couldn&apos;t generate a recommendation: {error}
        </p>
      )}
    </section>
  );
}
