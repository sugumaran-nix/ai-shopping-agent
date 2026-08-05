import type { ScrapeStatus } from "@/lib/api";

const LABELS: Record<ScrapeStatus, string> = {
  fresh: "Live",
  stale: "Cached",
  unavailable: "Unavailable",
};

const DOT_CLASS: Record<ScrapeStatus, string> = {
  fresh: "status-fresh",
  stale: "status-stale",
  unavailable: "status-unavailable",
};

export default function StatusBadge({ status }: { status: ScrapeStatus }) {
  return (
    <span className={`status-pill ${status}`} title={
      status === "fresh"
        ? "Scraped successfully just now"
        : status === "stale"
        ? "Live check failed - showing the last successful result"
        : "No current or cached data available for this source"
    }>
      <span className={`status-dot ${DOT_CLASS[status]}`} />
      {LABELS[status]}
    </span>
  );
}
