import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar        from "@/components/ui/Navbar";
import MotionProvider from "@/components/ui/MotionProvider";

/**
 * next/font handles subsetting, font-display:swap, and preloading automatically.
 * The CSS variable --font-inter is injected on <html> and consumed in globals.css.
 * This replaces the render-blocking @import url(Google Fonts) that was in globals.css.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#06060F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-shopping-agent-indol.vercel.app"),
  title: {
    default: "Shopiq — AI Price Comparison for Indian Shopping",
    template: "%s | Shopiq",
  },
  description:
    "Compare prices across Amazon, Flipkart, Meesho and Myntra in one search. Gemini AI finds the best deal instantly — free, no signup.",
  keywords: [
    "price comparison India",
    "AI shopping",
    "Amazon vs Flipkart",
    "Meesho deals",
    "Myntra sale",
    "best price finder",
    "Gemini AI shopping",
  ],
  authors: [{ name: "Sugumaran", url: "https://github.com/sugumaran-nix" }],
  creator: "Sugumaran",
  openGraph: {
    title: "Shopiq — Compare prices across 4 Indian stores with AI",
    description:
      "One search. Amazon, Flipkart, Meesho, Myntra. Gemini AI picks the best deal.",
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Shopiq",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopiq — AI Price Comparison",
    description:
      "One search across 4 Indian e-commerce stores. AI picks your best deal.",
    creator: "@sugumaran_nix",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // color-scheme:dark tells the browser to use dark variants for
    // native UI: scrollbars, form controls, date pickers on Windows/Chrome.
    <html
      lang="en-IN"
      className={`${inter.variable} dark`}
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body>
        <div className="scene-bg"     aria-hidden="true" />
        <div className="scene-nebula" aria-hidden="true" />
        <div className="scene-stars"  aria-hidden="true" />

        
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] btn-primary"
        >
          Skip to content
        </a>

        {/* MotionProvider makes every framer-motion component respect
            the OS "Reduce Motion" setting — one wrapper, zero per-component changes. */}
        <MotionProvider>
          <Navbar />
          <main id="main-content">{children}</main>
        </MotionProvider>
      </body>
    </html>
  );
}
