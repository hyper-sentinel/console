"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BillingPage() {
  const [billing, setBilling] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBillingStatus()
      .then((d) => setBilling(d as unknown as Record<string, unknown>))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentTier = (billing?.tier as string) || "free";

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "/mo",
      description: "Pay-as-you-go with higher fees",
      features: ["300 req/min rate limit", "40% LLM markup", "0.10% maker / 0.07% taker", "All 62+ tools", "Community support"],
      color: "#00FF88",
      cta: currentTier === "free" ? "Current Plan" : "Downgrade",
    },
    {
      id: "pro",
      name: "Pro",
      price: "$100",
      period: "/mo",
      description: "For serious traders and builders",
      features: ["1,000 req/min rate limit", "15% LLM markup", "0.04% maker / 0.03% taker", "Priority execution", "Email support"],
      color: "#8B5CF6",
      cta: currentTier === "pro" ? "Current Plan" : currentTier === "enterprise" ? "Downgrade" : "Upgrade",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$1,000",
      period: "/mo",
      description: "Maximum throughput, minimum fees",
      features: ["5,000 req/min rate limit", "5% LLM markup", "0.02% maker / 0.01% taker", "Dedicated support", "Custom integrations"],
      color: "#FBBF24",
      cta: currentTier === "enterprise" ? "Current Plan" : "Upgrade",
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (planId === currentTier) return;
    try {
      const result = await api.createCheckout(planId) as Record<string, string>;
      if (result?.url) {
        window.open(result.url, "_blank");
      } else {
        alert("Checkout session created. Check your email for the payment link.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create checkout";
      alert(msg);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8 stagger-1">
        <h1 className="text-2xl font-semibold text-white mb-1">Billing</h1>
        <p className="text-sm" style={{ color: "#71717A" }}>Manage your subscription and payment methods</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: "#52525B" }}>Loading billing info...</div>
      ) : (
        <>
          {/* Current Plan Summary */}
          <div className="rounded-xl p-6 border mb-8 flex items-center justify-between stagger-2" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#52525B" }}>Current Plan</p>
              <p className="text-xl font-bold text-white">{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</p>
              <p className="text-xs mt-1" style={{ color: "#71717A" }}>
                {billing?.monthly_api_calls != null ? `${Number(billing.monthly_api_calls).toLocaleString()} API calls this month` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono" style={{ color: plans.find((p) => p.id === currentTier)?.color }}>
                {plans.find((p) => p.id === currentTier)?.price}
                <span className="text-sm font-normal" style={{ color: "#71717A" }}>/mo</span>
              </p>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="relative rounded-xl p-6 border transition-all"
                style={{
                  background: plan.id === currentTier ? "#1A1A1E" : "#141416",
                  borderColor: plan.id === currentTier ? `${plan.color}30` : "rgba(255,255,255,0.06)",
                  boxShadow: plan.id === currentTier ? `0 0 30px ${plan.color}10` : "none",
                }}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-3 py-0.5 rounded-full font-bold" style={{
                    background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                    color: "white",
                  }}>
                    POPULAR
                  </span>
                )}

                <p className="text-lg font-semibold text-white mb-1">{plan.name}</p>
                <p className="text-3xl font-bold font-mono text-white mb-1">
                  {plan.price}<span className="text-sm font-normal" style={{ color: "#71717A" }}>{plan.period}</span>
                </p>
                <p className="text-xs mb-5" style={{ color: "#71717A" }}>{plan.description}</p>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "#A1A1AA" }}>
                      <span style={{ color: plan.color }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.id === currentTier}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: plan.id === currentTier ? "rgba(255,255,255,0.04)" : `${plan.color}15`,
                    color: plan.id === currentTier ? "#52525B" : plan.color,
                    border: `1px solid ${plan.id === currentTier ? "rgba(255,255,255,0.06)" : `${plan.color}25`}`,
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Payment Methods / USDC */}
          <div className="rounded-xl p-6 border stagger-4" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Payment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-4 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#52525B" }}>Stripe</p>
                <p className="text-sm text-white">Credit card billing via Stripe</p>
                <p className="text-xs mt-1" style={{ color: "#71717A" }}>Managed by subscription</p>
              </div>
              <div className="rounded-lg p-4 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#52525B" }}>USDC Balance</p>
                <p className="text-lg font-mono font-bold text-white">
                  ${billing?.usdc_balance != null ? Number(billing.usdc_balance).toFixed(2) : "0.00"}
                </p>
                <p className="text-xs mt-1" style={{ color: "#71717A" }}>On-chain prepaid credits</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
