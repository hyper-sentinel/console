"use client";
import { useState, useEffect } from "react";
import { api, type BillingStatus } from "@/lib/api";
import { UsageBarChart, type DailyPoint } from "@/components/UsageBarChart";

interface Invoice {
  amount_usd?: number;
  amount?: number;
  hosted_url?: string;
  url?: string;
  period_start?: string;
  date?: string;
  status: string;
}

interface ToolStat {
  name: string;
  calls: number;
  avg_latency_ms?: number;
  model?: string;
  provider?: string;
  total_tokens?: number;
  cost?: string;
}

interface UsageBreakdown {
  period?: string;
  tools?: ToolStat[];
  daily?: DailyPoint[];
}

// paymentMethodLabel renders the on-file method HONESTLY from verified gateway data:
// a raw card → "Visa •••• 9481"; Stripe Link → "Stripe Link"; active w/o detail →
// "Card on file". Never fabricates a card number we can't retrieve.
function paymentMethodLabel(b: BillingStatus | null): string | null {
  if (!b) return null;
  if (b.card_last4) {
    const brand = b.card_brand ? b.card_brand.charAt(0).toUpperCase() + b.card_brand.slice(1) : "Card";
    return `${brand} •••• ${b.card_last4}`;
  }
  if (b.payment_method_type === "link") return "Stripe Link";
  if (b.payment_status === "active") return "Card on file";
  return null;
}

