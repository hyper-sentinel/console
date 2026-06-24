import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://console.hyper-sentinel.com"),
  title: "Sentinel — The First Web4 Terminal",
  description: "AI-powered autonomous trading terminal. Your AI subscription is your identity. Multi-LLM agents, on-chain execution, perp trading.",
  keywords: ["trading", "AI", "DeFi", "Hyperliquid", "Aster", "sentinel", "Web4", "terminal"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Sentinel — The First Web4 Terminal",
    description: "AI-powered autonomous trading terminal. Multi-LLM agents, on-chain execution, 69 tools.",
    images: [{ url: "/og-eyes.png", width: 1024, height: 1024, alt: "Sentinel Eyes" }],
  },
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
