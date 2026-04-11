"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
  Zap, Shield, Brain, BarChart3, Globe, Lock,
  ChevronRight, ChevronDown, Terminal, Layers, Cpu, ArrowRight,
  Wallet, TrendingUp, MessageSquare, Database,
  Menu, X,
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
    title: "Agent Swarm (Coming Soon)",
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
      "Swarm + Team modes (coming soon)",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [termExpanded, setTermExpanded] = useState(false);

  const dashboardLink = user ? "/console" : "/login";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ── Nav ── */}
      <nav className="px-4 sm:px-8 py-4 sm:py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-cyan))" }}>
              <Zap size={16} color="#000" strokeWidth={3} />
            </div>
            <span className="text-lg font-bold tracking-tight">Sentinel</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/docs" className="text-sm transition-colors hover:text-white" style={{ color: "var(--text-secondary)" }}>
              Docs
            </Link>
            <Link href="/docs#api" className="text-sm transition-colors hover:text-white" style={{ color: "var(--text-secondary)" }}>
              API Reference
            </Link>
            <a href="https://pypi.org/project/hyper-sentinel" target="_blank" rel="noopener noreferrer" className="text-sm transition-colors hover:text-white" style={{ color: "var(--text-secondary)" }}>
              SDK
            </a>
            <a href="https://github.com/hyper-sentinel/hyper-sentinel-sdk" target="_blank" rel="noopener noreferrer" className="text-sm transition-colors hover:text-white" style={{ color: "var(--text-secondary)" }}>
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t animate-slide-down" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-col gap-3 max-w-6xl mx-auto">
              <Link href="/docs" className="text-sm py-2 transition-colors" style={{ color: "var(--text-secondary)" }}>
                Docs
              </Link>
              <Link href="/docs#api" className="text-sm py-2 transition-colors" style={{ color: "var(--text-secondary)" }}>
                API Reference
              </Link>
              <a href="https://pypi.org/project/hyper-sentinel" target="_blank" rel="noopener noreferrer" className="text-sm py-2 transition-colors" style={{ color: "var(--text-secondary)" }}>
                SDK
              </a>
              <a href="https://github.com/hyper-sentinel/hyper-sentinel-sdk" target="_blank" rel="noopener noreferrer" className="text-sm py-2 transition-colors" style={{ color: "var(--text-secondary)" }}>
                GitHub
              </a>
              <div className="flex gap-3 pt-2">
                {user ? (
                  <Link href="/console" className="btn-primary !py-2.5 !px-6 !text-sm flex-1" onClick={() => setMobileMenuOpen(false)}>
                    Console <ChevronRight size={14} />
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="btn-secondary !py-2.5 !px-6 !text-sm flex-1" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                    <Link href="/signup" className="btn-primary !py-2.5 !px-6 !text-sm flex-1" onClick={() => setMobileMenuOpen(false)}>
                      Get API Key
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-4 sm:px-8 pt-10 sm:pt-14 pb-8 sm:pb-10 text-center overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] rounded-full opacity-[0.07] pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--accent-green) 0%, transparent 70%)" }} />

          <div className="relative max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4 animate-fade-in"
              style={{ background: "rgba(0, 255, 136, 0.06)", border: "1px solid rgba(0, 255, 136, 0.15)", color: "var(--accent-green)" }}>
              <Globe size={12} />
              Web4 — AI-Native Trading Infrastructure
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-3 animate-fade-in">
              The First Web4{" "}
              <span className="gradient-text">Trading Terminal</span>
            </h1>

            <p className="text-sm sm:text-base mb-5 max-w-2xl mx-auto leading-relaxed animate-fade-in-delay" style={{ color: "var(--text-secondary)" }}>
              Your AI subscription is your identity. 62+ tools across Hyperliquid, Aster DEX, and Polymarket —
              all through one API key. AI thinks. Blockchain executes. You direct.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-in-delay-2">
              <Link href={dashboardLink} className="btn-primary !text-base !py-3.5 !px-8 w-full sm:w-auto">
                <Cpu size={18} className="mr-2" />
                Launch Terminal
              </Link>
              <Link
                href="/docs"
                className="btn-secondary !text-base !py-3.5 !px-8 w-full sm:w-auto"
              >
                View API Docs
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>

            {/* Developer Preview Terminal */}
            <div className="mt-6 sm:mt-8 max-w-xl mx-auto rounded-xl text-left font-mono text-xs leading-relaxed animate-fade-in-delay-2 overflow-hidden"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                  {/* Terminal header bar */}
                  <button
                    onClick={() => setTermExpanded(!termExpanded)}
                    className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 text-[10px] uppercase tracking-wider cursor-pointer hover:bg-white/[0.02] transition-colors"
                    style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="flex items-center gap-2">
                      <Terminal size={12} />
                      Developer Preview
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide" style={{ background: "var(--accent-green)", color: "#000" }}>
                        BETA
                      </span>
                    </span>
                    {termExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {/* Terminal content */}
                  <div className="px-3 sm:px-4 py-3 space-y-0.5">
                    <p style={{ color: "var(--text-dim)" }}># Install &amp; launch</p>
                    <p><span style={{ color: "var(--accent-green)" }}>$</span> pip install hyper-sentinel</p>
                    <p><span style={{ color: "var(--accent-green)" }}>$</span> sentinel</p>

                    <p style={{ color: "var(--text-dim)", marginTop: "8px" }}># Authenticate with any AI key</p>
                    <p><span style={{ color: "var(--accent-cyan)" }}>&gt;</span> Paste your API key: <span style={{ color: "var(--text-dim)" }}>sk-ant-api03-****</span></p>
                    <p style={{ color: "var(--accent-green)" }}>Detected: Anthropic (Claude) · Tier: Free</p>

                    <p style={{ color: "var(--text-dim)", marginTop: "8px" }}># Trade with natural language</p>
                    <p><span style={{ color: "var(--accent-cyan)" }}>&gt;</span> Long 0.1 BTC 10x on Hyperliquid</p>
                    <p style={{ color: "var(--accent-green)" }}>Filled: BUY 0.1 BTC @ $68,241 · 10x Leverage</p>
                    <p style={{ color: "var(--text-dim)", fontSize: "10px" }}>Notional: $6,824.10 · Margin: $682.41 · Fee: $4.09</p>

                    {/* Expanded section */}
                    {termExpanded && (
                      <div className="animate-fade-in">
                        <p style={{ color: "var(--text-dim)", marginTop: "10px" }}># Check positions across all venues</p>
                        <p><span style={{ color: "var(--accent-cyan)" }}>&gt;</span> /positions</p>
                        <div className="mt-1 rounded-md px-2 py-1.5" style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}>
                          <p style={{ color: "var(--accent-cyan)", fontSize: "10px", marginBottom: "2px" }}>Hyperliquid Positions (1)</p>
                          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 text-[10px]">
                            <span style={{ color: "#e5e5e5" }}>BTC</span>
                            <span style={{ color: "var(--accent-green)" }}>LONG 0.1</span>
                            <span>Entry $68,241</span>
                            <span style={{ color: "var(--accent-green)" }}>+$142.30 (+2.08%)</span>
                          </div>
                        </div>

                        <p style={{ color: "var(--text-dim)", marginTop: "10px" }}># Market intelligence</p>
                        <p><span style={{ color: "var(--accent-cyan)" }}>&gt;</span> What&apos;s the macro outlook?</p>
                        <p style={{ color: "var(--text-secondary)" }}>Fed rate: 4.25% (hold) · CPI: 2.8% YoY · VIX: 16.2</p>
                        <p style={{ color: "var(--text-secondary)" }}>Crypto fear/greed: 72 (Greed) · BTC dominance: 58.4%</p>

                        <p style={{ color: "var(--text-dim)", marginTop: "10px" }}># Start algorithmic trading</p>
                        <p><span style={{ color: "var(--accent-cyan)" }}>&gt;</span> Run SMA crossover on ETH, $50 trades, 5m candles</p>
                        <p style={{ color: "var(--accent-purple)" }}>Strategy started: SMA Crossover (9/21)</p>
                        <p style={{ color: "var(--text-dim)", fontSize: "10px" }}>Symbol: ETH/USDT · Venue: Hyperliquid · Interval: 5m</p>
                        <p style={{ color: "var(--text-dim)", fontSize: "10px" }}>Trade size: $50 · Leverage: 3x · TP: 1.0% · SL: -2.0%</p>

                        <p style={{ color: "var(--text-dim)", marginTop: "10px" }}># 62+ tools available</p>
                        <p><span style={{ color: "var(--accent-cyan)" }}>&gt;</span> /tools</p>
                        <p style={{ color: "var(--text-secondary)", fontSize: "10px" }}>Trading (13) · Market Data (16) · Intelligence (11) · Macro (3) · Social (9) · Wallet (6) · Algo (5)</p>
                      </div>
                    )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-4 sm:px-8 py-10 sm:py-14 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Everything in one API</h2>
            <p style={{ color: "var(--text-secondary)" }}>One key. Every exchange. Every chain. Every market.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
      <section className="px-4 sm:px-8 py-14 sm:py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Web4 Auth Stack</h2>
            <p style={{ color: "var(--text-secondary)" }}>Your AI key is your identity. No passwords. No wallets. Just paste and go.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-8">
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
      <section className="px-4 sm:px-8 py-14 sm:py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Simple, transparent pricing</h2>
            <p style={{ color: "var(--text-secondary)" }}>Start free. Scale when you&apos;re ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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
                      <Shield size={14} style={{ color: plan.color, flexShrink: 0 }} />
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
      <section className="px-4 sm:px-8 py-12 sm:py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono uppercase tracking-wider mb-6" style={{ color: "var(--text-dim)" }}>
            Supported Execution Venues
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            {[
              { name: "Hyperliquid", icon: Zap, color: "var(--accent-cyan)" },
              { name: "Aster DEX", icon: Database, color: "var(--accent-purple)" },
              { name: "Polymarket", icon: BarChart3, color: "var(--accent-yellow)" },
              { name: "Telegram", icon: MessageSquare, color: "var(--accent-blue)" },
              { name: "Discord", icon: MessageSquare, color: "var(--accent-purple)" },
            ].map((v) => (
              <div key={v.name} className="flex items-center gap-2 text-xs sm:text-sm font-medium" style={{ color: "var(--text-dim)" }}>
                <v.icon size={16} style={{ color: v.color }} />
                {v.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-4 sm:px-8 py-6 sm:py-8 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: "var(--text-dim)" }}>
          <span>Sentinel Labs LLC · 2026</span>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-white transition">Docs</Link>
            <Link href="/docs#api" className="hover:text-white transition">API Reference</Link>
            <a href="https://pypi.org/project/hyper-sentinel" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">PyPI</a>
            <a href="https://github.com/hyper-sentinel/hyper-sentinel-sdk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
