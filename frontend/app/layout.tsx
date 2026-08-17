import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeToggle } from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: { default: 'AI Shopping Agent', template: '%s — AI Shopping Agent' },
  description: 'Compare real prices across Amazon, Flipkart, Meesho & Myntra. AI-powered buying recommendations grounded in live data.',
  keywords: ['price comparison', 'shopping', 'Amazon', 'Flipkart', 'Meesho', 'Myntra', 'AI'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.ico',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'AI Shopping Agent',
    description: 'Real-time product comparison across 5 marketplaces with AI recommendations.',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c9f36b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#f5f4ef] text-[#171a16]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#171a16] focus:text-[#f5f4ef] focus:rounded-full focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>

        <header className="sticky top-0 z-20 border-b border-[#dfe1d8]/90 bg-[#f5f4ef]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-5 sm:px-8">
            <a href="/" className="group flex items-center gap-3" aria-label="AI Shopping Agent home">
              <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] bg-[#171a16] shadow-[0_8px_20px_rgba(23,26,22,0.14)]">
                <img src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg opacity-95 transition-transform duration-300 group-hover:scale-110" />
              </span>
              <span className="hidden sm:block">
                <span className="block text-[13px] font-bold tracking-[-0.02em] text-[#171a16]">AI Shopping Agent</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8f84]">Better buys, less browsing</span>
              </span>
            </a>

            <div className="flex items-center gap-3 sm:gap-5">
              <div className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73786f] sm:flex">
                <span className="h-2 w-2 rounded-full bg-[#9ed83f] shadow-[0_0_0_4px_rgba(158,216,63,0.18)]" aria-hidden />
                Live comparison
              </div>
              <div className="rounded-full border border-[#cdd1c5] bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#73786f] dark:border-[#39452d] dark:bg-[#1c2418] dark:text-[#c9f36b]">
                4 marketplaces
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main id="main" className="paper-grid flex-1">
          <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:py-16">
            {children}
          </div>
        </main>

        <footer className="border-t border-[#dfe1d8] bg-[#f5f4ef]">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-[11px] font-medium text-[#858a81] sm:px-8">
            <p className="max-w-xl leading-relaxed">Prices are gathered from public listings. Always verify the final price, availability, and delivery details before buying.</p>
            <p className="uppercase tracking-[0.16em]">Live listings · grounded picks</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
