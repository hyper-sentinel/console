"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAsterFundingRate, useAsterSetLeverage } from "@/lib/hooks";

type Exchange = "hl" | "aster" | "poly";

const EXCHANGES: { id: Exchange; name: string; color: string; symbols: string[] }[] = [
  { id: "hl", name: "Hyperliquid", color: "var(--accent-cyan)", symbols: ["BTC", "ETH", "SOL", "DOGE", "ARB", "SUI", "AVAX", "LINK", "WIF", "PEPE"] },
  { id: "aster", name: "Aster DEX", color: "#8b5cf6", symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "ARBUSDT", "SUIUSDT"] },
  { id: "poly", name: "Polymarket", color: "#fbbf24", symbols: [] },
];

const ORDER_TYPES = ["Market", "Limit", "Stop"];

export default function OrderEntryPane() {
  const [exchange, setExchange] = useState<Exchange>("hl");
  const [symbol, setSymbol] = useState("BTC");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState("Market");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [leverage, setLeverage] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Polymarket fields
  const [polyMarketId, setPolyMarketId] = useState("");
  const [polyOutcome, setPolyOutcome] = useState("Yes");

  // Aster funding rate + leverage
  const asterSymbol = exchange === "aster" ? symbol : "";
  const { data: fundingRaw } = useAsterFundingRate(asterSymbol);
  const setLeverageMutation = useAsterSetLeverage();
  const fundingRate = fundingRaw && typeof fundingRaw === "object" ? (fundingRaw as Record<string, unknown>).rate || (fundingRaw as Record<string, unknown>).funding_rate : null;

  const handleLeverageChange = (newLev: number) => {
    setLeverage(newLev);
    if (exchange === "aster") {
      setLeverageMutation.mutate({ symbol, leverage: newLev });
    }
  };

  const currentExchange = EXCHANGES.find((e) => e.id === exchange)!;

  const handleSubmit = async () => {
    if (exchange === "poly") {
      if (!polyMarketId.trim() || !size) return;
    } else {
      if (!size || parseFloat(size) <= 0) return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      if (exchange === "hl") {
        await api.placeHLOrder(symbol, side, parseFloat(size), orderType !== "Market" ? parseFloat(price) : undefined, orderType.toLowerCase());
      } else if (exchange === "aster") {
        await api.asterPlaceOrder(symbol, side.toUpperCase(), parseFloat(size), orderType !== "Market" ? parseFloat(price) : undefined, orderType.toUpperCase());
      } else {
        // Polymarket
        if (orderType === "Limit") {
          await api.placePolymarketLimit(polyMarketId, polyOutcome, parseFloat(price), parseFloat(size));
        } else if (side === "buy") {
          await api.buyPolymarket(polyMarketId, polyOutcome, parseFloat(size));
        } else {
          await api.sellPolymarket(polyMarketId, polyOutcome, parseFloat(size));
        }
      }
      setResult(`✓ ${side.toUpperCase()} ${exchange === "poly" ? polyOutcome : size + " " + symbol} submitted`);
      setSize("");
      setPrice("");
    } catch (e) {
      setResult(`✗ ${e instanceof Error ? e.message : "Order failed"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2.5 overflow-auto" style={{ fontSize: "11px" }}>
      {/* Exchange selector */}
      <div className="flex gap-1">
        {EXCHANGES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => { setExchange(ex.id); if (ex.symbols.length) setSymbol(ex.symbols[0]); }}
            className="flex-1 text-[11px] py-1.5 rounded font-semibold"
            style={{
              background: exchange === ex.id ? `${ex.color}15` : "var(--bg-primary)",
              color: exchange === ex.id ? ex.color : "var(--text-dim)",
              border: `1px solid ${exchange === ex.id ? `${ex.color}50` : "var(--border)"}`,
            }}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* Symbol (HL / Aster) */}
      {exchange !== "poly" && (
        <div>
          <label className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Symbol</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full mt-0.5 px-2 py-1.5 rounded text-xs font-mono"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {currentExchange.symbols.map((s) => (
              <option key={s} value={s} style={{ background: "#0a0a0a" }}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Polymarket Market ID */}
      {exchange === "poly" && (
        <>
          <div>
            <label className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Market ID</label>
            <input
              value={polyMarketId}
              onChange={(e) => setPolyMarketId(e.target.value)}
              placeholder="Paste market condition ID..."
              className="w-full mt-0.5 px-2 py-1.5 rounded text-xs font-mono"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Outcome</label>
            <div className="flex gap-1 mt-0.5">
              {["Yes", "No"].map((o) => (
                <button
                  key={o}
                  onClick={() => setPolyOutcome(o)}
                  className="flex-1 py-1.5 rounded font-bold text-xs"
                  style={{
                    background: polyOutcome === o ? (o === "Yes" ? "var(--accent-green)" : "var(--accent-red)") : "var(--bg-primary)",
                    color: polyOutcome === o ? (o === "Yes" ? "#000" : "#fff") : "var(--text-dim)",
                    border: `1px solid ${polyOutcome === o ? (o === "Yes" ? "var(--accent-green)" : "var(--accent-red)") : "var(--border)"}`,
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Side toggle (HL / Aster only) */}
      {exchange !== "poly" && (
        <div className="flex gap-1">
          <button
            onClick={() => setSide("buy")}
            className="flex-1 py-2 rounded font-bold text-xs"
            style={{
              background: side === "buy" ? "var(--accent-green)" : "var(--bg-primary)",
              color: side === "buy" ? "#000" : "var(--text-dim)",
              border: `1px solid ${side === "buy" ? "var(--accent-green)" : "var(--border)"}`,
            }}
          >
            Long / Buy
          </button>
          <button
            onClick={() => setSide("sell")}
            className="flex-1 py-2 rounded font-bold text-xs"
            style={{
              background: side === "sell" ? "var(--accent-red)" : "var(--bg-primary)",
              color: side === "sell" ? "#fff" : "var(--text-dim)",
              border: `1px solid ${side === "sell" ? "var(--accent-red)" : "var(--border)"}`,
            }}
          >
            Short / Sell
          </button>
        </div>
      )}

      {/* Buy/Sell for Polymarket */}
      {exchange === "poly" && (
        <div className="flex gap-1">
          <button
            onClick={() => setSide("buy")}
            className="flex-1 py-2 rounded font-bold text-xs"
            style={{
              background: side === "buy" ? "var(--accent-green)" : "var(--bg-primary)",
              color: side === "buy" ? "#000" : "var(--text-dim)",
              border: `1px solid ${side === "buy" ? "var(--accent-green)" : "var(--border)"}`,
            }}
          >
            Buy Shares
          </button>
          <button
            onClick={() => setSide("sell")}
            className="flex-1 py-2 rounded font-bold text-xs"
            style={{
              background: side === "sell" ? "var(--accent-red)" : "var(--bg-primary)",
              color: side === "sell" ? "#fff" : "var(--text-dim)",
              border: `1px solid ${side === "sell" ? "var(--accent-red)" : "var(--border)"}`,
            }}
          >
            Sell Shares
          </button>
        </div>
      )}

      {/* Order type tabs */}
      <div className="flex gap-0.5 p-0.5 rounded" style={{ background: "var(--bg-primary)" }}>
        {(exchange === "poly" ? ["Market", "Limit"] : ORDER_TYPES).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className="flex-1 text-[11px] py-1.5 rounded"
            style={{
              background: orderType === t ? "var(--bg-hover)" : "transparent",
              color: orderType === t ? "var(--text-primary)" : "var(--text-dim)",
              fontWeight: orderType === t ? 600 : 400,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Price */}
      {orderType !== "Market" && (
        <div>
          <label className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>
            {exchange === "poly" ? "Price (0-1)" : "Price"}
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={exchange === "poly" ? "0.55" : "0.00"}
            type="number"
            step={exchange === "poly" ? "0.01" : undefined}
            className="w-full mt-0.5 px-2 py-1.5 rounded text-xs font-mono"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>
      )}

      {/* Size */}
      <div>
        <label className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>
          {exchange === "poly" ? "Amount (USDC)" : "Size (USD)"}
        </label>
        <div className="flex gap-1 mt-0.5">
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="0.00"
            type="number"
            className="flex-1 px-2 py-1.5 rounded text-xs font-mono"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <div className="flex gap-0.5">
            {["25%", "50%", "100%"].map((pct) => (
              <button
                key={pct}
                onClick={() => setSize(String(parseFloat(pct) * 100))}
                className="text-[10px] px-2 rounded"
                style={{ background: "var(--bg-primary)", color: "var(--text-dim)", border: "1px solid var(--border)" }}
              >
                {pct}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leverage slider (HL/Aster only) */}
      {exchange !== "poly" && (
        <div>
          <div className="flex justify-between">
            <label className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Leverage</label>
            <span className="text-[11px] font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>{leverage}x</span>
          </div>
          <input
            type="range" min="1" max="50" value={leverage}
            onChange={(e) => handleLeverageChange(parseInt(e.target.value))}
            className="w-full mt-1" style={{ accentColor: "var(--accent-green)" }}
          />
          <div className="flex justify-between text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>
            <span>1x</span><span>10x</span><span>25x</span><span>50x</span>
          </div>
        </div>
      )}

      {/* Fees info */}
      <div className="flex justify-between text-[10px] px-1" style={{ color: "var(--text-dim)" }}>
        <span>Est. Fee</span>
        <span className="font-mono">{size ? `$${(parseFloat(size) * 0.0001).toFixed(4)}` : "—"}</span>
      </div>
      {exchange === "aster" && fundingRate !== null && (
        <div className="flex justify-between text-[10px] px-1" style={{ color: "var(--text-dim)" }}>
          <span>Funding Rate</span>
          <span className="font-mono" style={{ color: Number(fundingRate) >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
            {Number(fundingRate) >= 0 ? "+" : ""}{(Number(fundingRate) * 100).toFixed(4)}%
          </span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !size}
        className="w-full py-2.5 rounded font-bold text-sm transition-opacity"
        style={{
          background: side === "buy" ? "var(--accent-green)" : "var(--accent-red)",
          color: side === "buy" ? "#000" : "#fff",
          opacity: submitting || !size ? 0.5 : 1,
        }}
      >
        {submitting ? "Submitting..." : exchange === "poly"
          ? `${side === "buy" ? "Buy" : "Sell"} ${polyOutcome} Shares`
          : `${side === "buy" ? "Long" : "Short"} ${symbol}`
        }
      </button>

      {/* Result */}
      {result && (
        <div
          className="text-[10px] text-center py-1 rounded"
          style={{
            background: result.startsWith("✓") ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)",
            color: result.startsWith("✓") ? "var(--accent-green)" : "var(--accent-red)",
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}
