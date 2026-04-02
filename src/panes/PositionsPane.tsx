"use client";
import { useState } from "react";
import { useHLPositions, useAsterPositions, usePolymarketPositions, useCloseHLPosition } from "@/lib/hooks";

type Venue = "hl" | "aster" | "poly";

const VENUES = [
  { id: "hl" as Venue, label: "Hyperliquid", color: "var(--accent-cyan)" },
  { id: "aster" as Venue, label: "Aster", color: "#8b5cf6" },
  { id: "poly" as Venue, label: "Polymarket", color: "#fbbf24" },
];

export default function PositionsPane() {
  const [venue, setVenue] = useState<Venue>("hl");
  const { data: hlRaw, isLoading: hlLoading } = useHLPositions();
  const { data: asterRaw, isLoading: asterLoading } = useAsterPositions();
  const { data: polyRaw, isLoading: polyLoading } = usePolymarketPositions();
  const closePosition = useCloseHLPosition();

  const hlPositions = Array.isArray(hlRaw) ? hlRaw : [];
  const asterPositions = Array.isArray(asterRaw) ? asterRaw : [];
  const polyPositions = Array.isArray(polyRaw) ? polyRaw : [];

  const isLoading = venue === "hl" ? hlLoading : venue === "aster" ? asterLoading : polyLoading;
  const positions = venue === "hl" ? hlPositions : venue === "aster" ? asterPositions : polyPositions;

  const totalCount = hlPositions.length + asterPositions.length + polyPositions.length;

  const handleClose = (coin: string) => {
    if (confirm(`Close entire ${coin} position?`)) {
      closePosition.mutate(coin);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ fontSize: "11px" }}>
      {/* Venue tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        {VENUES.map((v) => (
          <button
            key={v.id}
            onClick={() => setVenue(v.id)}
            className="text-[11px] px-2.5 py-1 rounded font-semibold"
            style={{
              background: venue === v.id ? `${v.color}15` : "transparent",
              color: venue === v.id ? v.color : "var(--text-dim)",
              border: venue === v.id ? `1px solid ${v.color}40` : "1px solid transparent",
            }}
          >
            {v.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>
          {totalCount} total
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono animate-pulse" style={{ color: "var(--text-dim)" }}>Loading positions...</span>
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-2xl mb-1 block" style={{ color: "var(--text-dim)", opacity: 0.4 }}>—</span>
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>No open positions on {VENUES.find(v => v.id === venue)?.label}</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-1.5 px-2 font-semibold">{venue === "poly" ? "Market" : "Symbol"}</th>
                <th className="text-right py-1.5 px-2 font-semibold">Side</th>
                <th className="text-right py-1.5 px-2 font-semibold">Size</th>
                <th className="text-right py-1.5 px-2 font-semibold">Entry</th>
                <th className="text-right py-1.5 px-2 font-semibold">PnL</th>
                {venue === "hl" && <th className="text-right py-1.5 px-2 font-semibold">Action</th>}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos: Record<string, unknown>, i: number) => {
                const symbol = String(pos.coin || pos.symbol || pos.market || pos.question || `Position ${i + 1}`);
                const side = String(pos.side || pos.direction || (Number(pos.size || pos.szi || 0) >= 0 ? "Long" : "Short"));
                const size = Math.abs(Number(pos.size || pos.szi || pos.quantity || pos.amount || 0));
                const entry = Number(pos.entry_price || pos.entryPx || pos.entry || pos.avg_price || 0);
                const pnl = Number(pos.unrealized_pnl || pos.unrealizedPnl || pos.pnl || pos.profit || 0);
                const isProfit = pnl >= 0;

                return (
                  <tr key={i} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="py-1.5 px-2 font-mono font-bold" style={{ color: "var(--text-primary)" }}>{symbol}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold"
                      style={{ color: side.toLowerCase().includes("long") || side.toLowerCase() === "buy" ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {side}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{size.toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{entry > 0 ? `$${entry.toLocaleString()}` : "—"}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold"
                      style={{ color: isProfit ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {isProfit ? "+" : ""}{pnl.toFixed(2)}
                    </td>
                    {venue === "hl" && (
                      <td className="py-1.5 px-2 text-right">
                        <button
                          onClick={() => handleClose(symbol)}
                          className="text-[9px] px-2 py-0.5 rounded font-semibold transition hover:opacity-80"
                          style={{ background: "rgba(255,68,68,0.1)", color: "var(--accent-red)", border: "1px solid rgba(255,68,68,0.25)" }}
                          disabled={closePosition.isPending}
                        >
                          {closePosition.isPending ? "..." : "Close"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
