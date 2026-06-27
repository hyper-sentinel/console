"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Play, KeyRound, Zap, Wrench, BookOpen, Package, CreditCard } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="console-panel-elevated rounded-xl p-5">
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

  const apiCalls = billing?.monthly_api_calls != null ? Number(billing.monthly_api_calls) : null;
  const rateLimit = String(billing?.rate_limit_per_min || 1000);
  const promptsUsed = billing?.prompts_used != null ? Number(billing.prompts_used) : null;
  const promptLimit = billing?.prompt_limit != null ? Number(billing.prompt_limit) : 10;
  const isGated = billing?.gated === true;
  const promptsResetsAt = billing?.resets_at ? new Date(billing.resets_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-10 stagger-1">
        <h1 className="text-3xl font-semibold text-white mb-1">Console</h1>
        <p className="text-sm text-muted-zinc">API keys, usage, and account overview</p>
      </div>

      {/* Usage Snapshot */}
      <div className="mb-8 stagger-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4 text-dim-zinc">
          Usage Snapshot for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              {/* Plan Card */}
              <div className="console-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase text-muted-zinc">Current Plan</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold badge-purple">
                    PAY-AS-YOU-GO
                  </span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  20%<span className="text-sm font-normal text-muted-zinc"> markup</span>
                </p>
                <p className="text-xs text-dim-zinc">
                  Flat 20% on LLM provider cost — billed via Stripe
                </p>
              </div>

              {/* Prompts This Week Card */}
              <div className="console-card rounded-xl p-5">
                <span className="text-xs font-semibold uppercase text-muted-zinc">Prompts This Week</span>
                <p className={`text-2xl font-bold mt-3 mb-1 font-mono ${isGated ? "text-amber-warn" : "text-white"}`}>
                  {promptsUsed != null ? promptsUsed : "—"}
                  <span className="text-sm font-normal ml-1 text-dim-zinc">/ {promptLimit}</span>
                </p>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: promptsUsed != null ? `${Math.min(100, (promptsUsed / promptLimit) * 100)}%` : "0%",
                      background: isGated ? "#F59E0B" : "#8B5CF6",
                    }}
                  />
                </div>
                {isGated ? (
                  <Link href="/console/billing" className="text-xs font-semibold hover:underline text-amber-warn">
                    Add payment method →
                  </Link>
                ) : (
                  <p className="text-xs text-dim-zinc">
                    {promptsResetsAt ? `Resets ${promptsResetsAt}` : "Rolling 7-day window"}
                  </p>
                )}
              </div>

              {/* API Calls Card */}
              <div className="console-card rounded-xl p-5">
                <span className="text-xs font-semibold uppercase text-muted-zinc">API Calls (Month)</span>
                <p className="text-2xl font-bold text-white mt-3 mb-1 font-mono">
                  {apiCalls != null ? apiCalls.toLocaleString() : "—"}
                </p>
                <p className="text-xs text-dim-zinc">Rate limit: {rateLimit}/min</p>
              </div>

              {/* Keys Card */}
              <div className="console-card rounded-xl p-5">
                <span className="text-xs font-semibold uppercase text-muted-zinc">API Keys</span>
                <p className="text-2xl font-bold text-white mt-3 mb-1 font-mono">{keyCount}</p>
                <p className="text-xs text-dim-zinc">
                  Active keys · <Link href="/console/api-keys" className="hover:underline text-purple-bold">Manage →</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fee Schedule */}
      {!!billing?.your_fees && (
        <div className="mb-8 stagger-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4 text-dim-zinc">Your Fee Schedule</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "LLM Markup", value: (billing.your_fees as Record<string, string>).llm_markup },
              { label: "Maker Fee", value: (billing.your_fees as Record<string, string>).maker_fee },
              { label: "Taker Fee", value: (billing.your_fees as Record<string, string>).taker_fee },
            ].map((fee) => (
              <div key={fee.label} className="console-panel rounded-lg p-4">
                <p className="text-[10px] uppercase font-semibold mb-1 text-dim-zinc">{fee.label}</p>
                <p className="text-lg font-mono font-bold text-purple">{fee.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="stagger-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4 text-dim-zinc">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Launch Terminal — Hero Card */}
          <Link href="/dashboard" className="group console-card console-card-interactive rounded-xl p-6 md:col-span-1"
            style={{ background: "linear-gradient(135deg, rgba(0,255,136,0.04), rgba(0,229,255,0.04))", border: "1px solid rgba(0,255,136,0.15)" }}>
            <div className="text-2xl mb-3 text-green-accent"><Play size={24} /></div>
            <p className="text-sm font-semibold group-hover:text-green-300 transition mb-1 text-green-accent">Launch Terminal</p>
            <p className="text-xs text-muted-zinc">Open the trading dashboard</p>
            <span className="inline-block mt-3 text-xs text-dim-zinc">↗</span>
          </Link>

          <Link href="/console/api-keys" className="group console-card console-card-interactive rounded-xl p-6">
            <div className="text-2xl mb-3 text-purple"><KeyRound size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition mb-1">Create an API Key</p>
            <p className="text-xs text-muted-zinc">Start integrating with our API</p>
            <span className="inline-block mt-3 text-xs text-dim-zinc">↗</span>
          </Link>

          <Link href="/console/playground" className="group console-card console-card-interactive rounded-xl p-6">
            <div className="text-2xl mb-3 text-purple"><Zap size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition mb-1">Open Playground</p>
            <p className="text-xs text-muted-zinc">Test tools and LLM chat interactively</p>
            <span className="inline-block mt-3 text-xs text-dim-zinc">↗</span>
          </Link>

          <Link href="/console/tools" className="group console-card console-card-interactive rounded-xl p-6">
            <div className="text-2xl mb-3 text-purple"><Wrench size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition mb-1">Browse Tools</p>
            <p className="text-xs text-muted-zinc">Explore 69 available API tools</p>
            <span className="inline-block mt-3 text-xs text-dim-zinc">↗</span>
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <a href="https://api.hyper-sentinel.com/docs" target="_blank" className="group console-panel rounded-xl p-6 transition-all hover:border-green-500/20">
            <div className="text-2xl mb-3 text-muted-zinc"><BookOpen size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-green-300 transition mb-1">View Documentation</p>
            <p className="text-xs text-muted-zinc">API reference and guides</p>
          </a>

          <a href="https://pypi.org/project/hyper-sentinel" target="_blank" className="group console-panel rounded-xl p-6 transition-all hover:border-green-500/20">
            <div className="text-2xl mb-3 text-muted-zinc"><Package size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-green-300 transition mb-1">Python SDK</p>
            <p className="text-xs font-mono text-muted-zinc">pip install hyper-sentinel</p>
          </a>

          <Link href="/console/billing" className="group console-panel rounded-xl p-6 transition-all hover:border-yellow-500/20">
            <div className="text-2xl mb-3 text-muted-zinc"><CreditCard size={24} /></div>
            <p className="text-sm font-semibold text-white group-hover:text-yellow-300 transition mb-1">Manage Billing</p>
            <p className="text-xs text-muted-zinc">Subscriptions and invoices</p>
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="console-panel mt-10 rounded-xl p-6 stagger-5">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Start</h3>
        <div className="rounded-lg p-4 font-mono text-xs leading-relaxed" style={{ background: "#0A0A0B", color: "#A1A1AA" }}>
          <p className="text-dim-zinc"># Install the SDK</p>
          <p><span className="text-green-accent">pip install</span> hyper-sentinel</p>
          <br />
          <p className="text-dim-zinc"># Use your API key</p>
          <p><span className="text-purple-bold">from</span> hyper_sentinel <span className="text-purple-bold">import</span> Sentinel</p>
          <p>client = Sentinel(api_key=<span className="text-amber">&quot;sk-sentinel-xxx&quot;</span>)</p>
          <p>result = client.chat(<span className="text-amber">&quot;What&apos;s the price of BTC?&quot;</span>)</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t flex items-center justify-between text-xs stagger-6 console-divider text-slate">
        <span>Sentinel Labs LLC · 2026</span>
        <div className="flex gap-4">
          <a href="https://api.hyper-sentinel.com/docs" target="_blank" className="hover:text-white transition">API Docs ↗</a>
          <a href="https://github.com/hyper-sentinel" target="_blank" className="hover:text-white transition">GitHub ↗</a>
          <a href="https://pypi.org/project/hyper-sentinel" target="_blank" className="hover:text-white transition">PyPI ↗</a>
        </div>
      </footer>
    </div>
  );
}
