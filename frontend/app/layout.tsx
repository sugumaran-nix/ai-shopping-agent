import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300","400","500","600","700","800","900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shopiq — AI Price Comparison India",
  description:
    "Compare live prices across Amazon, Flipkart, AJIO, Snapdeal and Croma. AI-powered recommendations based on real data.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="scene-bg"  aria-hidden="true" />
        <div className="scene-orbs" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
