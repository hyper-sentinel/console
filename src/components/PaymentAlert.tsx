"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * PaymentAlert shows a red banner when the user's latest invoice failed (or needs
 * action). Mounted in the console layout so it appears on every console page.
 * Self-fetches billing status; renders nothing when payment is healthy.
 */
export default function PaymentAlert() {
  const [status, setStatus] = useState<string>("active");

  useEffect(() => {
    api.getBillingStatus()
      .then((d) => setStatus((d as { payment_status?: string })?.payment_status || "active"))
      .catch(() => {});
  }, []);

  const failed = status === "payment_failed" || status === "payment_action_required";
  if (!failed) return null;

  const actionRequired = status === "payment_action_required";

  const handleFix = async () => {
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) window.open(url, "_blank");
    } catch {
      // surfaced via the banner itself; no-op
    }
  };

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
