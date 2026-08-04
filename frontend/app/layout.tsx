import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Shopping Agent",
  description: "Compare real, validated product prices across Amazon, Flipkart, Meesho, Myntra, and eBay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scene-bg" />
        <div className="scene-nebula" />
        <div className="scene-stars" />
        {children}
      </body>
    </html>
  );
}
