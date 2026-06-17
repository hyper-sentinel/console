"use client";
import { useEffect, useState } from "react";
import { api, type BillingStatus } from "@/lib/api";
import Link from "next/link";

/**
 * PaymentAlert shows a banner when the user's payment failed OR when the free-tier
 * quota is reached. Mounted in the console layout so it appears on every console page.
 * Self-fetches billing status; renders nothing when payment is healthy and under limit.
 */
export default function PaymentAlert() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);

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
  const isGated = billing.gated === true || promptsUsed >= promptLimit;

  const handleFix = async () => {
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) window.location.href = url;
    } catch {
      // surfaced via the banner itself; no-op
    }
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
          onClick={handleFix}
          className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", color: "#FCA5A5" }}
        >
          Update Payment →
        </button>
      </div>
    );
  }

  // Quota exceeded banner (amber)
  if (isGated) {
    return (
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 text-sm"
        style={{ background: "rgba(245,158,11,0.10)", borderBottom: "1px solid rgba(245,158,11,0.3)", color: "#FCD34D" }}
      >
        <span>
          <strong style={{ color: "#F59E0B" }}>Free tier limit reached:</strong>{" "}
          {promptsUsed}/{promptLimit} prompts this week — add a payment method to continue.
        </span>
        <Link
          href="/console/billing"
          className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#FCD34D" }}
        >
          Add payment →
        </Link>
      </div>
    );
  }

  return null;
}
