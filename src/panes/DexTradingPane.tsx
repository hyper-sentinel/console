"use client";
import { useState } from "react";
import { usePolymarketMarkets, usePolymarketSearch, usePolymarketPositions } from "@/lib/hooks";
import { api } from "@/lib/api";

interface Market { id?: string; question?: string; title?: string; slug?: string; volume?: number; liquidity?: number; end_date?: string; yes_price?: number; no_price?: number; outcome_prices?: number[]; [key: string]: unknown; }
interface Position { market_id?: string; title?: string; question?: string; outcome?: string; side?: string; shares?: number; avg_price?: number; current_price?: number; pnl?: number; [key: string]: unknown; }

const TABS = [
  { id: "markets", label: "Markets" },
  { id: "positions", label: "My Positions" },
  { id: "dex", label: "DEX Swap" },
];

export default function DexTradingPane() {
  const [tab, setTab] = useState("markets");
  const [search, setSearch] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // DEX swap state
  const [contractAddress, setContractAddress] = useState("");

  const { data: marketsRaw, isLoading: marketsLoading } = usePolymarketMarkets();
  const { data: searchRaw } = usePolymarketSearch(search);
  const { data: positionsRaw, refetch: refetchPositions } = usePolymarketPositions();

  const toArray = (raw: unknown): unknown[] => {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      return (obj.markets || obj.data || obj.results || obj.positions || []) as unknown[];
    }
    return [];
  };

  const markets = toArray(search.length > 1 ? searchRaw : marketsRaw) as Market[];
  const positions = toArray(positionsRaw) as Position[];

  const handleBuy = async () => {
    if (!selectedMarket || !amount) return;
    setLoading(true);
    try {
      if (side === "yes") {
        await api.buyPolymarket(selectedMarket.id || selectedMarket.slug || "", "yes", parseFloat(amount));
      } else {
        await api.sellPolymarket(selectedMarket.id || selectedMarket.slug || "", "no", parseFloat(amount));
      }
      setResult(`OK: ${side.toUpperCase()} position opened — $${amount}`);
      setAmount("");
      refetchPositions();
    } catch (e) {
      setResult(`ERR: ${e instanceof Error ? e.message : "Order failed"}`);
    }
    setLoading(false);
  };

  const detectChain = (addr: string) => {
    if (addr.startsWith("0x")) return "ETH";
    if (addr.length >= 32 && !addr.startsWith("0x")) return "SOL";
    return "Unknown";
  };

  return (
    <div className="flex flex-col h-full" style={{ fontSize: "11px" }}>
      {/* Tabs */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="text-[10px] px-2.5 py-1 rounded whitespace-nowrap"
            style={{
              background: tab === t.id ? "rgba(0,255,136,0.1)" : "transparent",
              color: tab === t.id ? "var(--accent-green)" : "var(--text-dim)",
              border: tab === t.id ? "1px solid rgba(0,255,136,0.3)" : "1px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        {/* MARKETS TAB */}
        {tab === "markets" && (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prediction markets..."
              className="w-full text-[10px] px-2 py-1.5 rounded font-mono mb-1"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            {marketsLoading ? (
              <p className="text-xs font-mono animate-pulse text-center py-8" style={{ color: "var(--text-dim)" }}>Loading markets...</p>
            ) : markets.length === 0 ? (
              <p className="text-center text-[10px] py-8" style={{ color: "var(--text-dim)" }}>No markets found</p>
            ) : (
              markets.slice(0, 15).map((m, i) => {
                const yesPrice = m.yes_price ?? (m.outcome_prices ? m.outcome_prices[0] : undefined);
                const noPrice = m.no_price ?? (m.outcome_prices ? m.outcome_prices[1] : undefined);
                return (
                  <div
                    key={m.id || i}
                    className="p-2.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: selectedMarket?.id === m.id ? "rgba(0,255,136,0.05)" : "var(--bg-primary)",
                      border: selectedMarket?.id === m.id ? "1px solid rgba(0,255,136,0.3)" : "1px solid transparent",
                    }}
                    onClick={() => setSelectedMarket(m)}
                  >
                    <p className="text-xs font-medium leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
                      {m.question || m.title || "—"}
                    </p>
                    <div className="flex items-center gap-3">
                      {yesPrice !== undefined && (
                        <span className="text-[10px] font-mono" style={{ color: "var(--accent-green)" }}>
                          YES {(yesPrice * 100).toFixed(0)}¢
                        </span>
                      )}
                      {noPrice !== undefined && (
                        <span className="text-[10px] font-mono" style={{ color: "var(--accent-red)" }}>
                          NO {(noPrice * 100).toFixed(0)}¢
                        </span>
                      )}
                      {m.volume !== undefined && (
                        <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>
                          Vol: ${(m.volume / 1000).toFixed(0)}K
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Order Panel */}
            {selectedMarket && (
              <div className="mt-2 p-2.5 rounded-lg" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                <p className="text-[9px] font-semibold uppercase mb-1" style={{ color: "var(--text-dim)" }}>Place Order</p>
                <p className="text-[10px] mb-2" style={{ color: "var(--text-secondary)" }}>{selectedMarket.question || selectedMarket.title}</p>
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setSide("yes")}
                    className="flex-1 py-1.5 rounded font-bold text-[10px]"
                    style={{
                      background: side === "yes" ? "var(--accent-green)" : "var(--bg-primary)",
                      color: side === "yes" ? "#000" : "var(--text-dim)",
                      border: `1px solid ${side === "yes" ? "var(--accent-green)" : "var(--border)"}`,
                    }}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setSide("no")}
                    className="flex-1 py-1.5 rounded font-bold text-[10px]"
                    style={{
                      background: side === "no" ? "var(--accent-red)" : "var(--bg-primary)",
                      color: side === "no" ? "#fff" : "var(--text-dim)",
                      border: `1px solid ${side === "no" ? "var(--accent-red)" : "var(--border)"}`,
                    }}
                  >
                    No
                  </button>
                </div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (USD)"
                  type="number"
                  className="w-full text-[10px] px-2 py-1.5 rounded font-mono mb-2"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button
                  onClick={handleBuy}
                  disabled={!amount || loading}
                  className="w-full py-2 rounded font-bold text-[10px]"
                  style={{
                    background: side === "yes" ? "var(--accent-green)" : "var(--accent-red)",
                    color: side === "yes" ? "#000" : "#fff",
                    opacity: !amount || loading ? 0.5 : 1,
                  }}
                >
                  {loading ? "Placing..." : `Buy ${side.toUpperCase()}`}
                </button>
                {result && (
                  <p className="text-[10px] text-center mt-1" style={{ color: result.startsWith("OK:") ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {result}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* POSITIONS TAB */}
        {tab === "positions" && (
          positions.length === 0 ? (
            <p className="text-center text-[10px] py-8" style={{ color: "var(--text-dim)" }}>No Polymarket positions</p>
          ) : (
            positions.map((p, i) => (
              <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{p.title || p.question || "—"}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold" style={{ color: (p.outcome || p.side) === "yes" ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {(p.outcome || p.side || "").toUpperCase()}
                  </span>
                  {p.shares !== undefined && (
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{p.shares} shares</span>
                  )}
                  {p.avg_price !== undefined && (
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>Avg: {(p.avg_price * 100).toFixed(0)}¢</span>
                  )}
                  {p.pnl !== undefined && (
                    <span className="text-[10px] font-mono font-bold" style={{ color: p.pnl >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )
        )}

        {/* DEX SWAP TAB */}
        {tab === "dex" && (
          <div className="space-y-2">
            <label className="text-[9px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Contract Address</label>
            <div className="flex gap-1">
              <input
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="Paste CA... (0x... or Solana address)"
                className="flex-1 text-[10px] px-2 py-1.5 rounded font-mono"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button className="text-[10px] px-3 rounded font-semibold" style={{ background: "var(--accent-cyan)", color: "#000" }}>
                Search
              </button>
            </div>
            {contractAddress && (
              <div className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>Chain: {detectChain(contractAddress)}</div>
            )}
            {!contractAddress && (
              <div className="flex-1 flex items-center justify-center text-center py-8">
                <div>
                  <div className="text-2xl mb-2" style={{ color: "var(--text-dim)", opacity: 0.4 }}>—</div>
                  <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>Paste a contract address to start trading</p>
                  <p className="text-[9px] mt-1" style={{ color: "var(--text-dim)" }}>Supports Ethereum (0x...) and Solana addresses</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
