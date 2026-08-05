"use client";

import { SITE_META } from "@/lib/api";
import type { SourceResult } from "@/types";

interface SiteFilterProps {
  results: SourceResult[];
  selected: string[];
  onToggle: (site: string) => void;
}

export default function SiteFilter({ results, selected, onToggle }: SiteFilterProps) {
  if (!results.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {results.map((r) => {
        const meta = SITE_META[r.source] ?? {
          label: r.source,
          color: "#888",
          bg: "rgba(136,136,136,0.1)",
        };
        const active = selected.includes(r.source);
        const count = r.products.length;

        return (
          <button
            key={r.source}
            type="button"
            onClick={() => onToggle(r.source)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: active ? meta.bg : "rgba(255,255,255,0.04)",
              border: `1px solid ${active ? meta.color + "45" : "rgba(255,255,255,0.07)"}`,
              color: active ? meta.color : "var(--text-muted)",
            }}
            aria-pressed={active}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: active ? meta.color : "rgba(255,255,255,0.2)" }}
            />
            {meta.label}
            <span
              className="ml-0.5 text-[10px] font-normal px-1 py-0.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-muted)",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
