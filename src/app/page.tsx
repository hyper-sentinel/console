"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
  Zap, Shield, Brain, BarChart3, Globe, Lock,
  ChevronRight, Terminal, Layers, Cpu, ArrowRight,
  Wallet, TrendingUp, MessageSquare, Database,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "5 LLM Providers",
    desc: "Claude, GPT, Gemini, Grok, Ollama. Your AI subscription is your identity.",
    color: "var(--accent-purple)",
  },
  {
    icon: Terminal,
    title: "62+ Tools",
    desc: "Market data, trading, sentiment, macro, social — all through one API.",
    color: "var(--accent-green)",
  },
  {
    icon: Lock,
    title: "Encrypted Vault",
    desc: "Zero-trust AES-256-GCM encryption. We never see your exchange keys.",
    color: "var(--accent-cyan)",
  },
  {
    icon: TrendingUp,
    title: "Multi-Venue Trading",
    desc: "Hyperliquid perps, Aster DEX futures, Polymarket predictions — unified.",
    color: "var(--accent-green)",
  },
  {
    icon: Layers,
    title: "Agent Swarm",
    desc: "Solo agent or 5-agent team. Analyst, Trader, Risk Manager — all coordinated.",
    color: "var(--accent-purple)",
  },
  {
    icon: BarChart3,
    title: "Real-Time Intelligence",
    desc: "News sentiment, trending tokens, X search, Telegram monitoring — 24/7.",
    color: "var(--accent-cyan)",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    desc: "Pay-as-you-go fees",
    color: "var(--accent-green)",
    features: [
      "300 req/min rate limit",
      "40% LLM markup",
      "0.10% maker / 0.07% taker",
      "1 API key",
      "All 62+ tools",
      "Encrypted vault",
    ],
    cta: "Get Started",
    href: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: "$100",
    period: "/mo",
    desc: "For serious traders",
    color: "var(--accent-purple)",
    features: [
      "1,000 req/min rate limit",
      "20% LLM markup",
      "0.06% maker / 0.04% taker",
      "10 API keys",
      "Swarm + Team modes",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    href: "/signup",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$1,000",
    period: "/mo",
    desc: "Unlimited scale",
    color: "var(--accent-yellow)",
    features: [
      "Unlimited rate limit",
      "10% LLM markup",
      "0.02% maker / 0.01% taker",
      "1,000 API keys",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "/signup",
    featured: false,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // If already logged in, offer console access via CTA (don't auto-redirect)
  const dashboardLink = user ? "/console" : "/login";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ── Nav ── */}
      <nav className="px-8 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-cyan))" }}>
            <Zap size={16} color="#000" strokeWidth={3} />
          </div>
          <span className="text-lg font-bold tracking-tight">Sentinel</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://api.hyper-sentinel.com/docs" target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>
            Docs
          </a>
          <a href="https://pypi.org/project/hyper-sentinel" target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>
            SDK
          </a>
          <a href="https://github.com/hyper-sentinel" target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>
            GitHub
          </a>
          {user ? (
            <Link href="/console" className="btn-primary !py-2 !px-5 !text-sm">
              Console <ChevronRight size={14} />
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium" style={{ color: "var(--accent-green)" }}>
                Sign In
              </Link>
              <Link href="/signup" className="btn-primary !py-2 !px-5 !text-sm">
                Get API Key
              </Link>
            </div>
          )}
        </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-8 pt-24 pb-20 text-center overflow-hidden">
        <div className="max-w-6xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-[0.07] pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--accent-green) 0%, transparent 70%)" }} />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-8 animate-fade-in"
            style={{ background: "rgba(0, 255, 136, 0.06)", border: "1px solid rgba(0, 255, 136, 0.15)", color: "var(--accent-green)" }}>
            <Globe size={12} />
            Web4 — AI-Native Trading Infrastructure
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-in">
            The First Web4{" "}
            <span className="gradient-text">Trading Terminal</span>
          </h1>

          <p className="text-lg mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-delay" style={{ color: "var(--text-secondary)" }}>
            Your AI subscription is your identity. 62+ tools across Hyperliquid, Aster DEX, and Polymarket —
            all through one API key. AI thinks. Blockchain executes. You direct.
          </p>

          <div className="flex items-center justify-center gap-4 animate-fade-in-delay-2">
            <Link href={dashboardLink} className="btn-primary !text-base !py-3.5 !px-8">
              <Cpu size={18} className="mr-2" />
              Launch Terminal
            </Link>
            <a
              href="https://api.hyper-sentinel.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary !text-base !py-3.5 !px-8"
            >
              View API Docs
              <ArrowRight size={16} className="ml-2" />
            </a>
          </div>

          {/* Quick SDK snippet */}
          <div className="mt-16 max-w-lg mx-auto rounded-xl p-5 text-left font-mono text-sm leading-relaxed animate-fade-in-delay-2"
            style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
              <Terminal size={12} />
              Quick Start
            </div>
            <p style={{ color: "var(--text-dim)" }}># Install</p>
            <p><span style={{ color: "var(--accent-green)" }}>pip install</span> hyper-sentinel</p>
            <br />
            <p style={{ color: "var(--text-dim)" }}># Trade</p>
            <p><span style={{ color: "var(--accent-purple)" }}>from</span> hyper_sentinel <span style={{ color: "var(--accent-purple)" }}>import</span> Sentinel</p>
            <p>s = Sentinel(api_key=<span style={{ color: "var(--accent-yellow)" }}>&quot;sk-sentinel-xxx&quot;</span>)</p>
            <p>s.trade.hl_order(<span style={{ color: "var(--accent-yellow)" }}>&quot;BTC&quot;</span>, <span style={{ color: "var(--accent-yellow)" }}>&quot;buy&quot;</span>, <span style={{ color: "var(--accent-cyan)" }}>100</span>)</p>
          </div>
        </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-8 py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything in one API</h2>
            <p style={{ color: "var(--text-secondary)" }}>One key. Every exchange. Every chain. Every market.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card group">
                <f.icon size={24} style={{ color: f.color }} className="mb-4" />
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-8 py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Web4 Auth Stack</h2>
            <p style={{ color: "var(--text-secondary)" }}>Your AI key is your identity. No passwords. No wallets. Just paste and go.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Brain, title: "Sign in with AI", desc: "Paste your Claude, GPT, Gemini, or Grok API key. You're instantly authenticated.", color: "var(--accent-purple)" },
              { step: "02", icon: Wallet, title: "Connect exchanges", desc: "Add your Hyperliquid, Aster, Polymarket keys — encrypted in your vault. We never see them.", color: "var(--accent-cyan)" },
              { step: "03", icon: Cpu, title: "Deploy your agent", desc: "62+ tools monitor markets, execute trades, read sentiment — 24/7, within your guardrails.", color: "var(--accent-green)" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="text-xs font-mono font-bold mb-4" style={{ color: s.color }}>{s.step}</div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
                  <s.icon size={24} style={{ color: s.color }} />
                </div>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-8 py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Simple, transparent pricing</h2>
            <p style={{ color: "var(--text-secondary)" }}>Start free. Scale when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card ${plan.featured ? "featured" : ""}`}
              >
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: plan.color }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm" style={{ color: "var(--text-dim)" }}>{plan.period}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <Shield size={14} style={{ color: plan.color }} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={plan.featured ? "btn-primary w-full" : "btn-secondary w-full"}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Venues ── */}
      <section className="px-8 py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono uppercase tracking-wider mb-6" style={{ color: "var(--text-dim)" }}>
            Supported Execution Venues
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {[
              { name: "Hyperliquid", icon: Zap, color: "var(--accent-cyan)" },
              { name: "Aster DEX", icon: Database, color: "var(--accent-purple)" },
              { name: "Polymarket", icon: BarChart3, color: "var(--accent-yellow)" },
              { name: "Telegram", icon: MessageSquare, color: "var(--accent-blue)" },
              { name: "Discord", icon: MessageSquare, color: "var(--accent-purple)" },
            ].map((v) => (
              <div key={v.name} className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-dim)" }}>
                <v.icon size={16} style={{ color: v.color }} />
                {v.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 py-8 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs" style={{ color: "var(--text-dim)" }}>
          <span>Sentinel Labs LLC · 2026</span>
          <div className="flex gap-6">
            <a href="https://api.hyper-sentinel.com/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">API Docs</a>
            <a href="https://pypi.org/project/hyper-sentinel" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">PyPI</a>
            <a href="https://github.com/hyper-sentinel" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
