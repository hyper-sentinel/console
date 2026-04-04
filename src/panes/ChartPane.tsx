"use client";
import { useState, useEffect, useRef, memo, useCallback } from "react";
import { createChart, CandlestickSeries, HistogramSeries, CandlestickData, HistogramData, Time, IChartApi, ISeriesApi, ColorType } from "lightweight-charts";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type DataSource = "coingecko" | "hl" | "aster";

interface SymbolConfig {
  label: string;
  coinId?: string;      // CoinGecko ID
  hlCoin?: string;      // Hyperliquid coin name
  asterSymbol?: string; // Aster DEX symbol
}

// ── Symbol registry ───────────────────────────────────────────

const SYMBOLS: Record<string, SymbolConfig> = {
  BTC:   { label: "BTC / USD",   coinId: "bitcoin",         hlCoin: "BTC",  asterSymbol: "BTCUSDT" },
  ETH:   { label: "ETH / USD",   coinId: "ethereum",        hlCoin: "ETH",  asterSymbol: "ETHUSDT" },
  SOL:   { label: "SOL / USD",   coinId: "solana",          hlCoin: "SOL",  asterSymbol: "SOLUSDT" },
  HYPE:  { label: "HYPE / USD",  coinId: "hyperliquid",     hlCoin: "HYPE" },
  SUI:   { label: "SUI / USD",   coinId: "sui",             hlCoin: "SUI",  asterSymbol: "SUIUSDT" },
  DOGE:  { label: "DOGE / USD",  coinId: "dogecoin",        hlCoin: "DOGE", asterSymbol: "DOGEUSDT" },
  ARB:   { label: "ARB / USD",   coinId: "arbitrum",        hlCoin: "ARB" },
  AVAX:  { label: "AVAX / USD",  coinId: "avalanche-2",     hlCoin: "AVAX", asterSymbol: "AVAXUSDT" },
  LINK:  { label: "LINK / USD",  coinId: "chainlink",       hlCoin: "LINK", asterSymbol: "LINKUSDT" },
  PEPE:  { label: "PEPE / USD",  coinId: "pepe",            hlCoin: "PEPE", asterSymbol: "PEPEUSDT" },
  WIF:   { label: "WIF / USD",   coinId: "dogwifcoin",      hlCoin: "WIF" },
  XRP:   { label: "XRP / USD",   coinId: "ripple",          hlCoin: "XRP" },
  ADA:   { label: "ADA / USD",   coinId: "cardano" },
  DOT:   { label: "DOT / USD",   coinId: "polkadot" },
  ATOM:  { label: "ATOM / USD",  coinId: "cosmos" },
  UNI:   { label: "UNI / USD",   coinId: "uniswap" },
  APT:   { label: "APT / USD",   coinId: "aptos",           hlCoin: "APT" },
  NEAR:  { label: "NEAR / USD",  coinId: "near",            hlCoin: "NEAR" },
  OP:    { label: "OP / USD",    coinId: "optimism",        hlCoin: "OP" },
  TON:   { label: "TON / USD",   coinId: "the-open-network" },
};

const TIMEFRAMES = [
  { label: "1D",  days: 1,   interval: "hourly" as const },
  { label: "7D",  days: 7,   interval: "hourly" as const },
  { label: "1M",  days: 30,  interval: "daily" as const },
  { label: "3M",  days: 90,  interval: "daily" as const },
  { label: "1Y",  days: 365, interval: "daily" as const },
  { label: "ALL", days: 0,   interval: "daily" as const },
];

// ── Data fetching ─────────────────────────────────────────────

async function fetchCoinGeckoOHLCV(coinId: string, days: number): Promise<OHLCVBar[]> {
  const d = days === 0 ? "max" : String(days);
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${d}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data: number[][] = await res.json();
  return data.map(([t, o, h, l, c]) => ({
    time: Math.floor(t / 1000),
    open: o, high: h, low: l, close: c,
  }));
}

async function fetchAsterKlines(symbol: string, days: number): Promise<OHLCVBar[]> {
  try {
    const interval = days <= 1 ? "1m" : days <= 7 ? "15m" : days <= 30 ? "1h" : "4h";
    const limit = days <= 1 ? 1440 : days <= 7 ? 672 : days <= 30 ? 720 : 500;
    const result = await api.call("aster_klines", { symbol, interval, limit });
    const klines = Array.isArray(result) ? result : (result as { data?: unknown[] })?.data || [];
    return (klines as number[][]).map(k => ({
      time: Math.floor(Number(k[0]) / 1000),
      open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]),
      volume: Number(k[5] || 0),
    }));
  } catch {
    throw new Error("Aster klines unavailable");
  }
}

async function fetchOHLCV(symbol: string, days: number, source: DataSource): Promise<OHLCVBar[]> {
  const config = SYMBOLS[symbol];
  if (!config) throw new Error(`Unknown symbol: ${symbol}`);

  if (source === "aster" && config.asterSymbol) {
    return fetchAsterKlines(config.asterSymbol, days);
  }

  // Default to CoinGecko (works without auth)
  if (config.coinId) {
    return fetchCoinGeckoOHLCV(config.coinId, days);
  }

  throw new Error("No data source available");
}