// BillingView is the single source of truth for billing UI, rendered by both
// /billing (standalone, from terminal) and /console/billing (in-console) so they
// cannot drift. Self-fetches from the gateway.
export function BillingView() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [breakdown, setBreakdown] = useState<UsageBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.getBillingStatus().then((d) => setBilling(d)),
      api.getBillingHistory().then((d) => {
        const resp = d as { invoices?: Invoice[] } | Invoice[];
        if (Array.isArray(resp)) setInvoices(resp);
        else if (resp && typeof resp === "object" && "invoices" in resp && Array.isArray((resp as { invoices: Invoice[] }).invoices)) {
          setInvoices((resp as { invoices: Invoice[] }).invoices);
        }
      }),
      api.getUsageBreakdown().then((d) => setBreakdown(d as UsageBreakdown)),
    ]).finally(() => setLoading(false));
  }, []);

  const paymentStatus = billing?.payment_status || "free";
  const paymentFailed = paymentStatus === "payment_failed" || paymentStatus === "payment_action_required";
  const paymentActive = paymentStatus === "active";

  const promptsUsed = billing?.prompts_used ?? 0;
  const promptLimit = billing?.prompt_limit ?? 10;
  const isGated = billing?.gated === true || (!paymentActive && promptsUsed >= promptLimit);
  const resetsAt = billing?.resets_at ? new Date(billing.resets_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  const platformFees = billing?.platform_fees ?? "$0.00";
  const monthlyTokens = billing?.monthly_tokens ?? 0;
  const monthlyApiCalls = billing?.monthly_api_calls ?? 0;
  const pmLabel = paymentMethodLabel(billing);

  const daily = breakdown?.daily ?? [];
  const llmStats = (breakdown?.tools ?? []).filter((t) => !!t.model);

  const handleAddPayment = async () => {
    setWorking(true);
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) window.location.href = url;
    } catch (err: unknown) {
      console.error("Checkout failed:", err);
    }
    setWorking(false);
  };

  const handleManagePayment = async () => {
    setWorking(true);
    try {
      const result = await api.getPortalSession();
      if (result?.portal_url) window.location.href = result.portal_url;
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

  if (loading) {
    return <div className="text-center py-20 text-sm" style={{ color: "#52525B" }}>Loading billing info…</div>;
  }

  return (
    <>
      {/* Spend hero — month-to-date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-1">
        <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(139,92,246,0.25)", boxShadow: "0 0 30px rgba(139,92,246,0.06)" }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: "#52525B" }}>Platform fees · month-to-date</p>
          <p className="text-3xl font-bold font-mono" style={{ color: "#A78BFA" }}>{platformFees}</p>
          <p className="text-[10px] mt-1" style={{ color: "#52525B" }}>20% markup on LLM provider costs</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: "#52525B" }}>LLM tokens metered</p>
          <p className="text-3xl font-bold font-mono text-white">{monthlyTokens.toLocaleString()}</p>
          <p className="text-[10px] mt-1" style={{ color: "#52525B" }}>this billing period</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: "#52525B" }}>API calls</p>
          <p className="text-3xl font-bold font-mono text-white">{Number(monthlyApiCalls).toLocaleString()}</p>
          <p className="text-[10px] mt-1" style={{ color: "#52525B" }}>{billing?.rate_limit_per_min ?? 1000}/min rate limit</p>
        </div>
      </div>

      {/* Free-tier quota (only when not a paying customer) */}
      {!paymentActive && promptLimit > 0 && (
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
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                LIMIT REACHED
              </span>
            )}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold font-mono" style={{ color: isGated ? "#F59E0B" : "white" }}>{promptsUsed}</span>
            <span className="text-sm mb-1" style={{ color: "#71717A" }}>/ {promptLimit} prompts</span>
            <span className="text-xs mb-1 ml-auto" style={{ color: "#52525B" }}>{billing?.window_days ?? 7}-day rolling window</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (promptsUsed / promptLimit) * 100)}%`, background: isGated ? "#F59E0B" : "#8B5CF6" }} />
          </div>
          <p className="text-xs" style={{ color: "#71717A" }}>
            {resetsAt ? `Resets ${resetsAt}` : "Rolling 7-day window"}.{" "}
            {isGated ? "Add a payment method to unlock unlimited access." : `${promptLimit - promptsUsed} prompts remaining.`}
          </p>
        </div>
      )}

      {/* Pay-as-you-go card + payment method on file */}
      <div className="rounded-xl p-8 border mb-8 stagger-3" style={{ background: "#141416", borderColor: "rgba(139,92,246,0.25)", boxShadow: "0 0 30px rgba(139,92,246,0.08)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">💳</span>
          <p className="text-lg font-semibold text-white">Pay-as-you-go</p>
        </div>
        <p className="text-3xl font-bold font-mono text-white mb-4">
          20%<span className="text-sm font-normal ml-2" style={{ color: "#71717A" }}>markup on LLM provider costs</span>
        </p>
        <ul className="space-y-2 mb-6">
          {["No upfront fees · no subscriptions", "Flat 1,000 req/min · all tools included", "Billed monthly in arrears via Stripe"].map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#A1A1AA" }}>
              <span style={{ color: "#8B5CF6" }}>✓</span> {f}
            </li>
          ))}
        </ul>

        {paymentActive && pmLabel && (
          <div className="flex items-center justify-between rounded-lg px-4 py-3 mb-4 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-xs uppercase font-semibold tracking-wider" style={{ color: "#52525B" }}>Payment method</span>
            <span className="text-sm font-mono" style={{ color: "#22C55E" }}>{pmLabel}</span>
          </div>
        )}

        {paymentActive ? (
          <button onClick={handleManagePayment} disabled={working} className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}>
            {working ? "Opening portal…" : "Manage Payment →"}
          </button>
        ) : (
          <button onClick={handleAddPayment} disabled={working} className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}>
            {working ? "Redirecting…" : paymentFailed ? "Update Payment Method →" : "Add Payment Method →"}
          </button>
        )}
      </div>

      {/* Daily activity chart */}
      <div className="rounded-xl p-6 border mb-8 stagger-4" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white mb-6">Daily Activity</h3>
        <UsageBarChart data={daily} />
      </div>

      {/* Cost by model */}
      {llmStats.length > 0 && (
        <div className="rounded-xl border overflow-hidden mb-8 stagger-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="px-5 py-3" style={{ background: "#141416" }}>
            <h3 className="text-sm font-semibold text-white">Cost by Model</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Provider</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Model</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Calls</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Tokens</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Platform Fee</th>
              </tr>
            </thead>
            <tbody>
              {llmStats.map((s, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <td className="px-5 py-3 text-sm" style={{ color: "#A78BFA" }}>{s.provider}</td>
                  <td className="px-5 py-3 text-sm font-mono" style={{ color: "#E4E4E7" }}>{s.model}</td>
                  <td className="px-5 py-3 text-sm text-right font-mono font-bold" style={{ color: "#00FF88" }}>{s.calls}</td>
                  <td className="px-5 py-3 text-sm text-right font-mono" style={{ color: "#E4E4E7" }}>{(s.total_tokens || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-right font-mono" style={{ color: "#FBBF24" }}>{s.cost || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fee schedule */}
      {billing?.your_fees && (
        <div className="rounded-xl p-6 border mb-8 stagger-5" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
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

      {/* Invoice history */}
      <div className="rounded-xl p-6 border stagger-6" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
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
                    <td className="py-2" style={{ color: inv.status === "paid" ? "#22C55E" : "#F59E0B" }}>{inv.status}</td>
                    <td className="py-2">
                      {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "#8B5CF6" }}>View ↗</a>
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
  );
}
