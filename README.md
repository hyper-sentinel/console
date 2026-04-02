# Sentinel Developer Console

> **console.hyper-sentinel.com** — The command center for the Sentinel API platform.
>
> _Soli Deo Gloria_

---

## What Is This?

This is **Web4** — the convergence of AI agents, crypto infrastructure, and zero-trust developer tooling into a unified API platform.

Sentinel gives developers a single API key to access:
- **62+ tools** — crypto prices, trading, macro economics, social intelligence
- **Multi-venue trading** — Hyperliquid, Aster DEX, Polymarket
- **LLM arbitrage** — bring your own AI key (Claude, GPT, Gemini, Grok)
- **Real-time intelligence** — news, sentiment, Telegram, Discord, X

```
User Journey:
1. Visit console.hyper-sentinel.com
2. Sign in with your AI provider key
3. Generate sk-sentinel-xxx API key
4. pip install hyper-sentinel → build anything
```

## The Stack

| Layer | Tech | URL |
|-------|------|-----|
| **Console** | Next.js 16, React 19, Tailwind 4, TypeScript | `console.hyper-sentinel.com` |
| **Go Gateway** | Go + Chi, auth/billing/proxy, Cloud Run | `api.hyper-sentinel.com` |
| **Python Engine** | FastAPI, 62 tools, LLM agent | Proxied through Go |
| **SDK** | Python, PyPI | `pip install hyper-sentinel` |

```
Browser → Go Gateway (Cloud Run) → Python Engine → Exchange APIs
              ↓
       Auth + Billing + Fee Tracking
```

## Console Pages

| Route | Purpose |
|-------|---------|
| `/console` | Dashboard — usage snapshot, quick actions, getting started |
| `/console/api-keys` | Create, list, revoke `sk-sentinel-xxx` API keys |
| `/console/playground` | Interactive LLM chat with SSE streaming + tool use |
| `/console/tools` | Browse all 62+ tools by category with search/filter |
| `/console/usage` | 30-day usage chart, rate limits, fee schedule |
| `/console/billing` | Free / Pro ($100) / Enterprise ($1K) plan management |
| `/console/settings` | Account info, AI provider key vault, session management |

## Revenue Model

| Tier | Monthly | LLM Markup | Maker/Taker | Rate Limit |
|------|---------|------------|-------------|------------|
| **Free** | $0 | 40% | 0.10% / 0.07% | 300/min |
| **Pro** | $100 | 15% | 0.04% / 0.03% | 1,000/min |
| **Enterprise** | $1,000 | 5% | 0.02% / 0.01% | 5,000/min |

## Zero-Trust Architecture

- **BYOK (Bring Your Own Key)** — AI provider keys are stored locally in the browser, never on our servers
- **Secret Recovery Key** — Encrypted config vault with one-time recovery passphrase (coming soon)
- **API Key Auth** — `sk-sentinel-xxx` keys for programmatic access
- **JWT Sessions** — Short-lived tokens for console authentication

## Quick Start

```bash
# Install the SDK
pip install hyper-sentinel

# Use your API key
from hyper_sentinel import Sentinel
client = Sentinel(api_key="sk-sentinel-xxx")

# Chat with tools
result = client.chat("What's the price of BTC?")

# Call any tool directly
price = client.call("get_crypto_price", coin_id="bitcoin")

# Place a trade
client.call("place_hl_order", coin="BTC", side="buy", size=0.01)
```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:3000

# Build for production
npx next build

# Deploy
netlify deploy --prod --dir=.next
```

### Environment
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.hyper-sentinel.com
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Root router → /console or /login
│   ├── login/page.tsx              # BYOK authentication
│   ├── console/
│   │   ├── layout.tsx              # Sidebar + top bar layout
│   │   ├── page.tsx                # Dashboard home
│   │   ├── api-keys/page.tsx       # API key management
│   │   ├── playground/page.tsx     # LLM chat + tool testing
│   │   ├── tools/page.tsx          # Tool browser (62+)
│   │   ├── usage/page.tsx          # Usage analytics
│   │   ├── billing/page.tsx        # Plan management + Stripe
│   │   └── settings/page.tsx       # Account + provider keys
│   └── globals.css                 # Design system tokens
├── lib/
│   ├── api.ts                      # SentinelAPI client (80+ methods)
│   ├── auth.tsx                    # AuthContext + BYOK login
│   ├── hooks.ts                    # React Query hooks
│   └── store.ts                    # Zustand layout persistence
└── components/
    ├── Providers.tsx               # React Query + Auth
    ├── AuthGuard.tsx               # Route protection
    └── ...
```

## Ecosystem

| Project | Description | Links |
|---------|-------------|-------|
| **sentinel-sdk** | Python SDK on PyPI | [PyPI](https://pypi.org/project/hyper-sentinel) · [GitHub](https://github.com/hyper-sentinel/sentinel-sdk) |
| **hyper-sentinel-go** | Go API Gateway on Cloud Run | [GitHub](https://github.com/hyper-sentinel/hyper-sentinel-go) |
| **hyper-sentinel** | Python Engine (62 tools) | [GitHub](https://github.com/hyper-sentinel/hyper-sentinel) |
| **Console** | This repo — Developer Console | [Live](https://console.hyper-sentinel.com) |

## Design

- **Theme:** Dark only — `#0A0A0B` base
- **Fonts:** Inter (UI) + JetBrains Mono (code/prices)
- **Accent:** Purple `#8B5CF6` (primary), Green `#00FF88` (success), Red `#FF4444` (error)
- **Modeled after:** Anthropic Console, xAI Console, Google AI Studio

---

**Sentinel Labs LLC** · 2026

*This is the way.*
