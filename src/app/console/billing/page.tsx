"use client";
import { useState, useEffect } from "react";
import { api, type BillingStatus } from "@/lib/api";

interface Invoice {
  amount_usd?: number;
  amount?: number;
  hosted_url?: string;
  url?: string;
  period_start?: string;
  date?: string;
  status: string;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalWorking, setPortalWorking] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.getBillingStatus().then((d) => setBilling(d)),
      api.getBillingHistory().then((d) => {
        // Gateway returns { invoices: [...] } — read response.invoices
        const resp = d as { invoices?: Invoice[] } | Invoice[];
        if (Array.isArray(resp)) {
          setInvoices(resp);
        } else if (resp && typeof resp === "object" && "invoices" in resp && Array.isArray((resp as { invoices: Invoice[] }).invoices)) {
          setInvoices((resp as { invoices: Invoice[] }).invoices);
        }
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const paymentStatus = billing?.payment_status || "free";
  const paymentFailed = paymentStatus === "payment_failed" || paymentStatus === "payment_action_required";
  const paymentActive = paymentStatus === "active";

  const promptsUsed = billing?.prompts_used ?? 0;
  const promptLimit = billing?.prompt_limit ?? 10;
  const isGated = billing?.gated === true || promptsUsed >= promptLimit;
  const resetsAt = billing?.resets_at ? new Date(billing.resets_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  const handleAddPayment = async () => {
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) {
        window.location.href = url;
      } else {
        alert("Checkout session created. Check your email for the payment link.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create checkout";
      alert(msg);
    }
  };

  const handleManagePayment = async () => {
    setPortalWorking(true);
    try {
      const result = await api.getPortalSession();
      if (result?.portal_url) {
        window.location.href = result.portal_url;
      }
    } catch (err: unknown) {
      // Gateway returns 400 { action: "add_payment_method" } if no customer yet
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("add_payment_method") || msg.includes("no customer")) {
        await handleAddPayment();
      } else {
        alert(msg || "Failed to open payment portal");
      }
    }
    setPortalWorking(false);
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
          {/* Free-tier quota section */}
          {(isGated || promptLimit > 0) && (
            <div
              className="rounded-xl p-6 border mb-8 stagger-2"
              style={{
                background: isGated ? "rgba(245,158,11,0.06)" : "#141416",
                borderColor: isGated ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Free Tier Usage</h3>
                {isGated && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
                  >
                    LIMIT REACHED
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold font-mono" style={{ color: isGated ? "#F59E0B" : "white" }}>
                  {promptsUsed}
                </span>
                <span className="text-sm mb-1" style={{ color: "#71717A" }}>/ {promptLimit} prompts</span>
                <span className="text-xs mb-1 ml-auto" style={{ color: "#52525B" }}>
                  {billing?.window_days ?? 7}-day rolling window
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (promptsUsed / promptLimit) * 100)}%`,
                    background: isGated ? "#F59E0B" : "#8B5CF6",
                  }}
                />
              </div>
              <p className="text-xs" style={{ color: "#71717A" }}>
                {resetsAt ? `Resets ${resetsAt}` : "Rolling 7-day window"}.{" "}
                {isGated
                  ? "Add a payment method to unlock unlimited access."
                  : `${promptLimit - promptsUsed} prompts remaining.`}
              </p>
            </div>
          )}

          {/* Pay-as-you-go card */}
          <div className="rounded-xl p-8 border mb-8 stagger-3" style={{ background: "#141416", borderColor: "rgba(139,92,246,0.25)", boxShadow: "0 0 30px rgba(139,92,246,0.08)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">💳</span>
              <p className="text-lg font-semibold text-white">Pay-as-you-go</p>
            </div>
            <p className="text-3xl font-bold font-mono text-white mb-4">
              20%<span className="text-sm font-normal ml-2" style={{ color: "#71717A" }}>markup on LLM provider costs</span>
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "No upfront fees · no subscriptions",
                "Flat 1,000 req/min · all tools included",
                "Billed monthly in arrears via Stripe",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#A1A1AA" }}>
                  <span style={{ color: "#8B5CF6" }}>✓</span> {f}
                </li>
              ))}
            </ul>

            {paymentActive ? (
              <button
                onClick={handleManagePayment}
                disabled={portalWorking}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}
              >
                {portalWorking ? "Opening portal..." : "Manage Payment →"}
              </button>
            ) : (
              <button
                onClick={handleAddPayment}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}
              >
                {paymentFailed ? "Update Payment Method →" : "Add Payment Method →"}
              </button>
            )}
          </div>

          {/* Usage + payment summary */}
          <div className="rounded-xl p-6 border stagger-4" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">This Month</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-4 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#52525B" }}>API Calls</p>
                <p className="text-lg font-mono font-bold text-white">
                  {billing?.monthly_api_calls != null ? Number(billing.monthly_api_calls).toLocaleString() : "0"}
                </p>
              </div>
              <div className="rounded-lg p-4 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#52525B" }}>Rate Limit</p>
                <p className="text-lg font-mono font-bold text-white">
                  {billing?.rate_limit_per_min ?? 1000}/min
                </p>
              </div>
            </div>
            <p className="text-xs mt-4" style={{ color: paymentFailed ? "#F87171" : "#71717A" }}>
              Payment status: <span className="font-mono">{paymentStatus}</span>
            </p>
          </div>

          {/* Fee Schedule */}
          {billing?.your_fees && (
            <div className="rounded-xl p-6 border mt-6 stagger-5" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-semibold text-white mb-4">Your Fee Schedule</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "LLM Markup", value: billing.your_fees.llm_markup, color: "#A78BFA" },
                  { label: "Maker Fee", value: billing.your_fees.maker_fee, color: "#22C55E" },
                  { label: "Taker Fee", value: billing.your_fees.taker_fee, color: "#F59E0B" },
                ].map((fee) => (
                  <div key={fee.label} className="rounded-lg p-4 border text-center" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xl font-mono font-bold mb-1" style={{ color: fee.color }}>{fee.value}</p>
                    <p className="text-[10px] uppercase font-semibold" style={{ color: "#52525B" }}>{fee.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice History */}
          <div className="rounded-xl p-6 border mt-6 stagger-6" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Invoice History</h3>
            {invoices.length > 0 ? (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ color: "#71717A" }}>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => {
                    const amount = inv.amount_usd ?? inv.amount;
                    const date = inv.period_start ?? inv.date;
                    const link = inv.hosted_url ?? inv.url;
                    return (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="py-2">{date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                        <td className="py-2">{amount != null ? `$${Number(amount).toFixed(2)}` : "—"}</td>
                        <td className="py-2" style={{ color: inv.status === "paid" ? "#22C55E" : "#F59E0B" }}>
                          {inv.status}
                        </td>
                        <td className="py-2">
                          {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "#8B5CF6" }}>
                              View ↗
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-xs" style={{ color: "#52525B" }}>No invoices yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
