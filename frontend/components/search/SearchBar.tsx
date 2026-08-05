"use client";

import { useState, useRef, FormEvent, KeyboardEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const POPULAR = [
  "Wireless earbuds",
  "Running shoes",
  "Formal shirts",
  "Smart watch",
  "Yoga mat",
  "Laptop stand",
];

interface SearchBarProps {
  defaultValue?: string;
  loading?: boolean;
  onSearch: (query: string) => void;
}

export default function SearchBar({
  defaultValue = "",
  loading = false,
  onSearch,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = value.trim().length >= 2 && !loading;

  function submit(q: string) {
    const t = q.trim();
    if (t.length < 2) return;
    setValue(t);
    onSearch(t);
    inputRef.current?.blur();
    setFocused(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(value);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setValue("");
      inputRef.current?.blur();
      setFocused(false);
    }
  }

  return (
    <div className="w-full relative">
      <form
        onSubmit={handleSubmit}
        className="glass rounded-2xl flex items-center gap-2 p-2"
        style={{
          border: focused
            ? "1px solid rgba(124,58,237,0.4)"
            : "1px solid var(--glass-border)",
          transition: "border-color 0.2s",
        }}
      >
        <span className="pl-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
          ) : (
            <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </span>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKey}
          placeholder="Search for any product…"
          className="flex-1 bg-transparent outline-none text-sm py-2"
          style={{ color: "var(--text-primary)" }}
          minLength={2}
          maxLength={200}
          autoComplete="off"
          spellCheck={false}
          aria-label="Product search"
        />

        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={() => { setValue(""); inputRef.current?.focus(); }}
              className="p-1 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary"
        >
          {loading ? "Searching…" : "Compare prices"}
        </button>
      </form>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {focused && !value && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 glass rounded-2xl p-3"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <p className="text-xs mb-2 px-2" style={{ color: "var(--text-muted)" }}>
              Popular searches
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => submit(s)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
