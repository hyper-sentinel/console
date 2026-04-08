"use client";
import { useState } from "react";
import { useBillingStatus, useBillingUsage, useBillingHistory, useUSDCBalance, useSubscribe, useCreateApiKey } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

export default function AccountPane() {
  const { user } = useAuth();
  const { data: billing, isLoading: billingLoading } = useBillingStatus();
  const { data: usage } = useBillingUsage();
  const { data: history } = useBillingHistory();
  const { data: usdc } = useUSDCBalance();
  const subscribe = useSubscribe();
  const createKey = useCreateApiKey();

  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "keys" | "history">("overview");

  const handleSubscribe = async (plan: "pro" | "enterprise") => {
    try {
      const result = await subscribe.mutateAsync(plan);
      if (result?.url) window.open(result.url, "_blank");
    } catch (e) {
      console.error("Subscribe error:", e);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) return;
    try {
      const result = await createKey.mutateAsync(keyName);
      setNewKey(result?.api_key || "Created");
      setKeyName("");
    } catch (e) {
      console.error("Key creation error:", e);
    }
  };

  const tier = (billing as Record<string, unknown>)?.tier || user?.tier || "free";
  const fees = (billing as Record<string, unknown>)?.your_fees as Record<string, string> | undefined;

  return (
    <div className="flex flex-col h-full" style={{ fontSize: "11px" }}>
      {/* Tabs */}
      <div className="flex gap-1 px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        {(["overview", "keys", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="text-[11px] px-2.5 py-1 rounded capitalize font-medium"
            style={{
              background: activeTab === tab ? "rgba(0,255,136,0.1)" : "transparent",
              color: activeTab === tab ? "var(--accent-green)" : "var(--text-dim)",
              border: activeTab === tab ? "1px solid rgba(0,255,136,0.3)" : "1px solid transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {activeTab === "overview" && (
          <>
            {/* Tier Status */}
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Current Plan</span>
                <span className={`tier-badge ${tier === "pro" || tier === "enterprise" ? "paid" : "free"}`}>
                  {String(tier).toUpperCase()}
                </span>
              </div>
              {billingLoading ? (
                <span className="text-[10px] animate-pulse" style={{ color: "var(--text-dim)" }}>Loading...</span>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-dim)" }}>Subscription</span>
                    <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                      {(billing as Record<string, unknown>)?.subscription ? String((billing as Record<string, unknown>).subscription) : "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-dim)" }}>API Calls (month)</span>
                    <span className="font-mono" style={{ color: "var(--accent-cyan)" }}>
                      {Number((billing as Record<string, unknown>)?.monthly_api_calls || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-dim)" }}>Rate Limit</span>
                    <span className="font-mono">
                      {String((billing as Record<string, unknown>)?.rate_limit_per_min || 300)}/min
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Fees */}
            {fees && (
              <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <span className="text-[10px] font-semibold uppercase block mb-2" style={{ color: "var(--text-dim)" }}>Your Fees</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-dim)" }}>LLM Markup</span>
                    <span className="font-mono" style={{ color: "var(--accent-cyan)" }}>{fees.llm_markup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-dim)" }}>Maker Fee</span>
                    <span className="font-mono">{fees.maker_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-dim)" }}>Taker Fee</span>
                    <span className="font-mono">{fees.taker_fee}</span>
                  </div>
                </div>
              </div>
            )}

            {/* USDC Balance */}
            {usdc && (
              <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>USDC Balance</span>
                  <span className="font-mono font-bold" style={{ color: "var(--accent-green)" }}>
                    ${Number((usdc as Record<string, unknown>)?.balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Upgrade Buttons */}
            {tier === "free" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubscribe("pro")}
                  className="flex-1 py-2 rounded font-bold text-xs transition hover:opacity-80"
                  style={{ background: "var(--accent-green)", color: "#000" }}
                  disabled={subscribe.isPending}
                >
                  {subscribe.isPending ? "Processing..." : "Upgrade to Pro — $100/mo"}
                </button>
              </div>
            )}
            {(tier === "free" || tier === "pro") && (
              <button
                onClick={() => handleSubscribe("enterprise")}
                className="w-full py-2 rounded font-bold text-xs transition hover:opacity-80"
                style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}
                disabled={subscribe.isPending}
              >
                {subscribe.isPending ? "Processing..." : "Upgrade to Enterprise — $1,000/mo"}
              </button>
            )}
          </>
        )}

        {activeTab === "keys" && (
          <>
            {/* Create API Key */}
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <span className="text-[10px] font-semibold uppercase block mb-2" style={{ color: "var(--text-dim)" }}>Generate API Key</span>
              <div className="flex gap-2">
                <input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                  placeholder="Key name (e.g. production)"
                  className="flex-1 px-2 py-1.5 rounded text-xs font-mono"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button
                  onClick={handleCreateKey}
                  className="px-3 py-1.5 rounded text-xs font-bold transition hover:opacity-80"
                  style={{ background: "var(--accent-green)", color: "#000" }}
                  disabled={createKey.isPending || !keyName.trim()}
                >
                  {createKey.isPending ? "..." : "Create"}
                </button>
              </div>
              {newKey && (
                <div className="mt-2 p-2 rounded text-[10px] font-mono break-all" style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "var(--accent-green)" }}>
                  <span className="font-bold">New key:</span> {newKey}
                  <p className="mt-1 text-[9px]" style={{ color: "var(--text-dim)" }}>Save this — you won&apos;t see it again!</p>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <span className="text-[10px] font-semibold uppercase block mb-2" style={{ color: "var(--text-dim)" }}>Account Info</span>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-dim)" }}>User ID</span>
                  <span className="font-mono">{user?.id || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-dim)" }}>Email</span>
                  <span className="font-mono">{user?.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-dim)" }}>AI Provider</span>
                  <span className="font-mono">{user?.provider || "—"}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div className="space-y-1">
            {!history || (Array.isArray(history) && history.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className="text-2xl block" style={{ color: "var(--text-dim)", opacity: 0.4 }}>&mdash;</span>
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>No billing history yet</span>
              </div>
            ) : (
              (Array.isArray(history) ? history : []).map((inv: Record<string, unknown>, i: number) => (
                <div key={i} className="flex justify-between items-center p-2 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div>
                    <span className="text-[10px] font-mono">{String(inv.date || inv.created || "—")}</span>
                    <span className="text-[9px] ml-2" style={{ color: "var(--text-dim)" }}>{String(inv.description || inv.status || "")}</span>
                  </div>
                  <span className="font-mono font-bold text-[11px]" style={{ color: "var(--text-primary)" }}>
                    ${Number(inv.amount || inv.total || 0).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
