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

  const paymentStatus = (billing?.payment_status as string) || "active";
  const paymentFailed = paymentStatus === "payment_failed" || paymentStatus === "payment_action_required";

  const handleAddPayment = async () => {
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) {
        window.open(url, "_blank");
      } else {
        alert("Checkout session created. Check your email for the payment link.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create checkout";
      alert(msg);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8 stagger-1">
        <h1 className="text-2xl font-semibold text-white mb-1">Billing</h1>
        <p className="text-sm" style={{ color: "#71717A" }}>Pay-as-you-go — no subscriptions, no tiers</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: "#52525B" }}>Loading billing info...</div>
      ) : (
        <>
          {/* Pay-as-you-go card */}
          <div className="rounded-xl p-8 border mb-8 stagger-2" style={{ background: "#141416", borderColor: "rgba(139,92,246,0.25)", boxShadow: "0 0 30px rgba(139,92,246,0.08)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">💳</span>
              <p className="text-lg font-semibold text-white">Pay-as-you-go</p>
            </div>
            <p className="text-3xl font-bold font-mono text-white mb-4">
              20%<span className="text-sm font-normal ml-2" style={{ color: "#71717A" }}>markup on LLM provider costs</span>
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "Billed monthly in arrears via Stripe",
                "No upfront fees · no subscriptions",
                "Flat 1,000 req/min · all tools included",
                "Billed monthly in arrears — no upfront fees",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#A1A1AA" }}>
                  <span style={{ color: "#8B5CF6" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleAddPayment}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              {paymentFailed ? "Update Payment Method →" : "Add Payment Method →"}
            </button>
          </div>

          {/* Usage + payment summary */}
          <div className="rounded-xl p-6 border stagger-3" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">This Month</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-4 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#52525B" }}>API Calls</p>
                <p className="text-lg font-mono font-bold text-white">
                  {billing?.monthly_api_calls != null ? Number(billing.monthly_api_calls).toLocaleString() : "0"}
                </p>
              </div>
              <div className="rounded-lg p-4 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#52525B" }}>Platform Fees</p>
                <p className="text-lg font-mono font-bold text-white">
                  {(billing?.platform_fees as string) || "$0.00"}
                </p>
              </div>
            </div>
            <p className="text-xs mt-4" style={{ color: paymentFailed ? "#F87171" : "#71717A" }}>
              Payment status: <span className="font-mono">{paymentStatus}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
