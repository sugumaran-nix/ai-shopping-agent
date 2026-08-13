import type { ScrapeStatus } from '@/lib/api'

const CONFIG: Record<ScrapeStatus, { label: string; color: string; dot: string; title: string }> = {
  fresh:       { label: 'Live',    color: 'bg-green-100 text-green-700 ring-green-200', dot: 'bg-green-500', title: 'Scraped live just now'                              },
  stale:       { label: 'Cached', color: 'bg-amber-100 text-amber-700 ring-amber-200', dot: 'bg-amber-500', title: 'Live scrape failed — showing last known prices'     },
  unavailable: { label: 'Down',   color: 'bg-red-100   text-red-700   ring-red-200',   dot: 'bg-red-400',   title: 'Could not reach this source'                        },
}

export function StatusBadge({ status }: { status: ScrapeStatus }) {
  const { label, color, dot, title } = CONFIG[status]
  return (
    <span
      className={`badge ring-1 ${color} gap-1.5`}
      title={title}
      aria-label={`${label}: ${title}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'fresh' ? 'animate-pulse' : ''}`}
            aria-hidden />
      {label}
    </span>
  )
}
