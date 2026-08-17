import { Bot, Sparkles } from 'lucide-react'

export function AIRecommendation({ recommendation, error }: { recommendation: string | null; error: string | null }) {
  if (!recommendation && !error) return null

  if (error && !recommendation) {
    return <div className="flex items-start gap-3 rounded-[22px] border border-[#dfe1d8] bg-white/60 px-5 py-4"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f0f1ec] text-[#858a81]"><Bot className="h-4 w-4" aria-hidden /></div><div className="min-w-0"><p className="eyebrow text-[#858a81]">AI recommendation</p><p className="mt-1 text-sm leading-relaxed text-[#73786f]">{error}</p></div></div>
  }

  return <div className="overflow-hidden rounded-[24px] border border-[#384524] bg-[#171a16] text-[#f5f4ef] shadow-[0_20px_65px_rgba(36,46,23,0.14)]" role="region" aria-label="AI buying recommendation">
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9f36b] text-[#35530a]"><Sparkles className="h-4 w-4" aria-hidden /></div><div><p className="eyebrow text-[#aeb8a2]">AI recommendation</p><p className="mt-0.5 text-xs font-bold text-[#f5f4ef]">A grounded take on the live results</p></div><span className="ml-auto rounded-full border border-[#c9f36b]/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#c9f36b]">Gemini</span></div>
    <div className="px-5 py-5 sm:px-6 sm:py-6"><p className="max-w-4xl text-[15px] leading-relaxed text-[#f5f4ef] sm:text-base">{recommendation}</p><p className="mt-5 border-t border-white/10 pt-4 text-[10px] font-medium uppercase tracking-[0.12em] leading-relaxed text-[#8f9b84]">Based only on the product data fetched above. Verify price and availability before purchasing.</p></div>
  </div>
}
