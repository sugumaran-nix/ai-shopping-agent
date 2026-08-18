import { Bot, Sparkles } from 'lucide-react'
import { friendlyUserError } from '@/lib/api'

export function AIRecommendation({ recommendation, error, onRetry }: { recommendation: string | null; error: string | null; onRetry?: () => void }) {
  if (!recommendation && !error) return null
  const isFallback = Boolean(recommendation && error)

  if (error && !recommendation) {
    return <div className="flex items-center gap-3 rounded-[18px] border border-[#dfe1d8] bg-white/55 px-4 py-2.5"><div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f0f1ec] text-[#858a81]"><Bot className="h-3.5 w-3.5" aria-hidden /></div><div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5"><p className="eyebrow text-[#858a81]">AI recommendation</p><p className="truncate text-xs text-[#73786f]">{friendlyUserError(error, 'ai')}</p></div></div>
  }

  return <div className="overflow-hidden rounded-[24px] border border-[#384524] bg-[#171a16] text-[#f5f4ef] shadow-[0_20px_65px_rgba(36,46,23,0.14)]" role="region" aria-label="AI buying recommendation">
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9f36b] text-[#35530a]"><Sparkles className="h-4 w-4" aria-hidden /></div><div><p className="eyebrow text-[#aeb8a2]">AI recommendation</p><p className="mt-0.5 text-xs font-bold text-[#f5f4ef]">{isFallback ? 'A data-backed summary of the live results' : 'A grounded take on the live results'}</p></div><span className="ml-auto rounded-full border border-[#c9f36b]/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#c9f36b]">{isFallback ? 'Live data' : 'Gemini'}</span></div>
    <div className="px-5 py-5 sm:px-6 sm:py-6"><p className="max-w-4xl whitespace-pre-line text-[15px] leading-relaxed text-[#f5f4ef] sm:text-base">{recommendation}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="text-[10px] font-medium uppercase tracking-[0.12em] leading-relaxed text-[#8f9b84]">{isFallback ? 'AI is temporarily unavailable. This summary uses only the fetched prices and ratings.' : 'Based only on the product data fetched above. Verify price and availability before purchasing.'}</p>{isFallback && onRetry && <button type="button" onClick={onRetry} className="rounded-full border border-[#c9f36b]/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c9f36b] transition hover:bg-[#c9f36b] hover:text-[#35530a]">Try AI again</button>}</div></div>
  </div>
}
