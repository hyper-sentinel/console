"use client";
import { useAuth, PROVIDER_INFO } from "@/lib/auth";
import { useCryptoTopN } from "@/lib/hooks";

interface CoinData {
  id?: string;
  symbol?: string;
  current_price?: number;
  price_change_pct_24h?: number;
  [key: string]: unknown;
}

function formatPrice(val: number | undefined): string {
  if (!val) return "—";
  if (val >= 1000) return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${val.toFixed(2)}`;
}

const TICKERS = ["BTC", "ETH", "SOL"];

export default function TopBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { data: rawData } = useCryptoTopN(10);
  const coins = (Array.isArray(rawData) ? rawData : []) as CoinData[];

  // Extract BTC, ETH, SOL from the top-N response
  const priceMap = new Map<string, CoinData>();
  coins.forEach((c) => {
    const sym = (c.symbol || "").toUpperCase();
    if (TICKERS.includes(sym)) priceMap.set(sym, c);
  });

  const providerName = user?.provider ? PROVIDER_INFO[user.provider]?.name : null;
  const tierLabel = (user?.tier || "free").toUpperCase();

  return (
    <div className="topbar">
      {/* Search */}
      <div className="flex-1 max-w-lg">
        <input
          type="text"
          placeholder="🔍 Search markets, commands, or ask AI..."
          className="input-field !py-2 !text-sm"
          style={{ background: "var(--bg-primary)" }}
        />
      </div>

      {/* Live Prices Ticker */}
      <div className="flex items-center gap-4 ml-auto">
        {TICKERS.map((sym) => {
          const coin = priceMap.get(sym);
          const price = coin?.current_price;
          const change = coin?.price_change_pct_24h;
          const positive = (change ?? 0) >= 0;
          return (
            <div key={sym} className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>{sym}</span>
              <span
                className="text-xs font-mono font-bold"
                style={{ color: price ? (positive ? "var(--accent-green)" : "var(--accent-red)") : "var(--text-dim)" }}
              >
                {formatPrice(price)}
              </span>
              {change !== undefined && (
                <span
                  className="text-[10px] font-mono"
                  style={{ color: positive ? "var(--accent-green)" : "var(--accent-red)" }}
                >
                  {positive ? "+" : ""}{change.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "var(--border)" }}></div>

        {/* AI Provider Status */}
        {isAuthenticated && providerName && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
            <span className="status-dot online"></span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{providerName}</span>
          </div>
        )}

        {/* Tier Badge */}
        {isAuthenticated && (
          <span className={`tier-badge ${user?.tier === "pro" || user?.tier === "enterprise" ? "paid" : "free"}`}>
            {tierLabel}
          </span>
        )}

        {/* Notifications */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
        >
          <span className="text-sm">🔔</span>
        </button>

        {/* Logout */}
        {isAuthenticated && (
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
            style={{ background: "rgba(255,68,68,0.1)", color: "var(--accent-red)", border: "1px solid rgba(255,68,68,0.2)" }}
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
