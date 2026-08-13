import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'AI Shopping Agent', template: '%s — AI Shopping Agent' },
  description: 'Compare real prices across Amazon, Flipkart, Meesho, Myntra & eBay. AI-powered buying recommendations grounded in live data.',
  keywords: ['price comparison', 'shopping', 'Amazon', 'Flipkart', 'Meesho', 'Myntra', 'AI'],
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
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50">

        {/* Skip to content */}
        <a href="#main"
           className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3
                      focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600
                      focus:text-white focus:rounded-lg focus:text-sm focus:font-medium
                      focus:shadow-lg focus:outline-none">
          Skip to main content
        </a>

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center
                              text-white text-sm font-bold shadow-sm flex-shrink-0">
                AI
              </div>
              <div>
                <span className="font-bold text-gray-900 text-sm leading-none block">
                  AI Shopping Agent
                </span>
                <span className="text-[11px] text-gray-400 leading-none block mt-0.5">
                  Real prices · No ads · AI picks
                </span>
              </div>
            </div>
            <nav className="hidden sm:flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                 className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                GitHub
              </a>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main id="main" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap
                          items-center justify-between gap-3 text-xs text-gray-400">
            <p>
              Prices scraped live from public listings. Not affiliated with any marketplace.
              Always verify before buying.
            </p>
            <p>Built with Next.js + FastAPI + Gemini</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
