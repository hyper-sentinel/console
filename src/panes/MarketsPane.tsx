"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ── Types ──
interface AssetPrice {
  coin: string;
  price: number;
  change24h: number | null;
  volume24h: number | null;
  openInterest: number | null;
  fundingRate: number | null;
  prevPrice: number | null;
}

type SortKey = "coin" | "price" | "change24h" | "volume24h" | "openInterest";

// ── Top perps to display ──
const TOP_COINS = [
  "BTC", "ETH", "SOL", "DOGE", "SUI", "AVAX", "LINK", "ARB",
  "WIF", "PEPE", "HYPE", "ONDO", "TIA", "SEI", "INJ", "JUP",
  "WLD", "NEAR", "FTM", "APT", "OP", "MATIC", "AAVE", "MKR",
  "RENDER", "FET", "TAO", "PENDLE", "STX", "BONK",
];

// ── Hyperliquid REST: fetch all mid prices ──
async function fetchHLMids(): Promise<Record<string, string>> {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "allMids" }),
  });
  if (!res.ok) throw new Error(`HL API error: ${res.status}`);
  return res.json();
}

// ── Hyperliquid REST: fetch asset contexts (OI, funding, volume) ──
async function fetchHLMeta(): Promise<{ universe: { name: string }[]; contexts: { dayNtlVlm: string; openInterest: string; funding: string; prevDayPx: string }[] }> {
  const [metaRes, ctxRes] = await Promise.all([
    fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
    }),
    fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    }),
  ]);

  if (!ctxRes.ok) throw new Error("HL meta error");
  const ctxData = await ctxRes.json();
  return {
    universe: ctxData[0]?.universe || [],
    contexts: ctxData[1] || [],
  };
}

