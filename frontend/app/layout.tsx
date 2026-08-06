import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/ui/MotionProvider";

// next/font loads Inter with font-display:swap, self-hosted on Vercel's CDN
// — no blocking network request to fonts.googleapis.com
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shopiq — AI Price Comparison",
  description:
    "Compare real, live product prices across Amazon, Flipkart and eBay. AI-powered recommendations based strictly on actual data.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}>
        <div className="scene-bg" aria-hidden="true" />
        <div className="scene-nebula" aria-hidden="true" />
        <div className="scene-stars" aria-hidden="true" />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
