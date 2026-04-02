import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — The First Web4 Terminal",
  description: "AI-powered autonomous trading terminal. Your AI subscription is your identity. Multi-LLM agents, on-chain execution, perp trading, prediction markets.",
  keywords: ["trading", "AI", "DeFi", "Hyperliquid", "Polymarket", "Aster", "sentinel", "Web4", "terminal"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
