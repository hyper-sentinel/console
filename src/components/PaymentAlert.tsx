"use client";
import { useEffect, useState } from "react";
import { api, type BillingStatus } from "@/lib/api";

/**
 * PaymentAlert shows a banner when the user's payment failed OR when the free-tier
 * quota is reached. Mounted in the console layout so it appears on every console page.
 * Self-fetches billing status; renders nothing when payment is healthy and under limit.
 *
 * CTA behaviour (matching gateway 402 contract):
 *  - quota_exceeded: call /api/v1/billing/subscribe → get checkout_url → redirect to Stripe
 *  - payment_failed / payment_action_required: same checkout URL flow
 * Both cases bypass the internal /console/billing page and go straight to Stripe.
 */
export default function PaymentAlert() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    api.getBillingStatus()
      .then((d) => setBilling(d))
      .catch(() => {});
  }, []);

  if (!billing) return null;

  const paymentStatus = billing.payment_status || "free";
  const paymentFailed = paymentStatus === "payment_failed" || paymentStatus === "payment_action_required";
  const actionRequired = paymentStatus === "payment_action_required";

  const promptsUsed = billing.prompts_used ?? 0;
  const promptLimit = billing.prompt_limit ?? 10;
  const windowDays = billing.window_days ?? 7;
  // Trust the gateway's `gated` field (== paymentStatus != "active"). Re-deriving from
  // prompt counts wrongly shows "Free tier limit reached" to a paying user whose stale
  // prompt count exceeds the free limit.
  const isGated = billing.gated === true;

  // For payment_failed: try Stripe portal first (to update card), fall back to checkout.
  const handleFixPayment = async () => {
    if (working) return;
    setWorking(true);
    try {
      const result = await api.getPortalSession();
      if (result?.portal_url) { window.location.href = result.portal_url; return; }
    } catch { /* portal not available — fall through to checkout */ }
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) window.location.href = url;
    } catch { /* no-op */ }
    setWorking(false);
  };

  // For quota_exceeded: go straight to Stripe checkout (no portal needed — user isn't a customer yet).
  const handleUpgrade = async () => {
    if (working) return;
    setWorking(true);
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) { window.location.href = url; return; }
    } catch { /* no-op */ }
    // Fallback: send to billing page if checkout call fails
    window.location.href = "/console/billing";
    setWorking(false);
  };

  // Payment failed banner (red)
  if (paymentFailed) {
    return (
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 text-sm"
        style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5" }}
      >
        <span>
          <strong style={{ color: "#F87171" }}>
            {actionRequired ? "Payment action required." : "Payment failed."}
          </strong>{" "}
          {actionRequired
            ? "Your bank needs to confirm a recent charge to keep your account active."
            : "Update your payment method to avoid interruption to your API access."}
        </span>
        <button
          onClick={handleFixPayment}
          disabled={working}
          className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
          style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", color: "#FCA5A5" }}
        >
          {working ? "Redirecting…" : "Update Payment →"}
        </button>
      </div>
    );
  }

  // Quota exceeded banner (amber) — free tier, 10/7-day window
  if (isGated) {
    return (
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 text-sm"
        style={{ background: "rgba(245,158,11,0.10)", borderBottom: "1px solid rgba(245,158,11,0.3)", color: "#FCD34D" }}
      >
        <span>
          <strong style={{ color: "#F59E0B" }}>Free tier limit reached:</strong>{" "}
          {promptsUsed}/{promptLimit} prompts used in the last {windowDays} days — add a payment method to continue.
        </span>
        <button
          onClick={handleUpgrade}
          disabled={working}
          className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
          style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#FCD34D" }}
        >
          {working ? "Redirecting…" : "Upgrade →"}
        </button>
      </div>
    );
  }

  return null;
}
