import { CheckCircle, Clock, XCircle } from 'lucide-react'
import type { ScrapeStatus } from '@/lib/api'

const CONFIG: Record<ScrapeStatus, {
  label: string
  Icon: React.ElementType
  dot: string
  bg: string
  text: string
  title: string
}> = {
  fresh: {
    label: 'Live',
    Icon: CheckCircle,
    dot: 'bg-green-500 animate-pulse',
    bg: 'bg-green-100',
    text: 'text-green-800',
    title: 'Scraped fresh right now',
  },
  stale: {
    label: 'Cached',
    Icon: Clock,
    dot: 'bg-amber-500',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    title: 'Showing cached results — live scrape failed',
  },
  unavailable: {
    label: 'Down',
    Icon: XCircle,
    dot: 'bg-red-400',
    bg: 'bg-red-100',
    text: 'text-red-800',
    title: 'Could not reach this source',
  },
}

export function StatusBadge({ status }: { status: ScrapeStatus }) {
  const { label, Icon, dot, bg, text, title } = CONFIG[status]
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${bg} ${text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} aria-hidden />
      <Icon className="w-3 h-3" aria-hidden />
      {label}
    </span>
  )
}