export default function MarketsPane() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volume24h");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [assets, setAssets] = useState<AssetPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const prevPrices = useRef<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // ── Initial load: REST fetch ──
  const loadData = useCallback(async () => {
    try {
      const [mids, meta] = await Promise.all([fetchHLMids(), fetchHLMeta()]);

      const assetMap = new Map<string, AssetPrice>();

      // Build from meta contexts (has volume, OI, funding)
      meta.universe.forEach((asset, i) => {
        const ctx = meta.contexts[i];
        const name = asset.name;
        const midPrice = parseFloat(mids[name] || "0");
        const prevDay = parseFloat(ctx?.prevDayPx || "0");
        const change = prevDay > 0 ? ((midPrice - prevDay) / prevDay) * 100 : null;

        assetMap.set(name, {
          coin: name,
          price: midPrice,
          change24h: change,
          volume24h: parseFloat(ctx?.dayNtlVlm || "0"),
          openInterest: parseFloat(ctx?.openInterest || "0"),
          fundingRate: parseFloat(ctx?.funding || "0"),
          prevPrice: prevPrices.current[name] || null,
        });

        prevPrices.current[name] = midPrice;
      });

      setAssets(Array.from(assetMap.values()));
      setLoading(false);
    } catch (err) {
      console.error("Failed to load HL market data:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── WebSocket for live mid price updates ──
  useEffect(() => {
    const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "allMids" },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.channel === "allMids" && msg?.data?.mids) {
          const mids = msg.data.mids as Record<string, string>;
          setAssets((prev) =>
            prev.map((asset) => {
              const newPrice = parseFloat(mids[asset.coin] || "0");
              if (newPrice <= 0) return asset;
              const prevDay = asset.change24h !== null && asset.price > 0
                ? asset.price / (1 + asset.change24h / 100)
                : 0;
              const newChange = prevDay > 0 ? ((newPrice - prevDay) / prevDay) * 100 : asset.change24h;
              return {
                ...asset,
                prevPrice: asset.price,
                price: newPrice,
                change24h: newChange,
              };
            })
          );
        }
      } catch { /* skip malformed */ }
    };

    ws.onerror = () => ws.close();
    ws.onclose = () => {
      // Reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) {
          const newWs = new WebSocket("wss://api.hyperliquid.xyz/ws");
          wsRef.current = newWs;
        }
      }, 3000);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // ── Filter & sort ──
  const filtered = useMemo(() => {
    let list = assets;

    // Filter to top coins + search
    if (query.length > 0) {
      const q = query.toUpperCase();
      list = list.filter((a) => a.coin.includes(q));
    } else {
      // Show top coins first, then others with volume
      const topSet = new Set(TOP_COINS);
      list = list
        .filter((a) => topSet.has(a.coin) || (a.volume24h && a.volume24h > 1000000))
        .sort((a, b) => {
          const aTop = topSet.has(a.coin) ? 0 : 1;
          const bTop = topSet.has(b.coin) ? 0 : 1;
          if (aTop !== bTop) return aTop - bTop;
          return 0; // will be sorted by sortKey below
        });
    }

    return [...list].sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
  }, [assets, query, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const formatUsd = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.001) return price.toFixed(6);
    return price.toFixed(8);
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-0.5 text-[8px]" style={{ color: sortKey === col ? "var(--accent-green)" : "var(--text-dim)" }}>
      {sortKey === col ? (sortDir === "desc" ? "▼" : "▲") : "⇅"}
    </span>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontSize: "11px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search perps..."
          className="flex-1 px-2 py-1 rounded text-xs font-mono"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <span
          className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: "rgba(0, 229, 255, 0.08)",
            color: "var(--accent-cyan)",
            border: "1px solid rgba(0, 229, 255, 0.15)",
          }}
        >
          HL LIVE
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-cyan)", borderTopColor: "transparent" }} />
              <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>
                Connecting to Hyperliquid...
              </span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>No matching perps</span>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0" style={{ background: "var(--bg-secondary)" }}>
              <tr className="text-[9px] uppercase" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-1.5 px-2 font-semibold cursor-pointer select-none" onClick={() => handleSort("coin")}>
                  Perp<SortIcon col="coin" />
                </th>
                <th className="text-right py-1.5 px-2 font-semibold cursor-pointer select-none" onClick={() => handleSort("price")}>
                  Price<SortIcon col="price" />
                </th>
                <th className="text-right py-1.5 px-2 font-semibold cursor-pointer select-none" onClick={() => handleSort("change24h")}>
                  24h<SortIcon col="change24h" />
                </th>
                <th className="text-right py-1.5 px-2 font-semibold cursor-pointer select-none" onClick={() => handleSort("volume24h")}>
                  Volume<SortIcon col="volume24h" />
                </th>
                <th className="text-right py-1.5 px-2 font-semibold cursor-pointer select-none" onClick={() => handleSort("openInterest")}>
                  OI<SortIcon col="openInterest" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => {
                const change = asset.change24h ?? 0;
                const isUp = change >= 0;
                // Flash green/red when price updates
                const flashing = asset.prevPrice !== null && asset.prevPrice !== asset.price;
                const flashColor = flashing
                  ? asset.price > (asset.prevPrice ?? 0)
                    ? "rgba(0, 255, 136, 0.06)"
                    : "rgba(255, 68, 68, 0.06)"
                  : "transparent";

                return (
                  <tr
                    key={asset.coin}
                    className="transition-colors duration-300"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: flashColor,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                          {asset.coin}
                        </span>
                        <span className="text-[8px] font-mono" style={{ color: "var(--text-dim)" }}>
                          PERP
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                      ${formatPrice(asset.price)}
                    </td>
                    <td
                      className="py-1.5 px-2 text-right font-mono font-bold"
                      style={{ color: isUp ? "var(--accent-green)" : "var(--accent-red)" }}
                    >
                      {isUp ? "+" : ""}{change.toFixed(2)}%
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {asset.volume24h ? formatUsd(asset.volume24h) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: "var(--text-dim)" }}>
                      {asset.openInterest ? formatUsd(asset.openInterest) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer: asset count */}
      <div className="px-2 py-1 border-t text-[9px] font-mono flex items-center justify-between" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
        <span>{filtered.length} perps</span>
        <span>Hyperliquid L1</span>
      </div>
    </div>
  );
}
