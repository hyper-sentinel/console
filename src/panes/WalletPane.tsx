"use client";
import { useHLAccount, useAsterBalance, useAsterAccountInfo } from "@/lib/hooks";

export default function WalletPane() {
  const { data: hlAccount, isLoading: hlLoading } = useHLAccount();
  const { data: asterBalance, isLoading: asterLoading } = useAsterBalance();
  const { data: asterAccount } = useAsterAccountInfo();

  const hlData = hlAccount as Record<string, unknown> | undefined;
  const asterData = asterBalance as Record<string, unknown> | undefined;
  const asterAcct = asterAccount as Record<string, unknown> | undefined;

  const hlEquity = Number(hlData?.equity || hlData?.account_value || hlData?.totalMarginUsed || 0);
  const hlAvailable = Number(hlData?.available || (hlData?.crossMarginSummary as Record<string, unknown>)?.totalRawUsd || hlData?.withdrawable || 0);
  const hlMarginUsed = Number(hlData?.margin_used || hlData?.totalMarginUsed || 0);

  const asterBal = Number(asterData?.balance || asterData?.free || asterData?.available || 0);
  const asterTotal = Number(asterAcct?.total || asterAcct?.totalWalletBalance || asterBal);

  const totalEquity = hlEquity + asterTotal;

  return (
    <div className="flex flex-col h-full p-3 gap-3" style={{ fontSize: "11px" }}>
      {/* Total Portfolio */}
      <div className="rounded-lg p-3 text-center" style={{ background: "linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,229,255,0.08) 100%)", border: "1px solid rgba(0,255,136,0.2)" }}>
        <span className="text-[9px] font-semibold uppercase block" style={{ color: "var(--text-dim)" }}>Total Equity</span>
        <span className="text-2xl font-black font-mono block mt-1" style={{ color: "var(--accent-green)" }}>
          ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Hyperliquid */}
      <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent-cyan)" }} />
          <span className="text-[10px] font-bold uppercase">Hyperliquid</span>
          {hlLoading && <span className="text-[9px] animate-pulse" style={{ color: "var(--text-dim)" }}>loading...</span>}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-dim)" }}>Equity</span>
            <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>${hlEquity.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-dim)" }}>Available</span>
            <span className="font-mono" style={{ color: "var(--accent-green)" }}>${hlAvailable.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-dim)" }}>Margin Used</span>
            <span className="font-mono" style={{ color: hlMarginUsed > 0 ? "var(--accent-cyan)" : "var(--text-dim)" }}>${hlMarginUsed.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Aster DEX */}
      <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "#8b5cf6" }} />
          <span className="text-[10px] font-bold uppercase">Aster DEX</span>
          {asterLoading && <span className="text-[9px] animate-pulse" style={{ color: "var(--text-dim)" }}>loading...</span>}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-dim)" }}>USDT Balance</span>
            <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>${asterBal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-dim)" }}>Total Value</span>
            <span className="font-mono" style={{ color: "#8b5cf6" }}>${asterTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
