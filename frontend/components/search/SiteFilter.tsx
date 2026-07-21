"use client";

import { SITE_META } from "@/lib/api";

interface SiteFilterProps {
  selected: string;
  onChange: (site: string) => void;
  counts: Record<string, number>;
  total: number;
}

const SITES = ["all", "amazon", "flipkart", "meesho", "myntra"];

export default function SiteFilter({ selected, onChange, counts, total }: SiteFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by platform">
      {SITES.map((site) => {
        const isActive = selected === site;
        const meta     = site === "all" ? null : SITE_META[site];
        const count    = site === "all" ? total : (counts[site] ?? 0);
        const color    = meta?.color ?? "var(--accent-violet)";
        const label    = meta?.label ?? "All";

        return (
          <button
            key={site}
            type="button"
            onClick={() => onChange(site)}
            aria-pressed={isActive}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: isActive ? `${color}20` : "rgba(255,255,255,0.04)",
              border: `1px solid ${isActive ? color + "55" : "rgba(255,255,255,0.08)"}`,
              color: isActive ? color : "var(--text-secondary)",
            }}
          >
            {label}
            {count > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: isActive ? `${color}25` : "rgba(255,255,255,0.06)",
                  color: isActive ? color : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
