import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#06060F",
        midnight: "#0C0C1E",
        coffee: "#10102A",
        indigo: "#4F46E5",
        plum: "#7C3AED",
      },
    },
  },
  plugins: [],
};

export default config;
