"use client";
import { useState, useEffect, useRef, memo } from "react";

// ── Symbol mapping: internal name → TradingView symbol ──
const TV_SYMBOLS: Record<string, string> = {
  "BTC-PERP": "BYBIT:BTCUSDT.P",
  "ETH-PERP": "BYBIT:ETHUSDT.P",
  "SOL-PERP": "BYBIT:SOLUSDT.P",
  "DOGE-PERP": "BYBIT:DOGEUSDT.P",
  "ARB-PERP": "BYBIT:ARBUSDT.P",
  "SUI-PERP": "BYBIT:SUIUSDT.P",
  "AVAX-PERP": "BYBIT:AVAXUSDT.P",
  "LINK-PERP": "BYBIT:LINKUSDT.P",
  "WIF-PERP": "BYBIT:WIFUSDT.P",
  "PEPE-PERP": "BYBIT:PEPEUSDT.P",
  "HYPE-PERP": "BYBIT:HYPEUSDT.P",
};

const SYMBOLS = Object.keys(TV_SYMBOLS);
const INTERVALS = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "1D", value: "D" },
  { label: "1W", value: "W" },
];

// ── TradingView Widget Component ──
const TradingViewWidget = memo(function TradingViewWidget({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    // Create widget container
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);

    // Inject TradingView script
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(10, 10, 10, 1)",
      gridColor: "rgba(30, 30, 30, 0.6)",
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: true,
      withdateranges: true,
      details: true,
      calendar: false,
      studies: ["STD;EMA"],
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, interval]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: "100%", width: "100%" }}
    />
  );
});

export default function ChartPane() {
  const [symbol, setSymbol] = useState("BTC-PERP");
  const [interval, setInterval] = useState("60");

  const tvSymbol = TV_SYMBOLS[symbol] || "BYBIT:BTCUSDT.P";

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="text-xs font-mono font-bold bg-transparent border rounded px-2 py-1 cursor-pointer"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s} style={{ background: "#0a0a0a" }}>
                {s}
              </option>
            ))}
          </select>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(0, 229, 255, 0.08)",
              color: "var(--accent-cyan)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
            }}
          >
            LIVE
          </span>
        </div>
        <div className="flex gap-0.5">
          {INTERVALS.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setInterval(tf.value)}
              className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
              style={{
                background:
                  interval === tf.value ? "var(--accent-green)" : "transparent",
                color: interval === tf.value ? "#000" : "var(--text-dim)",
                fontWeight: interval === tf.value ? 700 : 400,
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* TradingView Chart — real live data */}
      <div className="flex-1 min-h-0">
        <TradingViewWidget symbol={tvSymbol} interval={interval} />
      </div>
    </div>
  );
}
