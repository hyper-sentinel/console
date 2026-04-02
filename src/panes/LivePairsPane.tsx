"use client";
import { useState } from "react";
import { useDexTrending, useDexSearch } from "@/lib/hooks";

interface DexPair {
  baseToken?: { symbol?: string; name?: string; address?: string };
  chainId?: string;
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
  url?: string;
  // Fallback flat fields
  symbol?: string;
  name?: string;
  chain?: string;
  price?: string | number;
  change?: number;
}

function formatAge(createdAt?: number): string {
  if (!createdAt) return "—";
  const diff = Date.now() - createdAt;
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return `${Math.floor(hours * 60)}m`;
  if (hours < 24) return `${Math.floor(hours)}h`;
  if (hours < 24 * 30) return `${Math.floor(hours / 24)}d`;
  if (hours < 24 * 365) return `${Math.floor(hours / (24 * 30))}mo`;
  return `${(hours / (24 * 365)).toFixed(1)}y`;
}

function formatLiq(usd?: number): string {
  if (!usd) return "—";
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

export default function LivePairsPane() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"trending" | "new">("trending");
  const { data: trendingRaw, isLoading: trendingLoading } = useDexTrending();
  const { data: searchRaw, isLoading: searchLoading } = useDexSearch(search);

  // Normalize pairs
  const isSearching = search.length > 1;
  const rawData = isSearching ? searchRaw : trendingRaw;
  const isLoading = isSearching ? searchLoading : trendingLoading;

  const pairs: { symbol: string; name: string; chain: string; price: string; change: string; changePos: boolean; liquidity: string; age: string }[] = [];

  if (Array.isArray(rawData)) {
    rawData.forEach((p: DexPair) => {
      const sym = p.baseToken?.symbol || p.symbol || "—";
      const name = p.baseToken?.name || p.name || sym;
      const chain = p.chainId || p.chain || "—";
      const price = p.priceUsd || p.price?.toString() || "—";
      const change = p.priceChange?.h24 ?? p.change ?? 0;
      const liq = p.liquidity?.usd;
      pairs.push({
        symbol: sym,
        name,
        chain: chain.toUpperCase().replace("SOLANA", "SOL").replace("ETHEREUM", "ETH"),
        price: price.startsWith("$") ? price : `$${price}`,
        change: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
        changePos: change >= 0,
        liquidity: formatLiq(liq),
        age: formatAge(p.pairCreatedAt),
      });
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search token..."
          className="input-field !text-[11px] !py-1.5"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {(["trending", "new"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(""); }}
            className="flex-1 text-[10px] py-1.5 font-medium capitalize"
            style={{
              color: tab === t ? "var(--accent-green)" : "var(--text-dim)",
              borderBottom: tab === t ? "1px solid var(--accent-green)" : "1px solid transparent",
            }}
          >
            {t === "trending" ? "Trending" : "New Pairs"}
          </button>
        ))}
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs font-mono animate-pulse" style={{ color: "var(--text-dim)" }}>Loading pairs...</p>
          </div>
        ) : pairs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {isSearching ? `No results for "${search}"` : "No pairs found"}
            </p>
          </div>
        ) : (
          pairs.map((t, i) => (
            <div
              key={`${t.symbol}-${i}`}
              className="flex items-center justify-between px-2.5 py-2 border-b cursor-pointer transition-colors"
              style={{ borderColor: "var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{t.symbol}</span>
                  <span className="text-[9px] px-1 py-0 rounded" style={{ background: "var(--bg-panel)", color: "var(--text-dim)" }}>
                    {t.chain}
                  </span>
                </div>
                <p className="text-[9px] truncate" style={{ color: "var(--text-dim)" }}>{t.name}</p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-[11px] font-mono">{t.price}</p>
                <p className="text-[10px] font-mono font-bold" style={{ color: t.changePos ? "var(--accent-green)" : "var(--accent-red)" }}>
                  {t.change}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
