import type { Metadata } from "next";
import "./globals.css";
import MotionProvider from "@/components/ui/MotionProvider";

export const metadata: Metadata = {
  title: "Shopiq — AI Price Comparison",
  description:
    "Compare real, live product prices across Amazon, Flipkart, Meesho, Myntra, and eBay. AI-powered recommendations based strictly on actual data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scene-bg" aria-hidden="true" />
        <div className="scene-nebula" aria-hidden="true" />
        <div className="scene-stars" aria-hidden="true" />
        <MotionProvider>
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
