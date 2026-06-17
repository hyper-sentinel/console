"use client";
import { useState } from "react";
import { useBillingStatus, useBillingHistory, useSubscribe, usePortalSession } from "@/lib/hooks";

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
  const { data: status, isLoading: statusLoading } = useBillingStatus();
  const { data: historyRaw } = useBillingHistory();
  const subscribeMutation = useSubscribe();
  const portalMutation = usePortalSession();
  const [working, setWorking] = useState(false);

  // Read response.invoices or fall back to root array
  const invoices: Invoice[] = (() => {
    if (!historyRaw) return [];
    const resp = historyRaw as { invoices?: Invoice[] } | Invoice[];
    if (Array.isArray(resp)) return resp as Invoice[];
    if (typeof resp === "object" && "invoices" in resp && Array.isArray((resp as { invoices: Invoice[] }).invoices)) {
      return (resp as { invoices: Invoice[] }).invoices;
    }
    return [];
  })();

  const paymentStatus = status?.payment_status || "free";
  const paymentFailed = paymentStatus === "payment_failed" || paymentStatus === "payment_action_required";
  const paymentActive = paymentStatus === "active";

  const promptsUsed = status?.prompts_used ?? 0;
  const promptLimit = status?.prompt_limit ?? 10;
  const isGated = status?.gated === true || promptsUsed >= promptLimit;
  const resetsAt = status?.resets_at ? new Date(status.resets_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

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

  const handleManagePayment = async () => {
    setWorking(true);
    try {
      const result = await portalMutation.mutateAsync();
      if (result?.portal_url) {
        window.location.href = result.portal_url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("add_payment_method") || msg.includes("no customer")) {
        await handleAddPayment();
        return;
      }
      console.error("Portal failed:", err);
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

        {/* Free-tier quota section */}
        {(isGated || promptLimit > 0) && !statusLoading && (
          <div
            className="rounded-xl border p-6 mb-8"
            style={{
              background: isGated ? "rgba(245,158,11,0.06)" : "rgba(26,26,30,0.6)",
              borderColor: isGated ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Free Tier Prompts</h3>
              {isGated && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
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
                {status?.window_days ?? 7}-day rolling window
              </span>
            </div>
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

          {paymentActive ? (
            <button
              onClick={handleManagePayment}
              disabled={working}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#8B5CF6", color: "#FFF" }}
            >
              {working ? "Opening portal..." : "Manage Payment →"}
            </button>
          ) : (
            <button
              onClick={handleAddPayment}
              disabled={working}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#8B5CF6", color: "#FFF" }}
            >
              {working ? "Redirecting..." : paymentFailed ? "Update Payment Method →" : "Add Payment Method →"}
            </button>
          )}
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
        {status?.your_fees && (
          <div className="rounded-xl border p-6 mb-12" style={{
            background: "rgba(26, 26, 30, 0.6)",
            borderColor: "rgba(255,255,255,0.06)",
          }}>
            <h3 className="text-sm font-semibold mb-4">Your Fee Schedule</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#8B5CF6" }}>
                  {status.your_fees.llm_markup || "20%"}
                </div>
                <div className="text-xs" style={{ color: "#71717A" }}>LLM Markup</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#22C55E" }}>
                  {status.your_fees.maker_fee || "0.01%"}
                </div>
                <div className="text-xs" style={{ color: "#71717A" }}>Maker Fee</div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono" style={{ color: "#F59E0B" }}>
                  {status.your_fees.taker_fee || "0.01%"}
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
