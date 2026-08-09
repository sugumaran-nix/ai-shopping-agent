import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        bg:      "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        border:  "hsl(var(--border))",
        primary: "hsl(var(--primary))",
        accent:  "hsl(var(--accent))",
        muted:   "hsl(var(--muted))",
        fresh:   "#10B981",
        stale:   "#F59E0B",
        danger:  "#F43F5E",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
