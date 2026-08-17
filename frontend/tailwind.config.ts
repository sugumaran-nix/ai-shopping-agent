import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fresh:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
        stale:  { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
        unavail:{ bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
      },
    },
  },
  plugins: [],
}
export default config
