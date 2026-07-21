import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";

export const viewport: Viewport = {
  themeColor: "#06060F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://shopiq-two.vercel.app"),
  title: {
    default: "Shopiq — AI Price Comparison for Indian Shopping",
    template: "%s | Shopiq",
  },
  description:
    "Compare prices across Amazon, Flipkart, Meesho and Myntra in one search. Gemini AI finds the best deal instantly — free, no signup.",
  keywords: [
    "price comparison India", "AI shopping", "Amazon vs Flipkart",
    "Meesho deals", "Myntra sale", "best price finder", "Gemini AI shopping",
  ],
  authors: [{ name: "Sugumaran", url: "https://github.com/sugumaran-nix" }],
  creator: "Sugumaran",
  openGraph: {
    title: "Shopiq — Compare prices across 4 Indian stores with AI",
    description: "One search. Amazon, Flipkart, Meesho, Myntra. Gemini AI picks the best deal.",
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Shopiq",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopiq — AI Price Comparison",
    description: "One search across 4 Indian e-commerce stores. AI picks your best deal.",
    creator: "@sugumaran_nix",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="scene-bg"     aria-hidden="true" />
        <div className="scene-nebula" aria-hidden="true" />
        <div className="scene-stars"  aria-hidden="true" />
        <Navbar />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
