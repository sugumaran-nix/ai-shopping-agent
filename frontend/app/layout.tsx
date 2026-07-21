import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Shopiq — Search Smarter, Shop Better",
  description: "Search Amazon, Flipkart, Meesho and Myntra in one shot. Gemini AI picks the best deal for you.",
  keywords: ["shopping", "price comparison", "Amazon", "Flipkart", "Meesho", "Myntra", "AI shopping"],
  openGraph: {
    title: "Shopiq — AI Shopping Agent",
    description: "One search. Four stores. AI picks the best deal.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#06040B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {/* Galaxy background layers */}
        <div className="galaxy-bg" aria-hidden="true" />
        <div className="stars"     aria-hidden="true" />

        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