// ── Price formatting ──────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// ── Chart engine ──────────────────────────────────────────────

const NativeChart = memo(function NativeChart({
  bars,
  isLoading,
}: {
  bars: OHLCVBar[];
  isLoading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram", Time> | null>(null);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#08080C" },
        textColor: "#52525B",
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.02)" },
        horzLines: { color: "rgba(255,255,255,0.02)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "rgba(0, 229, 255, 0.15)", width: 1, style: 2, labelBackgroundColor: "#111115" },
        horzLine: { color: "rgba(0, 229, 255, 0.15)", width: 1, style: 2, labelBackgroundColor: "#111115" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.04)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.04)",
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00FF88",
      downColor: "#FF4444",
      borderUpColor: "#00FF88",
      borderDownColor: "#FF4444",
      wickUpColor: "rgba(0, 255, 136, 0.5)",
      wickDownColor: "rgba(255, 68, 68, 0.5)",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || bars.length === 0) return;

    // De-dupe and sort by time
    const seen = new Set<number>();
    const unique = bars.filter(b => {
      if (seen.has(b.time)) return false;
      seen.add(b.time);
      return true;
    }).sort((a, b) => a.time - b.time);

    const candleData: CandlestickData<Time>[] = unique.map(b => ({
      time: b.time as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    const volumeData: HistogramData<Time>[] = unique.map(b => ({
      time: b.time as Time,
      value: b.volume || 0,
      color: b.close >= b.open ? "rgba(0, 255, 136, 0.12)" : "rgba(255, 68, 68, 0.12)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(8,8,12,0.8)" }}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "#00FF88", borderTopColor: "transparent" }} />
            <span className="text-[10px] font-mono" style={{ color: "#3F3F46" }}>Loading chart data...</span>
          </div>
        </div>
      )}
    </div>
  );
});

// ── TradingView Widget (fallback) ─────────────────────────────

const TV_SYMBOLS: Record<string, string> = {
  BTC: "BYBIT:BTCUSDT.P", ETH: "BYBIT:ETHUSDT.P", SOL: "BYBIT:SOLUSDT.P",
  DOGE: "BYBIT:DOGEUSDT.P", ARB: "BYBIT:ARBUSDT.P", SUI: "BYBIT:SUIUSDT.P",
  AVAX: "BYBIT:AVAXUSDT.P", LINK: "BYBIT:LINKUSDT.P", WIF: "BYBIT:WIFUSDT.P",
  PEPE: "BYBIT:PEPEUSDT.P", HYPE: "BYBIT:HYPEUSDT.P",
};

const TV_INTERVALS = [
  { label: "1m",  value: "1" },
  { label: "5m",  value: "5" },
  { label: "15m", value: "15" },
  { label: "1H",  value: "60" },
  { label: "4H",  value: "240" },
  { label: "1D",  value: "D" },
  { label: "1W",  value: "W" },
];

const TradingViewWidget = memo(function TradingViewWidget({ symbol, interval }: { symbol: string; interval: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol, interval,
      timezone: "Etc/UTC", theme: "dark", style: "1", locale: "en",
      backgroundColor: "rgba(8, 8, 12, 1)",
      gridColor: "rgba(30, 30, 30, 0.4)",
      hide_top_toolbar: true, hide_legend: false, hide_volume: false,
      hide_side_toolbar: true, allow_symbol_change: false,
      save_image: false, withdateranges: false,
      details: false, calendar: false,
      studies: ["STD;EMA"],
      support_host: "https://www.tradingview.com",
    });
    containerRef.current.appendChild(script);

    return () => { if (containerRef.current) containerRef.current.innerHTML = ""; };
  }, [symbol, interval]);

  return <div ref={containerRef} className="tradingview-widget-container" style={{ height: "100%", width: "100%" }} />;
});

// ── Main Component ────────────────────────────────────────────

type ChartMode = "native" | "tradingview";

