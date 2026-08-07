import type { Status } from "@/types";

const LABELS: Record<Status, string> = {
  fresh:       "Live",
  stale:       "Cached",
  unavailable: "Unavailable",
};

const TITLES: Record<Status, string> = {
  fresh:       "Scraped live just now",
  stale:       "Live scrape failed — showing last known result",
  unavailable: "No data available from this source right now",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-pill ${status}`} title={TITLES[status]}>
      <span className={`status-dot dot-${status}`} />
      {LABELS[status]}
    </span>
  );
}
