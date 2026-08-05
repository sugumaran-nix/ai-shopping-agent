import type { ScrapeStatus } from "@/types";

const LABELS: Record<ScrapeStatus, string> = {
  fresh: "Live",
  stale: "Cached",
  unavailable: "Unavailable",
};

const DOT: Record<ScrapeStatus, string> = {
  fresh: "status-fresh",
  stale: "status-stale",
  unavailable: "status-unavailable",
};

const TITLES: Record<ScrapeStatus, string> = {
  fresh: "Scraped successfully right now",
  stale: "Live check failed – showing last successful result",
  unavailable: "No current or cached data for this source",
};

export default function StatusBadge({ status }: { status: ScrapeStatus }) {
  return (
    <span className={`status-pill ${status}`} title={TITLES[status]}>
      <span className={`status-dot ${DOT[status]}`} />
      {LABELS[status]}
    </span>
  );
}