export default function ChartPane() {
  const [symbol, setSymbol] = useState("BTC");
  const [timeframe, setTimeframe] = useState(2); // index into TIMEFRAMES (1M default)
  const [mode, setMode] = useState<ChartMode>("native");
  const [source, setSource] = useState<DataSource>("coingecko");
  const [tvInterval, setTvInterval] = useState("60");
  const [bars, setBars] = useState<OHLCVBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrice, setLastPrice] = useState<{ price: number; change: number } | null>(null);

  const config = SYMBOLS[symbol];
  const tf = TIMEFRAMES[timeframe];

  // Fetch OHLCV data for native chart
  const loadData = useCallback(async () => {
    if (mode !== "native") return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOHLCV(symbol, tf.days, source);
      setBars(data);

      // Compute last price + 24h change from the data
      if (data.length >= 2) {
        const latest = data[data.length - 1];
        const prev = data.length > 24 ? data[data.length - 25] : data[0];
        const change = ((latest.close - prev.open) / prev.open) * 100;
        setLastPrice({ price: latest.close, change });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      // Fallback to CoinGecko if Aster fails
      if (source === "aster" && config?.coinId) {
        try {
          const fallback = await fetchCoinGeckoOHLCV(config.coinId, tf.days);
          setBars(fallback);
          setError(null);
        } catch { /* keep original error */ }
      }
    }
    setIsLoading(false);
  }, [symbol, timeframe, mode, source, config, tf.days]);

  useEffect(() => { loadData(); }, [loadData]);

  // Source indicators
  const availableSources: DataSource[] = ["coingecko"];
  if (config?.hlCoin) availableSources.push("hl");
  if (config?.asterSymbol) availableSources.push("aster");

  const sourceLabels: Record<DataSource, string> = {
    coingecko: "CG",
    hl: "HL",
    aster: "ASTER",
  };

  const sourceColors: Record<DataSource, string> = {
    coingecko: "#FBBF24",
    hl: "#00E5FF",
    aster: "#8B5CF6",
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#08080C" }}>
      {/* ── Controls bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {/* Left: symbol + price */}
        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="text-xs font-mono font-bold bg-transparent border rounded px-2 py-1 cursor-pointer focus:outline-none"
            style={{ borderColor: "rgba(255,255,255,0.08)", color: "#E4E4E7" }}
          >
            {Object.entries(SYMBOLS).map(([key, cfg]) => (
              <option key={key} value={key} style={{ background: "#0A0A0E" }}>{cfg.label}</option>
            ))}
          </select>

          {lastPrice && mode === "native" && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold" style={{ color: "#E4E4E7" }}>
                ${formatPrice(lastPrice.price)}
              </span>
              <span
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{
                  color: lastPrice.change >= 0 ? "#00FF88" : "#FF4444",
                  background: lastPrice.change >= 0 ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)",
                }}
              >
                {lastPrice.change >= 0 ? "+" : ""}{lastPrice.change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          {/* Chart mode toggle */}
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setMode("native")}
              className="text-[9px] font-mono px-2 py-1 transition-colors"
              style={{
                background: mode === "native" ? "rgba(0,255,136,0.1)" : "transparent",
                color: mode === "native" ? "#00FF88" : "#3F3F46",
              }}
            >
              OHLCV
            </button>
            <button
              onClick={() => setMode("tradingview")}
              className="text-[9px] font-mono px-2 py-1 transition-colors"
              style={{
                background: mode === "tradingview" ? "rgba(0,229,255,0.1)" : "transparent",
                color: mode === "tradingview" ? "#00E5FF" : "#3F3F46",
              }}
            >
              TV
            </button>
          </div>

          {/* Data source (native mode) */}
          {mode === "native" && availableSources.length > 1 && (
            <div className="flex gap-0.5">
              {availableSources.map(s => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors"
                  style={{
                    background: source === s ? `${sourceColors[s]}15` : "transparent",
                    color: source === s ? sourceColors[s] : "#3F3F46",
                    border: source === s ? `1px solid ${sourceColors[s]}30` : "1px solid transparent",
                  }}
                >
                  {sourceLabels[s]}
                </button>
              ))}
            </div>
          )}

          {/* Timeframes */}
          {mode === "native" ? (
            <div className="flex gap-0.5">
              {TIMEFRAMES.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setTimeframe(i)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
                  style={{
                    background: timeframe === i ? "#00FF88" : "transparent",
                    color: timeframe === i ? "#000" : "#3F3F46",
                    fontWeight: timeframe === i ? 700 : 400,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-0.5">
              {TV_INTERVALS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTvInterval(t.value)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
                  style={{
                    background: tvInterval === t.value ? "#00E5FF" : "transparent",
                    color: tvInterval === t.value ? "#000" : "#3F3F46",
                    fontWeight: tvInterval === t.value ? 700 : 400,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Chart area ── */}
      <div className="flex-1 min-h-0 relative">
        {mode === "native" ? (
          <>
            <NativeChart bars={bars} isLoading={isLoading} />
            {error && (
              <div className="absolute bottom-2 left-2 right-2 px-3 py-2 rounded-lg text-[10px] font-mono" style={{
                background: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.15)",
                color: "#FF4444",
              }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <TradingViewWidget
            symbol={TV_SYMBOLS[symbol] || `BYBIT:${symbol}USDT.P`}
            interval={tvInterval}
          />
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-3 py-1 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full" style={{ background: source === "aster" ? "#8B5CF6" : source === "hl" ? "#00E5FF" : "#FBBF24" }} />
          <span className="text-[9px] font-mono" style={{ color: "#27272A" }}>
            {mode === "native"
              ? `${source === "aster" ? "Aster DEX" : source === "hl" ? "Hyperliquid" : "CoinGecko"} · ${bars.length} candles`
              : "TradingView · Live"}
          </span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: "#27272A" }}>
          {mode === "native" ? tf.label : tvInterval}
        </span>
      </div>
    </div>
  );
}
