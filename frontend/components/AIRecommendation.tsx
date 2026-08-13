export function AIRecommendation({
  recommendation,
  error,
}: {
  recommendation: string | null
  error: string | null
}) {
  if (!recommendation && !error) return null

  if (error && !recommendation) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
        <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden>🤖</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Recommendation</p>
          <p className="text-sm text-gray-500 mt-0.5">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-purple-200 overflow-hidden shadow-sm"
         role="region" aria-label="AI buying recommendation">
      <div className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center gap-2">
        <span className="text-white text-base" aria-hidden>✨</span>
        <span className="text-white font-semibold text-sm">AI Recommendation</span>
        <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
          Gemini
        </span>
      </div>
      <div className="px-5 py-4 bg-gradient-to-br from-purple-50 to-indigo-50">
        <p className="text-sm text-gray-800 leading-relaxed">{recommendation}</p>
        <p className="mt-3 text-xs text-gray-400 border-t border-purple-100 pt-3">
          Based only on the real product data fetched above. Always verify prices before purchasing.
        </p>
      </div>
    </div>
  )
}
