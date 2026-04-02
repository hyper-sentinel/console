"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Play, KeyRound, Zap, Wrench, BookOpen, Package, CreditCard } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="skeleton skeleton-text-sm" style={{ width: "40%" }} />
      <div className="skeleton skeleton-heading mt-3" style={{ width: "30%" }} />
      <div className="skeleton skeleton-text-sm mt-2" style={{ width: "60%" }} />
    </div>
  );
}

export default function ConsoleDashboard() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<Record<string, unknown> | null>(null);
  const [keyCount, setKeyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getBillingStatus().then((d) => setBilling(d as unknown as Record<string, unknown>)),
      api.listApiKeys().then((d) => setKeyCount(d?.keys?.length || 0)),
    ]).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const tier = String(billing?.tier || "free");
  const apiCalls = billing?.monthly_api_calls != null ? Number(billing.monthly_api_calls) : null;
  const rateLimit = String(billing?.rate_limit_per_min || 300);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Greeting */}
      <div className="mb-10 stagger-1">
        <h1 className="text-3xl font-semibold text-white mb-1">
          {greeting()}, {user?.name || user?.email?.split("@")[0] || "Developer"}
        </h1>
        <p className="text-sm" style={{ color: "#71717A" }}>Overview of your Sentinel account</p>
      </div>

      {/* Usage Snapshot */}
      <div className="mb-8 stagger-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#52525B" }}>
          Usage Snapshot for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              {/* Plan Card */}
              <div className="console-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase" style={{ color: "#71717A" }}>Current Plan</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                    background: tier === "enterprise" ? "rgba(251,191,36,0.12)" : tier === "pro" ? "rgba(139,92,246,0.12)" : "rgba(0,255,136,0.08)",
                    color: tier === "enterprise" ? "#FBBF24" : tier === "pro" ? "#A78BFA" : "#00FF88",
                  }}>
                    {tier.toUpperCase()}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {tier === "enterprise" ? "$1,000" : tier === "pro" ? "$100" : "$0"}<span className="text-sm font-normal" style={{ color: "#71717A" }}>/mo</span>
                </p>
                <p className="text-xs" style={{ color: "#52525B" }}>
                  {tier === "free" ? "Pay-as-you-go fees" : "Fixed monthly + reduced fees"}
                </p>
              </div>

              {/* API Calls Card */}
              <div className="console-card rounded-xl p-5">
                <span className="text-xs font-semibold uppercase" style={{ color: "#71717A" }}>API Calls (Month)</span>
                <p className="text-2xl font-bold text-white mt-3 mb-1 font-mono">
                  {apiCalls != null ? apiCalls.toLocaleString() : "—"}
                </p>
                <p className="text-xs" style={{ color: "#52525B" }}>
                  Rate limit: {rateLimit}/min
                </p>
              </div>

              {/* Keys Card */}
              <div className="console-card rounded-xl p-5">
                <span className="text-xs font-semibold uppercase" style={{ color: "#71717A" }}>API Keys</span>
                <p className="text-2xl font-bold text-white mt-3 mb-1 font-mono">{keyCount}</p>
                <p className="text-xs" style={{ color: "#52525B" }}>
                  Active keys · <Link href="/console/api-keys" className="hover:underline" style={{ color: "#8B5CF6" }}>Manage →</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fee Schedule */}
      {!!billing?.your_fees && (
        <div className="mb-8 stagger-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#52525B" }}>Your Fee Schedule</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "LLM Markup", value: (billing.your_fees as Record<string, string>).llm_markup },
              { label: "Maker Fee", value: (billing.your_fees as Record<string, string>).maker_fee },
              { label: "Taker Fee", value: (billing.your_fees as Record<string, string>).taker_fee },
            ].map((fee) => (
              <div key={fee.label} className="rounded-lg p-4 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#52525B" }}>{fee.label}</p>
                <p className="text-lg font-mono font-bold" style={{ color: "#A78BFA" }}>{fee.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="stagger-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#52525B" }}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Launch Terminal — Hero Card */}
          <Link href="/dashboard" className="group console-card console-card-interactive rounded-xl p-6 md:col-span-1"
            style={{ background: "linear-gradient(135deg, rgba(0,255,136,0.04), rgba(0,229,255,0.04))", border: "1px solid rgba(0,255,136,0.15)" }}>
            <div className="text-2xl mb-3" style={{ color: "#00FF88" }}><Play size={24} /></div>
            <p className="text-sm font-semibold group-hover:text-green-300 transition mb-1" style={{ color: "#00FF88" }}>Launch Terminal</p>
            <p className="text-xs" style={{ color: "#71717A" }}>Open the trading dashboard</p>
            <span className="inline-block mt-3 text-xs" style={{ color: "#52525B" }}>↗</span>
          </Link>

          <Link href="/console/api-keys" className="group console-card console-card-interactive rounded-xl p-6">
            <div className="text-2xl mb-3" style={{ color: "#A78BFA" }}><KeyRound size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition mb-1">Create an API Key</p>
            <p className="text-xs" style={{ color: "#71717A" }}>Start integrating with our API</p>
            <span className="inline-block mt-3 text-xs" style={{ color: "#52525B" }}>↗</span>
          </Link>

          <Link href="/console/playground" className="group console-card console-card-interactive rounded-xl p-6">
            <div className="text-2xl mb-3" style={{ color: "#A78BFA" }}><Zap size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition mb-1">Open Playground</p>
            <p className="text-xs" style={{ color: "#71717A" }}>Test tools and LLM chat interactively</p>
            <span className="inline-block mt-3 text-xs" style={{ color: "#52525B" }}>↗</span>
          </Link>

          <Link href="/console/tools" className="group console-card console-card-interactive rounded-xl p-6">
            <div className="text-2xl mb-3" style={{ color: "#A78BFA" }}><Wrench size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition mb-1">Browse Tools</p>
            <p className="text-xs" style={{ color: "#71717A" }}>Explore 62+ available API tools</p>
            <span className="inline-block mt-3 text-xs" style={{ color: "#52525B" }}>↗</span>
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <a href="https://api.hyper-sentinel.com/docs" target="_blank" className="group rounded-xl p-6 border transition-all hover:border-green-500/20" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="text-2xl mb-3" style={{ color: "#71717A" }}><BookOpen size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-green-300 transition mb-1">View Documentation</p>
            <p className="text-xs" style={{ color: "#71717A" }}>API reference and guides</p>
          </a>

          <a href="https://pypi.org/project/hyper-sentinel" target="_blank" className="group rounded-xl p-6 border transition-all hover:border-green-500/20" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="text-2xl mb-3" style={{ color: "#71717A" }}><Package size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-green-300 transition mb-1">Python SDK</p>
            <p className="text-xs font-mono" style={{ color: "#71717A" }}>pip install hyper-sentinel</p>
          </a>

          <Link href="/console/billing" className="group rounded-xl p-6 border transition-all hover:border-yellow-500/20" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="text-2xl mb-3" style={{ color: "#71717A" }}><CreditCard size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-yellow-300 transition mb-1">Manage Billing</p>
            <p className="text-xs" style={{ color: "#71717A" }}>Subscriptions and invoices</p>
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="mt-10 rounded-xl p-6 border stagger-5" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
        <h3 className="text-sm font-semibold text-white mb-3">Quick Start</h3>
        <div className="rounded-lg p-4 font-mono text-xs leading-relaxed" style={{ background: "#0A0A0B", color: "#A1A1AA" }}>
          <p style={{ color: "#52525B" }}># Install the SDK</p>
          <p><span style={{ color: "#00FF88" }}>pip install</span> hyper-sentinel</p>
          <br />
          <p style={{ color: "#52525B" }}># Use your API key</p>
          <p><span style={{ color: "#8B5CF6" }}>from</span> hyper_sentinel <span style={{ color: "#8B5CF6" }}>import</span> Sentinel</p>
          <p>client = Sentinel(api_key=<span style={{ color: "#FBBF24" }}>&quot;sk-sentinel-xxx&quot;</span>)</p>
          <p>result = client.chat(<span style={{ color: "#FBBF24" }}>&quot;What&apos;s the price of BTC?&quot;</span>)</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t flex items-center justify-between text-xs stagger-6" style={{ borderColor: "rgba(255,255,255,0.04)", color: "#3F3F46" }}>
        <span>Sentinel Labs LLC · 2026 · <em>Soli Deo Gloria</em></span>
        <div className="flex gap-4">
          <a href="https://api.hyper-sentinel.com/docs" target="_blank" className="hover:text-white transition">API Docs ↗</a>
          <a href="https://github.com/hyper-sentinel" target="_blank" className="hover:text-white transition">GitHub ↗</a>
          <a href="https://pypi.org/project/hyper-sentinel" target="_blank" className="hover:text-white transition">PyPI ↗</a>
        </div>
      </footer>
    </div>
  );
}
