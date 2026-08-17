'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = window.localStorage.getItem('ai-shopping-theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const nextTheme: Theme = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    setTheme(nextTheme)
  }, [])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    root.classList.add('theme-changing')
    root.classList.toggle('dark', nextTheme === 'dark')
    window.localStorage.setItem('ai-shopping-theme', nextTheme)
    setTheme(nextTheme)
    window.setTimeout(() => root.classList.remove('theme-changing'), 380)
  }

  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="focus-ring group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#dfe1d8] bg-white/60 text-[#73786f] transition-all duration-300 hover:border-[#b7c19e] hover:text-[#4e6d19] dark:border-[#39452d] dark:bg-[#1c2418] dark:text-[#c9f36b] dark:hover:border-[#718c3c]"
    >
      <span className="absolute inset-0 rounded-full bg-[#c9f36b]/0 transition-colors duration-300 group-hover:bg-[#c9f36b]/20" aria-hidden />
      <Sun className={`absolute h-4 w-4 transition-all duration-300 ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} aria-hidden />
      <Moon className={`absolute h-4 w-4 transition-all duration-300 ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} aria-hidden />
    </button>
  )
}
