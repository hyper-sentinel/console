"use client";
import { BillingView } from "@/components/BillingView";

export default function BillingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0A0A0B", color: "#E4E4E7" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/console" className="text-lg font-bold text-white">
              Sentinel<span style={{ color: "#8B5CF6" }}>_</span>
            </a>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#A78BFA" }}>
              PAY-AS-YOU-GO
            </span>
          </div>
          <a href="/console" className="text-sm hover:underline" style={{ color: "#71717A" }}>
            ← Back to Console
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Billing</h1>
        <p className="text-sm mb-10" style={{ color: "#71717A" }}>
          Pay-as-you-go — monitor usage, manage payment, and access invoices.
        </p>
        <BillingView />
      </div>
    </div>
  );
}
