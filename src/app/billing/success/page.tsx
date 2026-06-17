"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0A0A0B", color: "#E4E4E7" }}>
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Payment method added</h1>
      <p className="text-sm mb-2 text-center max-w-sm" style={{ color: "#A1A1AA" }}>
        Your payment method has been saved. Your account is now active — usage is billed monthly in arrears.
      </p>

      {sessionId && (
        <p className="text-[10px] font-mono mb-8" style={{ color: "#52525B" }}>
          Session: {sessionId.slice(0, 24)}...
        </p>
      )}
      {!sessionId && <div className="mb-8" />}

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/console"
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white text-center transition-all hover:opacity-90"
          style={{ background: "#8B5CF6" }}
        >
          Go to Console
        </Link>
        <Link
          href="/console/billing"
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-center transition-all hover:border-purple-500/40"
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#A1A1AA" }}
        >
          View Billing
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-12 text-[11px]" style={{ color: "#3F3F46" }}>
        Sentinel Labs LLC · questions? hello@hyper-sentinel.com
      </p>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0B" }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#8B5CF6", borderTopColor: "transparent" }} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
