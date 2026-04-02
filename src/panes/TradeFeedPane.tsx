"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Trade {
  id: string;
  time: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  venue: string;
}

const WATCHED_COINS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "SUI", "WIF", "PEPE", "HYPE"];

export default function TradeFeedPane() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef(paused);

  // Keep ref in sync
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Subscribe to Hyperliquid L1 trade WebSocket
  const connect = useCallback(() => {
    const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Subscribe to trades for all watched coins
      WATCHED_COINS.forEach((coin) => {
        ws.send(JSON.stringify({
          method: "subscribe",
          subscription: { type: "trades", coin },
        }));
      });
    };

    ws.onmessage = (event) => {
      if (pausedRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg?.channel === "trades" && Array.isArray(msg?.data)) {
          const newTrades: Trade[] = msg.data.map((t: Record<string, unknown>, i: number) => ({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            time: new Date(Number(t.time) || Date.now()).toLocaleTimeString("en-US", { hour12: false }),
            symbol: `${t.coin || "?"}-PERP`,
            side: String(t.side).toLowerCase() === "b" || String(t.side).toLowerCase() === "buy" ? "buy" : "sell",
            price: parseFloat(String(t.px || t.price || "0")),
            size: parseFloat(String(t.sz || t.size || "0")),
            venue: "HL",
          }));

          setTrades((prev) => [...newTrades, ...prev].slice(0, 200));
        }
      } catch { /* skip malformed */ }
    };

    ws.onerror = () => { setConnected(false); ws.close(); };
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) connect();
      }, 3000);
    };

    return ws;
  }, []);

  useEffect(() => {
    const ws = connect();
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [connect]);

  const filtered = filter === "all" ? trades : trades.filter((t) => t.side === filter);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["all", "buy", "sell"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-[10px] px-2 py-0.5 rounded capitalize"
                style={{
                  background: filter === f ? (f === "buy" ? "rgba(0,255,136,0.1)" : f === "sell" ? "rgba(255,68,68,0.1)" : "var(--bg-hover)") : "transparent",
                  color: filter === f ? (f === "buy" ? "var(--accent-green)" : f === "sell" ? "var(--accent-red)" : "var(--text-primary)") : "var(--text-dim)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: connected ? "rgba(0,229,255,0.08)" : "rgba(255,68,68,0.08)",
              color: connected ? "var(--accent-cyan)" : "var(--accent-red)",
              border: `1px solid ${connected ? "rgba(0,229,255,0.2)" : "rgba(255,68,68,0.2)"}`,
            }}
          >
            {connected ? "HL LIVE" : "CONNECTING"}
          </span>
        </div>
        <button
          onClick={() => setPaused(!paused)}
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            background: paused ? "rgba(255,136,0,0.1)" : "transparent",
            color: paused ? "var(--accent-orange)" : "var(--text-dim)",
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[60px_1fr_60px_80px_70px_40px] gap-1 px-3 py-1 text-[9px] font-semibold uppercase" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
        <span>Time</span><span>Symbol</span><span>Side</span><span className="text-right">Price</span><span className="text-right">Size</span><span className="text-right">Venue</span>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-auto"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-cyan)", borderTopColor: "transparent" }} />
              <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>Waiting for trades...</span>
            </div>
          </div>
        ) : (
          filtered.map((trade) => (
            <div
              key={trade.id}
              className="grid grid-cols-[60px_1fr_60px_80px_70px_40px] gap-1 px-3 py-1 text-[10px] font-mono transition-colors"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: "var(--text-dim)" }}>{trade.time}</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{trade.symbol}</span>
              <span
                className="font-bold uppercase"
                style={{ color: trade.side === "buy" ? "var(--accent-green)" : "var(--accent-red)" }}
              >
                {trade.side}
              </span>
              <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                ${formatPrice(trade.price)}
              </span>
              <span className="text-right" style={{ color: "var(--text-secondary)" }}>
                {trade.size.toFixed(2)}
              </span>
              <span className="text-right text-[9px]" style={{ color: "var(--text-dim)" }}>
                {trade.venue}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t text-[9px] font-mono flex justify-between" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
        <span>{trades.length} trades</span>
        <span>Hyperliquid L1 WebSocket</span>
      </div>
    </div>
  );
}
