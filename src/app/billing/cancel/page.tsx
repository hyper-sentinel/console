"use client";
import Link from "next/link";
import { api } from "@/lib/api";
import { useState } from "react";

export default function BillingCancelPage() {
  const [working, setWorking] = useState(false);

  const handleRetry = async () => {
    setWorking(true);
    try {
      const result = (await api.createCheckout("")) as Record<string, string>;
      const url = result?.checkout_url || result?.url;
      if (url) window.location.href = url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create checkout";
      alert(msg);
    }
    setWorking(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0A0A0B", color: "#E4E4E7" }}>
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Payment setup cancelled</h1>
      <p className="text-sm mb-8 text-center max-w-sm" style={{ color: "#A1A1AA" }}>
        No payment method was saved. You can add one any time to unlock unlimited Sentinel access.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleRetry}
          disabled={working}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "#8B5CF6" }}
        >
          {working ? "Redirecting..." : "Add Payment Method"}
        </button>
        <Link
          href="/console"
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-center transition-all hover:border-white/20"
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#A1A1AA" }}
        >
          Back to Console
        </Link>
      </div>

      <p className="mt-4 text-xs text-center max-w-xs" style={{ color: "#52525B" }}>
        Free tier: 10 prompts per 7-day window. Add a payment method for unlimited access.
      </p>

      {/* Footer */}
      <p className="mt-12 text-[11px]" style={{ color: "#3F3F46" }}>
        Sentinel Labs LLC · questions? hello@hyper-sentinel.com
      </p>
    </div>
  );
}
