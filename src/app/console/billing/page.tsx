"use client";
import { BillingView } from "@/components/BillingView";

export default function BillingPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8 stagger-1">
        <h1 className="text-2xl font-semibold text-white mb-1">Billing</h1>
        <p className="text-sm" style={{ color: "#71717A" }}>Pay-as-you-go — no subscriptions, no tiers</p>
      </div>
      <BillingView />
    </div>
  );
}
