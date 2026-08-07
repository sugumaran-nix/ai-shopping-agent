"use client";

import { FormEvent, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const POPULAR = ["Wireless earbuds","Running shoes","Laptop","Smart watch","Kurta","Air fryer","Gaming chair","DSLR camera"];

interface Props {
  onSearch:     (q: string) => void;
  loading?:     boolean;
  defaultValue?: string;
}

export default function SearchBar({ onSearch, loading = false, defaultValue = "" }: Props) {
  const [value,   setValue]   = useState(defaultValue);
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

  function handleSubmit(e: FormEvent) { e.preventDefault(); submit(value); }

  return (
    <div className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className="glass rounded-2xl flex items-center gap-2 p-2"
        style={{ border: focused ? "1px solid rgba(124,58,237,0.45)" : "1px solid rgba(255,255,255,0.08)", transition: "border-color 0.2s" }}
      >
        <span className="pl-2 flex-shrink-0">
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin text-muted" />
            : <Search  className="w-4 h-4 text-muted" />
          }
        </span>

        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={()  => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => e.key === "Escape" && (setValue(""), setFocused(false))}
          placeholder="Search any product…"
          className="flex-1 bg-transparent outline-none text-sm py-2"
          style={{ color: "#F0F0FF" }}
          autoComplete="off"
          spellCheck={false}
          minLength={2}
          maxLength={200}
          aria-label="Product search"
        />

        <AnimatePresence>
          {value && !loading && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{   opacity: 0, scale: 0.8 }}
              onClick={() => { setValue(""); inputRef.current?.focus(); }}
              className="p-1 rounded-lg text-muted hover:text-white transition-colors"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        <button type="submit" disabled={!canSubmit} className="btn-primary text-sm py-2 px-4">
          {loading ? "Searching…" : "Compare"}
        </button>
      </form>

      {/* Suggestions */}
      <AnimatePresence>
        {focused && !value && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1,  y:  0 }}
            exit={{   opacity: 0,   y: -6 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 glass rounded-2xl p-3"
          >
            <p className="text-xs text-muted mb-2 px-1">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map(s => (
                <button
                  key={s} type="button"
                  onMouseDown={() => submit(s)}
                  className="px-3 py-1 rounded-full text-xs transition-all hover:scale-105"
                  style={{
                    background: "rgba(124,58,237,0.09)",
                    border:     "1px solid rgba(124,58,237,0.22)",
                    color:      "rgba(240,240,255,0.7)",
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
