import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Shopping Agent',
  description: 'Compare products across Amazon, Flipkart, Meesho, Myntra & eBay — powered by Gemini AI.',
  openGraph: {
    title: 'AI Shopping Agent',
    description: 'Real-time product comparison with AI buying recommendations.',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2
                                    focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600
                                    focus:text-white focus:rounded-lg">
          Skip to main content
        </a>
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🛍️</span>
            <div>
              <p className="text-base font-bold text-gray-900 leading-none">AI Shopping Agent</p>
              <p className="text-xs text-gray-400 mt-0.5">Real prices · No ads · AI picks</p>
            </div>
          </div>
        </header>

        <main id="main" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400">
            Prices are scraped live from public listings. Always verify before buying.
            Not affiliated with any marketplace.
          </div>
        </footer>
      </body>
    </html>
  )
}
