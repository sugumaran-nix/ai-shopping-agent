import Image from 'next/image'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import './globals.css'
import { ThemeToggle } from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: { default: 'AI Shopping Agent', template: '%s — AI Shopping Agent' },
  description: 'Compare real prices across Amazon, Flipkart, Meesho, Myntra & JioMart with transparent weighted buying recommendations.',
  keywords: ['price comparison', 'shopping', 'Amazon', 'Flipkart', 'Meesho', 'Myntra', 'JioMart', 'product ranking'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'AI Shopping Agent',
    description: 'Real-time product comparison across Amazon, Flipkart, Meesho, Myntra, and JioMart with transparent product ranking.',
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
            <Link href="/" className="group flex items-center gap-3" aria-label="AI Shopping Agent home">
              <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] bg-[#171a16] shadow-[0_8px_20px_rgba(23,26,22,0.14)]">
                <Image src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg opacity-95 transition-transform duration-300 group-hover:scale-110" />
              </span>
              <span className="hidden sm:block">
                <span className="block text-[13px] font-bold tracking-[-0.02em] text-[#171a16]">AI Shopping Agent</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8f84]">Better buys, less browsing</span>
              </span>
            </Link>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <a
                href="https://github.com/sugumaran-nix/ai-shopping-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring flex h-8 w-8 items-center justify-center text-[#73786f] transition hover:-translate-y-0.5 hover:text-[#35530a] dark:text-[#c9f36b] dark:hover:text-[#d9f6a4]"
                title="View source on GitHub"
                aria-label="View source on GitHub"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" /></svg>
              </a>
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
