"use client";

import { motion } from "framer-motion";
import { SITE_META } from "@/lib/api";

interface SiteFilterProps {
  selected: string;
  onChange: (site: string) => void;
  counts: Record<string, number>;
  total: number;
}

const SITES = ["amazon", "flipkart", "meesho", "myntra"];

export default function SiteFilter({ selected, onChange, counts, total }: SiteFilterProps) {
  const tabs = [
    { key: "all", label: "All", count: total, color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
    ...SITES
      .filter((s) => counts[s] > 0)
      .map((s) => ({
        key:   s,
        label: SITE_META[s]?.label ?? s,
        count: counts[s] ?? 0,
        color: SITE_META[s]?.color ?? "#888",
        bg:    SITE_META[s]?.bg    ?? "rgba(136,136,136,0.12)",
      })),
  ];

  return (
    /*
      Fixed: was role="tablist" + role="tab" which requires id + aria-controls + role="tabpanel"
      on the content area to be a valid ARIA pattern.
      Changed to role="radiogroup" + role="radio" which is semantically correct for
      "pick exactly one option from a set" without needing panel association.
    */
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Filter results by store"
    >
      {tabs.map((tab) => {
        const active = selected === tab.key;
        return (
          <motion.button
            key={tab.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(tab.key)}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[36px]"
            style={{
              background: active ? tab.bg        : "transparent",
              border:     `1px solid ${active ? tab.color + "50" : "rgba(255,255,255,0.08)"}`,
              color:      active ? tab.color      : "var(--text-muted)",
            }}
          >
            {tab.label}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums"
              style={{
                background: active ? `${tab.color}25`       : "rgba(255,255,255,0.06)",
                color:      active ? tab.color               : "var(--text-muted)",
              }}
            >
              {tab.count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
