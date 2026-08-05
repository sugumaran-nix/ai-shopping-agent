"use client";

import { Search } from "lucide-react";
import { FormEvent, useState } from "react";

export default function SearchBar({
  onSearch,
  loading,
}: {
  onSearch: (query: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length >= 2) onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-2 flex items-center gap-2 focus-ring-violet">
      <Search size={18} className="ml-3 text-[color:var(--text-muted)]" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search for a product…"
        className="flex-1 bg-transparent outline-none text-sm py-2 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]"
        minLength={2}
        maxLength={200}
        required
      />
      <button type="submit" className="btn-primary" disabled={loading || value.trim().length < 2}>
        {loading ? "Searching…" : "Compare prices"}
      </button>
    </form>
  );
}
