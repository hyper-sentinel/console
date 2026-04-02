"use client";
import { useState, useMemo } from "react";
import { useHLOrderbook, useAsterOrderbook } from "@/lib/hooks";

interface OrderLevel {
  px?: string;
  price?: string | number;
  sz?: string;
  size?: string | number;
  quantity?: string | number;
  n?: number;
}

interface OrderbookData {
  bids?: OrderLevel[];
  asks?: OrderLevel[];
  levels?: [OrderLevel[], OrderLevel[]];
}

const EXCHANGES = [
  { id: "hl" as const, name: "Hyperliquid" },
  { id: "aster" as const, name: "Aster DEX" },
];

const HL_SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "SUI"];
const ASTER_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

function parseLevel(level: OrderLevel): { price: number; size: number } {
  const price = parseFloat((level.px ?? level.price ?? "0").toString());
  const size = parseFloat((level.sz ?? level.size ?? level.quantity ?? "0").toString());
  return { price, size };
}

function DepthBar({ ratio, side }: { ratio: number; side: "bid" | "ask" }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div
        className="h-full"
        style={{
          width: `${Math.min(ratio * 100, 100)}%`,
          background: side === "bid" ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)",
          float: side === "bid" ? "right" : "left",
        }}
      />
    </div>
  );
}

export default function OrderbookPane() {
  const [exchange, setExchange] = useState<"hl" | "aster">("hl");
  const [symbol, setSymbol] = useState("BTC");
  const symbols = exchange === "hl" ? HL_SYMBOLS : ASTER_SYMBOLS;

  const { data: hlData, isLoading: hlLoading, error: hlError } = useHLOrderbook(
    exchange === "hl" ? symbol : ""
  );
  const { data: asterData, isLoading: asterLoading, error: asterError } = useAsterOrderbook(
    exchange === "aster" ? symbol : ""
  );

  const isLoading = exchange === "hl" ? hlLoading : asterLoading;
  const error = exchange === "hl" ? hlError : asterError;
  const rawData = (exchange === "hl" ? hlData : asterData) as OrderbookData | undefined;

  // Parse bids and asks
  const { bids, asks, spread, spreadPct, maxSize } = useMemo(() => {
    if (!rawData) return { bids: [], asks: [], spread: 0, spreadPct: 0, maxSize: 1 };

    let rawBids: OrderLevel[] = [];
    let rawAsks: OrderLevel[] = [];

    if (rawData.levels && Array.isArray(rawData.levels)) {
      rawBids = rawData.levels[0] || [];
      rawAsks = rawData.levels[1] || [];
    } else {
      rawBids = rawData.bids || [];
      rawAsks = rawData.asks || [];
    }

    const parsedBids = rawBids.slice(0, 15).map(parseLevel).filter((l) => l.price > 0);
    const parsedAsks = rawAsks.slice(0, 15).map(parseLevel).filter((l) => l.price > 0);

    // Sort: bids descending, asks ascending
    parsedBids.sort((a, b) => b.price - a.price);
    parsedAsks.sort((a, b) => a.price - b.price);

    const bestBid = parsedBids[0]?.price || 0;
    const bestAsk = parsedAsks[0]?.price || 0;
    const sp = bestAsk - bestBid;
    const mid = (bestAsk + bestBid) / 2;

    const allSizes = [...parsedBids, ...parsedAsks].map((l) => l.size);
    const maxSz = Math.max(...allSizes, 1);

    return {
      bids: parsedBids,
      asks: parsedAsks,
      spread: sp,
      spreadPct: mid > 0 ? (sp / mid) * 100 : 0,
      maxSize: maxSz,
    };
  }, [rawData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs font-mono animate-pulse" style={{ color: "var(--text-dim)" }}>Loading orderbook...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-xs font-mono mb-2" style={{ color: "var(--accent-red)" }}>⚠ Orderbook unavailable</p>
          <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>Check API keys and connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="px-2 py-1.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
        {EXCHANGES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => { setExchange(ex.id); setSymbol(ex.id === "hl" ? "BTC" : "BTCUSDT"); }}
            className="text-[10px] px-2 py-0.5 rounded font-medium"
            style={{
              background: exchange === ex.id ? "rgba(0,255,136,0.1)" : "transparent",
              color: exchange === ex.id ? "var(--accent-green)" : "var(--text-dim)",
              border: exchange === ex.id ? "1px solid rgba(0,255,136,0.3)" : "1px solid transparent",
            }}
          >
            {ex.name}
          </button>
        ))}
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="ml-auto text-[10px] font-mono bg-transparent border rounded px-1.5 py-0.5"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          {symbols.map((s) => (
            <option key={s} value={s} style={{ background: "#0a0a0a" }}>{s}</option>
          ))}
        </select>
      </div>

      {/* Orderbook */}
      <div className="flex-1 overflow-auto">
        {bids.length === 0 && asks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>No orderbook data</p>
          </div>
        ) : (
          <div className="text-[10px] font-mono">
            {/* Header */}
            <div className="flex justify-between px-2 py-1 border-b" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
              <span className="w-1/3">Price</span>
              <span className="w-1/3 text-right">Size</span>
              <span className="w-1/3 text-right">Total</span>
            </div>

            {/* Asks (reversed so lowest ask is at bottom near spread) */}
            {[...asks].reverse().map((level, i) => {
              const cumSize = asks.slice(0, asks.length - i).reduce((s, l) => s + l.size, 0);
              return (
                <div key={`ask-${i}`} className="flex justify-between px-2 py-0.5 relative" style={{ color: "var(--accent-red)" }}>
                  <DepthBar ratio={level.size / maxSize} side="ask" />
                  <span className="w-1/3 relative z-10">{level.price.toFixed(2)}</span>
                  <span className="w-1/3 text-right relative z-10">{level.size.toFixed(4)}</span>
                  <span className="w-1/3 text-right relative z-10" style={{ color: "var(--text-dim)" }}>{cumSize.toFixed(4)}</span>
                </div>
              );
            })}

            {/* Spread */}
            <div className="flex justify-center py-1.5 border-y" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--accent-cyan)" }}>
                Spread: {spread.toFixed(2)} ({spreadPct.toFixed(3)}%)
              </span>
            </div>

            {/* Bids */}
            {bids.map((level, i) => {
              const cumSize = bids.slice(0, i + 1).reduce((s, l) => s + l.size, 0);
              return (
                <div key={`bid-${i}`} className="flex justify-between px-2 py-0.5 relative" style={{ color: "var(--accent-green)" }}>
                  <DepthBar ratio={level.size / maxSize} side="bid" />
                  <span className="w-1/3 relative z-10">{level.price.toFixed(2)}</span>
                  <span className="w-1/3 text-right relative z-10">{level.size.toFixed(4)}</span>
                  <span className="w-1/3 text-right relative z-10" style={{ color: "var(--text-dim)" }}>{cumSize.toFixed(4)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
