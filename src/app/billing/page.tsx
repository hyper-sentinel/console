"use client";
import { useState } from "react";
import { useBillingStatus, useBillingUsage, useBillingHistory, useUSDCBalance, useSubscribe } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Market data & intelligence",
    features: [
      "All 60+ tools",
      "300 req/min rate limit",
      "40% LLM markup",
      "0.10% maker / 0.07% taker",
      "50K tokens/mo",
      "Community support",
    ],
    accent: "#71717A",
    current: false,
  },
  {
    name: "Pro",
    price: "$100",
    period: "/mo",
    description: "Full trading & execution",
    features: [
      "All 60+ tools",
      "1,000 req/min rate limit",
      "20% LLM markup",
      "0.06% maker / 0.04% taker",
      "500K tokens/mo",
      "Priority support",
    ],
    accent: "#8B5CF6",
    current: false,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$1,000",
    period: "/mo",
    description: "Dedicated infrastructure",
    features: [
      "All 60+ tools",
      "Unlimited rate limit",
      "10% LLM markup",
      "0.02% maker / 0.01% taker",
      "Unlimited tokens",
      "Dedicated support + SLA",
    ],
    accent: "#F59E0B",
    current: false,
  },
];

export default function BillingPage() {
  const { user } = useAuth();
  const { data: status, isLoading: statusLoading } = useBillingStatus();
  const { data: usage } = useBillingUsage();
  const { data: history } = useBillingHistory();
  const { data: usdcBalance } = useUSDCBalance();
  const subscribeMutation = useSubscribe();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const currentTier = status?.tier || user?.tier || "free";

  const handleUpgrade = async (plan: "pro" | "enterprise") => {
    setUpgrading(plan);
    try {
      const result = await subscribeMutation.mutateAsync(plan);
      // Redirect to Stripe Checkout
      if (result?.url) window.location.href = result.url;
    } catch (e) {
      console.error("Upgrade failed:", e);
    }
    setUpgrading(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0B", color: "#E4E4E7" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-lg font-bold text-white">
              Sentinel<span style={{ color: "#8B5CF6" }}>_</span>
            </a>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
              background: currentTier === "pro" ? "rgba(139, 92, 246, 0.15)" : currentTier === "enterprise" ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.06)",
              color: currentTier === "pro" ? "#A78BFA" : currentTier === "enterprise" ? "#FBBF24" : "#71717A",
            }}>
              {currentTier.toUpperCase()}
            </span>
          </div>
          <a href="/dashboard" className="text-sm hover:underline" style={{ color: "#71717A" }}>
            ← Back to Terminal
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-sm mb-10" style={{ color: "#71717A" }}>
          Manage your plan, monitor usage, and access invoices.
        </p>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.name.toLowerCase();
            return (
              <div
                key={tier.name}
                className="rounded-xl border p-6 relative transition-all"
                style={{
                  background: isCurrent ? "rgba(139, 92, 246, 0.05)" : "rgba(26, 26, 30, 0.6)",
                  borderColor: isCurrent ? "rgba(139, 92, 246, 0.3)" : "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-0.5 rounded-full"
                    style={{ background: "#8B5CF6", color: "#FFF" }}>
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1" style={{ color: tier.accent }}>{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  <span className="text-sm" style={{ color: "#71717A" }}>{tier.period}</span>
                </div>
                <p className="text-xs mb-4" style={{ color: "#71717A" }}>{tier.description}</p>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <span style={{ color: "#22C55E" }}>✓</span>
                      <span style={{ color: "#A1A1AA" }}>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="w-full py-2 rounded-lg text-sm font-medium text-center"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#71717A" }}>
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier.name.toLowerCase() as "pro" | "enterprise")}
                    disabled={!!upgrading || tier.name === "Free"}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: tier.name === "Free" ? "rgba(255,255,255,0.04)" : tier.accent,
                      color: tier.name === "Free" ? "#71717A" : "#FFF",
                    }}
                  >
                    {upgrading === tier.name.toLowerCase() ? "Redirecting..." : tier.name === "Free" ? "Downgrade" : `Upgrade to ${tier.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatCard label="API Calls (This Month)" value={
            statusLoading ? "..." : String(status?.monthly_api_calls ?? 0)
          } />
          <StatCard label="Rate Limit" value={
            statusLoading ? "..." : `${status?.rate_limit_per_min ?? 300} req/min`
          } />
          <StatCard label="USDC Balance" value={
            usdcBalance ? `$${(usdcBalance as Record<string, unknown>)?.balance ?? "0.00"}` : "$0.00"
          } />
        </div>

        {/* Fee Summary */}
        {status && (
          <div className="rounded-xl border p-6 mb-12" style={{
            background: "rgba(26, 26, 30, 0.6)",
            borderColor: "rgba(255,255,255,0.06)",
          }}>
            <h3 className="text-sm font-semibold mb-4">Your Fee Schedule</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#8B5CF6" }}>
                  {status?.your_fees?.llm_markup || "40%"}
                </div>
                <div className="text-xs" style={{ color: "#71717A" }}>LLM Markup</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#22C55E" }}>
                  {status?.your_fees?.maker_fee || "0.10%"}
                </div>
                <div className="text-xs" style={{ color: "#71717A" }}>Maker Fee</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#F59E0B" }}>
                  {status?.your_fees?.taker_fee || "0.07%"}
                </div>
                <div className="text-xs" style={{ color: "#71717A" }}>Taker Fee</div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice History */}
        <div className="rounded-xl border p-6" style={{
          background: "rgba(26, 26, 30, 0.6)",
          borderColor: "rgba(255,255,255,0.06)",
        }}>
          <h3 className="text-sm font-semibold mb-4">Invoice History</h3>
          {Array.isArray(history) && history.length > 0 ? (
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ color: "#71717A" }}>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(history as Record<string, string>[]).map((inv, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-2">{inv.date}</td>
                    <td className="py-2">{inv.amount}</td>
                    <td className="py-2" style={{ color: inv.status === "paid" ? "#22C55E" : "#F59E0B" }}>
                      {inv.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs" style={{ color: "#52525B" }}>No invoices yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-5" style={{
      background: "rgba(26, 26, 30, 0.6)",
      borderColor: "rgba(255,255,255,0.06)",
    }}>
      <div className="text-xs mb-1" style={{ color: "#71717A" }}>{label}</div>
      <div className="text-2xl font-bold font-mono text-white">{value}</div>
    </div>
  );
}
