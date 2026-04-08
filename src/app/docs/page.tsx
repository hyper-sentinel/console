"use client";

import Link from "next/link";

// ── Section data ──────────────────────────────────────────────

const SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    content: [
      {
        heading: "What is Sentinel?",
        text: "Sentinel is an autonomous AI trading terminal that unifies Hyperliquid, Aster DEX, and Polymarket under one interface. Bring your own LLM key (Claude, GPT, Gemini, Grok) and the AI agent executes trades using 62+ backend tools.",
      },
      {
        heading: "Quick Start",
        code: `# Web App
1. Go to hyper-sentinel.com/login
2. Enter your LLM API key (Gemini, Claude, GPT, or Grok)
3. You're in — start chatting with the Copilot

# Python SDK
$ pip install hyper-sentinel
$ sentinel
> What's BTC at?
BTC $66,492 (-2.3%) · Vol $30.2B`,
      },
    ],
  },
  {
    id: "auth",
    title: "Authentication",
    content: [
      {
        heading: "Web4 Authentication",
        text: "Sentinel uses a zero-knowledge authentication model. Your AI key IS your identity. No email, no password, no OAuth. When you log in with your LLM key, the Go gateway generates a Sentinel API key and a secret passphrase. The passphrase encrypts your local vault where exchange credentials are stored.",
      },
      {
        heading: "Auth Flow",
        code: `POST /auth/ai-key
Body: { "ai_key": "sk-ant-...", "provider": "anthropic" }

Response: {
  "token": "eyJhbG...",        // JWT for session
  "api_key": "sent-live-xxx",  // Your Sentinel API key
  "secret": "correct-horse-..." // Vault encryption key
}`,
      },
      {
        heading: "Security Model",
        text: "Exchange credentials (HL private keys, Aster API secrets) are encrypted client-side with AES-256-GCM using your secret passphrase. The encrypted vault is stored in localStorage. Sentinel servers never see your exchange keys.",
      },
    ],
  },
  {
    id: "copilot",
    title: "Copilot",
    content: [
      {
        heading: "AI Chat Interface",
        text: "The Copilot is the primary interface. It routes queries to your chosen LLM provider, automatically calling backend tools when needed. Tool results are fed back to the LLM in a multi-round loop (up to 5 rounds).",
      },
      {
        heading: "Commands",
        code: `add hl          Configure Hyperliquid
add aster       Configure Aster DEX
add polymarket  Configure Polymarket
add fred        FRED economic data
add y2          Y2 news intelligence
add elfa        Elfa AI social mentions
status          Show all connections
help            All commands
clear           Clear chat history`,
      },
      {
        heading: "Example Queries",
        code: `> What's BTC price?
> Long 0.01 BTC on Hyperliquid
> Show my positions
> Analyze ETH macro outlook
> What are the top trending tokens?
> Search Polymarket for "Bitcoin ETF"`,
      },
    ],
  },
  {
    id: "tools",
    title: "Tools (62+)",
    content: [
      {
        heading: "Trading Tools",
        code: `place_hl_order      — Place market/limit on Hyperliquid
close_hl_position   — Close entire HL position
cancel_hl_order     — Cancel order by OID
aster_place_order   — Place order on Aster DEX
aster_set_leverage  — Set leverage (1-125x)
buy_polymarket      — Buy prediction market shares
sell_polymarket     — Sell shares
place_polymarket_limit — Limit order on Polymarket`,
      },
      {
        heading: "Market Data",
        code: `get_crypto_price    — Price, 24h change, volume, mcap
get_crypto_top_n    — Top N coins by market cap
get_crypto_chart    — OHLCV candlestick data
get_stock_price     — Stock/ETF price data
get_hl_orderbook    — Hyperliquid orderbook
get_hl_positions    — Open HL positions
aster_klines        — Aster candlestick data
aster_ticker        — 24h ticker stats`,
      },
      {
        heading: "Intelligence",
        code: `get_news_recap         — AI news summary
get_news_sentiment     — Sentiment analysis
get_trending_tokens    — Trending tokens (Elfa)
get_top_mentions       — Top social mentions
search_mentions        — Search mentions by query
get_trending_narratives — Hot narratives
search_x               — X/Twitter search`,
      },
      {
        heading: "Macro Economics",
        code: `get_economic_dashboard — GDP, CPI, Fed rate, unemployment, VIX
get_fred_series        — Specific FRED series data
search_fred            — Search FRED datasets`,
      },
    ],
  },
  {
    id: "sdk",
    title: "Python SDK",
    content: [
      {
        heading: "Installation",
        code: `pip install hyper-sentinel`,
      },
      {
        heading: "Interactive Terminal",
        code: `$ sentinel

Sentinel v0.3.16 · 62 tools · Online
> What's the BTC price?
BTC $66,857.00 (-0.85%) · Vol $28.4B · MCap $1.32T

> Long 0.01 BTC on Hyperliquid  
Filled: BUY 0.01 BTC @ $66,857
Builder fee: $0.67

> Show my positions
┌─────────┬──────┬────────┬──────────┬─────────┐
│ Symbol  │ Side │ Size   │ Entry    │ PnL     │
├─────────┼──────┼────────┼──────────┼─────────┤
│ BTC     │ Long │ 0.01   │ $66,857  │ +$12.30 │
└─────────┴──────┴────────┴──────────┴─────────┘`,
      },
    ],
  },
  {
    id: "api",
    title: "REST API",
    content: [
      {
        heading: "Base URL",
        code: `https://api.hyper-sentinel.com`,
      },
      {
        heading: "Authentication",
        code: `# All authenticated requests use Bearer token
Authorization: Bearer <jwt_token>

# Or API key header
X-API-Key: sent-live-xxxxxxxxxxxx`,
      },
      {
        heading: "Key Endpoints",
        code: `POST   /auth/ai-key           Auth with LLM key
POST   /auth/keys             Generate API key
GET    /api/v1/tools          List all 62 tools
POST   /api/v1/tools/{name}   Call a specific tool
POST   /api/v1/llm/chat       AI chat (SSE streaming)
GET    /api/v1/billing/status  Billing tier info
GET    /api/v1/billing/usage   Usage statistics
POST   /api/v1/billing/subscribe  Stripe checkout`,
      },
      {
        heading: "Example: Get BTC Price",
        code: `curl -X POST https://api.hyper-sentinel.com/api/v1/tools/get_crypto_price \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"coin_id": "bitcoin"}'

# Response:
{
  "price": 66857.0,
  "change_24h": -0.85,
  "volume_24h": 28400000000,
  "market_cap": 1320000000000
}`,
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing",
    content: [
      {
        heading: "Tiers",
        text: "All tiers get access to all 62+ tools. Revenue comes from usage, not feature gates.",
      },
    ],
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    features: ["All 62+ tools", "40% LLM markup", "0.10% maker / 0.07% taker", "300 req/min"],
    accent: "var(--text-dim)",
  },
  {
    name: "Pro",
    price: "$100",
    period: "/mo",
    features: ["All 62+ tools", "20% LLM markup", "0.06% maker / 0.04% taker", "1,000 req/min", "Priority support"],
    accent: "var(--accent-green)",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$1,000",
    period: "/mo",
    features: ["All 62+ tools", "10% LLM markup", "0.02% maker / 0.01% taker", "Unlimited requests", "Dedicated support"],
    accent: "var(--accent-purple)",
  },
];

// ── Component ─────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(10,10,10,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold" style={{ color: "var(--accent-green)" }}>
            Sentinel
          </Link>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,255,136,0.08)", color: "var(--accent-green)", border: "1px solid rgba(0,255,136,0.15)" }}>
            DOCS
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
            Terminal
          </Link>
          <Link href="/console" className="text-xs transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
            Console
          </Link>
          <a
            href="https://api.hyper-sentinel.com/api/v1/tools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            API
          </a>
        </div>
      </nav>

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar TOC */}
        <aside
          className="hidden lg:block w-52 shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-auto py-8 pr-6"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
            Documentation
          </p>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-xs py-1.5 px-2 rounded transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 py-8 px-6 lg:px-12 space-y-16">
          {/* Hero */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight">
              Sentinel Documentation
            </h1>
            <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
              Everything you need to build with the Sentinel trading terminal.
              62+ tools, 3 venues, 4 LLM providers, one API.
            </p>
            <div className="flex gap-2 pt-2">
              <Link
                href="/login"
                className="text-[11px] font-semibold px-4 py-2 rounded-lg transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.1))",
                  border: "1px solid rgba(0,255,136,0.3)",
                  color: "var(--accent-green)",
                }}
              >
                Get Started
              </Link>
              <a
                href="https://pypi.org/project/hyper-sentinel/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold px-4 py-2 rounded-lg transition-all hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                pip install hyper-sentinel
              </a>
            </div>
          </div>

          {/* Sections */}
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-16">
              <h2
                className="text-xl font-bold mb-6 pb-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {section.title}
              </h2>
              <div className="space-y-8">
                {section.content.map((block, i) => (
                  <div key={i}>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--accent-green)" }}>
                      {block.heading}
                    </h3>
                    {block.text && (
                      <p className="text-xs leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
                        {block.text}
                      </p>
                    )}
                    {block.code && (
                      <pre
                        className="text-[11px] font-mono leading-relaxed p-4 rounded-lg overflow-x-auto mt-2"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {block.code}
                      </pre>
                    )}
                  </div>
                ))}

                {/* Pricing table */}
                {section.id === "pricing" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {PRICING_TIERS.map((tier) => (
                      <div
                        key={tier.name}
                        className="rounded-xl p-5 transition-all"
                        style={{
                          background: tier.highlight
                            ? "rgba(0,255,136,0.04)"
                            : "rgba(255,255,255,0.02)",
                          border: `1px solid ${tier.highlight ? "rgba(0,255,136,0.2)" : "var(--border)"}`,
                        }}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: tier.accent }}>
                          {tier.name}
                        </p>
                        <p className="text-2xl font-black mb-4">
                          {tier.price}
                          <span className="text-xs font-normal" style={{ color: "var(--text-dim)" }}>
                            {tier.period}
                          </span>
                        </p>
                        <ul className="space-y-1.5">
                          {tier.features.map((f, i) => (
                            <li key={i} className="text-[11px] flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                              <span className="text-[9px] mt-0.5" style={{ color: tier.accent }}>--</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}

          {/* Footer */}
          <footer className="pt-8 mt-8" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                Sentinel Labs LLC -- {new Date().getFullYear()}
              </p>
              <div className="flex gap-4">
                <a
                  href="https://github.com/hyper-sentinel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] transition-colors hover:opacity-80"
                  style={{ color: "var(--text-dim)" }}
                >
                  GitHub
                </a>
                <a
                  href="https://pypi.org/project/hyper-sentinel/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] transition-colors hover:opacity-80"
                  style={{ color: "var(--text-dim)" }}
                >
                  PyPI
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
