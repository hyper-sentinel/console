"use client";
import { useState } from "react";
import { useBillingStatus, useBillingUsage, useBillingHistory, useSubscribe } from "@/lib/hooks";

export default function BillingPage() {
  const { data: status, isLoading: statusLoading } = useBillingStatus();
  useBillingUsage();
  const { data: history } = useBillingHistory();
  const subscribeMutation = useSubscribe();
  const [working, setWorking] = useState(false);

  const paymentStatus = (status as { payment_status?: string })?.payment_status || "active";
  const paymentFailed = paymentStatus === "payment_failed" || paymentStatus === "payment_action_required";

  const handleAddPayment = async () => {
    setWorking(true);
    try {
      const result = (await subscribeMutation.mutateAsync("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) window.location.href = url;
    } catch (e) {
      console.error("Checkout failed:", e);
    }
    setWorking(false);
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
              background: "rgba(139, 92, 246, 0.15)",
              color: "#A78BFA",
            }}>
              PAY-AS-YOU-GO
            </span>
          </div>
          <a href="/dashboard" className="text-sm hover:underline" style={{ color: "#71717A" }}>
            ← Back to Terminal
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Billing</h1>
        <p className="text-sm mb-10" style={{ color: "#71717A" }}>
          Pay-as-you-go — monitor usage, manage payment, and access invoices.
        </p>

        {/* Pay-as-you-go card */}
        <div className="rounded-xl border p-8 mb-12" style={{
          background: "rgba(139, 92, 246, 0.05)",
          borderColor: "rgba(139, 92, 246, 0.3)",
          backdropFilter: "blur(12px)",
        }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💳</span>
            <h3 className="text-lg font-bold text-white">Pay-as-you-go</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-white">20%</span>
            <span className="text-sm" style={{ color: "#71717A" }}>markup on LLM provider costs</span>
          </div>
          <ul className="space-y-2 mb-6">
            {[
              "All 69 tools · 1,000 req/min",
              "Billed monthly in arrears via Stripe",
              "No upfront fees · no subscriptions",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <span style={{ color: "#22C55E" }}>✓</span>
                <span style={{ color: "#A1A1AA" }}>{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleAddPayment}
            disabled={working}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#8B5CF6", color: "#FFF" }}
          >
            {working ? "Redirecting..." : paymentFailed ? "Update Payment Method →" : "Add Payment Method →"}
          </button>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <StatCard label="API Calls (This Month)" value={
            statusLoading ? "..." : String(status?.monthly_api_calls ?? 0)
          } />
          <StatCard label="Rate Limit" value={
            statusLoading ? "..." : `${status?.rate_limit_per_min ?? 1000} req/min`
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
                  {status?.your_fees?.llm_markup || "20%"}
                </div>
                <div className="text-xs" style={{ color: "#71717A" }}>LLM Markup</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#22C55E" }}>
                  {status?.your_fees?.maker_fee || "0.01%"}
                </div>
                <div className="text-xs" style={{ color: "#71717A" }}>Maker Fee</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#F59E0B" }}>
                  {status?.your_fees?.taker_fee || "0.01%"}
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
