export function AIRecommendation({
  recommendation,
  error,
}: {
  recommendation: string | null
  error: string | null
}) {
  if (error) {
    return (
      <div className="card p-4 border-gray-200 bg-gray-50 flex items-start gap-3">
        <span className="text-lg mt-0.5" aria-hidden>🤖</span>
        <div>
          <p className="text-sm font-medium text-gray-600">AI Recommendation</p>
          <p className="text-sm text-gray-400 mt-0.5">{error}</p>
        </div>
      </div>
    )
  }

  if (!recommendation) return null

  return (
    <div className="card p-5 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50"
         role="region" aria-label="AI buying recommendation">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>✨</span>
        <span className="font-semibold text-purple-900">AI Recommendation</span>
        <span className="ml-auto badge bg-purple-100 text-purple-600 ring-1 ring-purple-200">
          Gemini
        </span>
      </div>
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
        {recommendation}
      </p>
      <p className="mt-3 text-xs text-gray-400">
        Based only on the real data fetched above. Always verify price before purchasing.
      </p>
    </div>
  )
}
