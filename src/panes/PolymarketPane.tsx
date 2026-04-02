"use client";
import { useState, useMemo, useEffect } from "react";

interface Market {
  id: string;
  question: string;
  outcomes: string[];
  outcomePrices?: string[];
  volume24hr?: number;
  liquidity?: number;
  endDate?: string;
  active?: boolean;
  category?: string;
}

const GAMMA_API = "https://gamma-api.polymarket.com";

async function fetchTrendingMarkets(): Promise<Market[]> {
  try {
    const res = await fetch(`${GAMMA_API}/markets?closed=false&limit=50&order=volume24hr&ascending=false`);
    if (!res.ok) throw new Error(`Polymarket API: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function searchMarkets(query: string): Promise<Market[]> {
  try {
    const res = await fetch(`${GAMMA_API}/markets?closed=false&limit=20&slug_contains=${encodeURIComponent(query.toLowerCase())}`);
    if (!res.ok) {
      // Fallback: try tag search
      const res2 = await fetch(`${GAMMA_API}/markets?closed=false&limit=20&tag=${encodeURIComponent(query)}`);
      if (!res2.ok) return [];
      return await res2.json();
    }
    return await res.json();
  } catch {
    return [];
  }
}

function formatVolume(v?: number): string {
  if (!v) return "—";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function parseOutcomePrice(prices?: string[]): { yes: number; no: number } {
  if (!prices || prices.length < 2) return { yes: 0.5, no: 0.5 };
  try {
    const parsed = prices.map((p) => {
      const val = parseFloat(p.replace(/"/g, ""));
      return isNaN(val) ? 0.5 : val;
    });
    return { yes: parsed[0], no: parsed[1] };
  } catch {
    return { yes: 0.5, no: 0.5 };
  }
}

export default function PolymarketPane() {
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load trending on mount
  useEffect(() => {
    setLoading(true);
    fetchTrendingMarkets().then((data) => {
      setMarkets(data);
      setLoading(false);
    });
  }, []);

  // Search
  useEffect(() => {
    if (query.length < 2) return;
    setLoading(true);
    const timeout = setTimeout(() => {
      searchMarkets(query).then((data) => {
        setMarkets(data);
        setLoading(false);
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  // Reload trending when query clears
  useEffect(() => {
    if (query.length === 0) {
      setLoading(true);
      fetchTrendingMarkets().then((data) => {
        setMarkets(data);
        setLoading(false);
      });
    }
  }, [query]);

  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => m.question && m.active !== false);
  }, [markets]);

  return (
    <div className="flex flex-col h-full">
      {/* Search + Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prediction markets..."
          className="flex-1 px-2 py-1 rounded text-xs font-mono"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: "rgba(251,191,36,0.08)",
            color: "#FBBF24",
            border: "1px solid rgba(251,191,36,0.2)",
          }}
        >
          POLYMARKET
        </span>
      </div>

      {/* Markets List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#FBBF24", borderTopColor: "transparent" }} />
              <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>
                Loading markets...
              </span>
            </div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {query ? `No markets matching "${query}"` : "No active markets"}
            </span>
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const { yes, no } = parseOutcomePrice(market.outcomePrices);
            const yesPercent = Math.round(yes * 100);
            const noPercent = Math.round(no * 100);
            const isExpanded = expanded === market.id;

            return (
              <div key={market.id} style={{ borderBottom: "1px solid var(--border)" }}>
                {/* Market row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : market.id)}
                  className="w-full text-left px-3 py-2.5 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium leading-tight" style={{ color: "var(--text-primary)" }}>
                        {market.question}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>
                          Vol: {formatVolume(market.volume24hr)}
                        </span>
                        <span className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>
                          Liq: {formatVolume(market.liquidity)}
                        </span>
                        {market.endDate && (
                          <span className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>
                            Ends: {new Date(market.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Yes/No bars */}
                    <div className="shrink-0 text-right" style={{ minWidth: "100px" }}>
                      <div className="flex gap-1 items-center">
                        <div className="flex-1 h-5 rounded overflow-hidden flex" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <div
                            className="h-full flex items-center justify-center text-[9px] font-bold"
                            style={{
                              width: `${yesPercent}%`,
                              background: "rgba(0,255,136,0.2)",
                              color: "var(--accent-green)",
                              minWidth: yesPercent > 10 ? undefined : "20px",
                            }}
                          >
                            {yesPercent}¢
                          </div>
                          <div
                            className="h-full flex items-center justify-center text-[9px] font-bold"
                            style={{
                              width: `${noPercent}%`,
                              background: "rgba(255,68,68,0.15)",
                              color: "var(--accent-red)",
                              minWidth: noPercent > 10 ? undefined : "20px",
                            }}
                          >
                            {noPercent}¢
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-[8px] mt-0.5 font-mono" style={{ color: "var(--text-dim)" }}>
                        <span>Yes</span>
                        <span>No</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)" }}>
                        <span className="text-[9px] block font-semibold" style={{ color: "var(--text-dim)" }}>YES</span>
                        <span className="text-lg font-black font-mono block" style={{ color: "var(--accent-green)" }}>{yesPercent}¢</span>
                        <span className="text-[8px] font-mono" style={{ color: "var(--text-dim)" }}>{yesPercent}% probability</span>
                      </div>
                      <div className="flex-1 rounded-lg p-2 text-center" style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)" }}>
                        <span className="text-[9px] block font-semibold" style={{ color: "var(--text-dim)" }}>NO</span>
                        <span className="text-lg font-black font-mono block" style={{ color: "var(--accent-red)" }}>{noPercent}¢</span>
                        <span className="text-[8px] font-mono" style={{ color: "var(--text-dim)" }}>{noPercent}% probability</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="flex-1 text-[10px] py-1.5 rounded font-bold" style={{ background: "var(--accent-green)", color: "#000" }}>
                        Buy Yes
                      </button>
                      <button className="flex-1 text-[10px] py-1.5 rounded font-bold" style={{ background: "var(--accent-red)", color: "#fff" }}>
                        Buy No
                      </button>
                    </div>
                    <p className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>
                      Market ID: {market.id.slice(0, 12)}...
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t text-[9px] font-mono flex justify-between" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
        <span>{filteredMarkets.length} markets</span>
        <span>Polymarket CLOB</span>
      </div>
    </div>
  );
}
