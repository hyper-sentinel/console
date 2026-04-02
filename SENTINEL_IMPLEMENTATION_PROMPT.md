# Sentinel Web4 Terminal — Implementation Prompt

> Give this to Claude Code operating on `/Users/morganm2max/Antigravity/webdev`

---

## Context

You are upgrading the **Sentinel Web4 Terminal** — a React/Next.js 16 web application that serves as the browser-based frontend for the Sentinel autonomous trading terminal.

### Backend: Go API Gateway (LIVE on Cloud Run)
```
https://sentinel-api-281199879392.us-south1.run.app
```

**Verified live endpoints:**
- `GET /health` → `{"backend":"ok","gateway":"sentinel-go","status":"ok"}`
- `GET /api/v1/tools` → Returns 58 tools with schemas
- `POST /api/v1/tools/{tool_name}` → Execute any tool

### 58 Available Tools (from live gateway)
**Free (no auth):**
- `get_crypto_price`, `get_crypto_top_n`, `search_crypto` (CoinGecko)
- `get_fred_series`, `search_fred`, `get_economic_dashboard` (FRED macro)
- `get_news_sentiment`, `get_news_recap`, `get_intelligence_reports`, `get_report_detail` (Y2)
- `get_trending_tokens`, `get_top_mentions`, `search_mentions`, `get_trending_narratives`, `get_token_news` (Elfa)
- `search_x` (X/Twitter search)

**Paid (auth required, X-API-Key header):**
- `get_hl_config`, `get_hl_account_info`, `get_hl_positions`, `get_hl_orderbook`, `get_hl_open_orders`, `place_hl_order`, `cancel_hl_order`, `close_hl_position` (Hyperliquid)
- `aster_diagnose`, `aster_ping`, `aster_ticker`, `aster_orderbook`, `aster_klines`, `aster_funding_rate`, `aster_exchange_info`, `aster_balance`, `aster_positions`, `aster_account_info`, `aster_place_order`, `aster_cancel_order`, `aster_cancel_all_orders`, `aster_open_orders`, `aster_set_leverage` (Aster DEX)
- `get_polymarket_markets`, `search_polymarket`, `get_polymarket_orderbook`, `get_polymarket_price`, `get_polymarket_positions`, `buy_polymarket`, `sell_polymarket`, `place_polymarket_limit`, `cancel_polymarket_order`, `cancel_all_polymarket_orders` (Polymarket)
- `tg_read_channel`, `tg_search_messages`, `tg_list_channels`, `tg_send_message` (Telegram)
- `discord_read_channel`, `discord_search_messages`, `discord_list_guilds`, `discord_list_channels`, `discord_send_message` (Discord)

**IMPORTANT:** DexScreener tools (`dex_trending`, `dex_new_pairs`, `dex_search_tokens`, etc.) do NOT exist on the Go gateway. The frontend references them but they're not available. Use `get_trending_tokens` (Elfa) and `get_crypto_top_n` (CoinGecko) instead for the LivePairsPane.

### Response Format
All tools return:
```json
{
  "status": "ok",
  "tool": "tool_name",
  "result": { ... },
  "meta": { "gateway": "sentinel-go", "latency_ms": 123, "tier": "free" }
}
```
Auth-required tools without valid key return:
```json
{
  "error": "Upgrade required",
  "message": "This tool requires a Paid ($49/mo) or Enterprise subscription.",
  "tier": "free",
  "tool": "tool_name",
  "upgrade": "/billing/checkout"
}
```

---

## Current Codebase State

### Tech Stack
- Next.js 16.2.1 + React 19.2.4 (App Router)
- TanStack React Query 5.95 (data fetching/caching)
- Zustand 5.0.12 (layout state, localStorage persistence)
- React Grid Layout 2.2.2 (draggable/resizable panes)
- Lightweight Charts 5.1 (TradingView candlesticks)
- Tailwind CSS 4 (dark terminal aesthetic)

### Architecture
```
src/
├── app/
│   ├── page.tsx              ← Landing page (BYOK auth + features grid)
│   ├── dashboard/page.tsx    ← Main terminal (React Grid Layout + 14 panes)
│   ├── layout.tsx            ← Root layout
│   └── globals.css           ← CSS vars + animations
├── panes/                    ← 14 pane components (ALL MOCK DATA)
│   ├── ChartPane.tsx         ← TradingView lightweight-charts (mock)
│   ├── CopilotPane.tsx       ← AI chat (setTimeout fake responses)
│   ├── OrderEntryPane.tsx    ← Place orders UI (no real submission)
│   ├── OrdersPane.tsx        ← Open orders + history (hardcoded arrays)
│   ├── PositionsPane.tsx     ← Positions table (hardcoded arrays)
│   ├── TradeFeedPane.tsx     ← Execution feed (mock streaming)
│   ├── WalletPane.tsx        ← Portfolio balances (hardcoded tokens)
│   ├── LivePairsPane.tsx     ← Trending tokens (hardcoded TRENDING array)
│   ├── MacroPane.tsx         ← FRED economic data (mock)
│   ├── IntelPane.tsx         ← Y2/Elfa news feed (mock)
│   ├── DexTradingPane.tsx    ← Paste CA → swap (UI only)
│   ├── TelegramPane.tsx      ← Channel monitoring (mock)
│   ├── DiscordPane.tsx       ← Guild browser (mock)
│   └── StrategyPane.tsx      ← Algo strategy toggles (mock)
├── components/
│   ├── Providers.tsx         ← React Query + Auth providers
│   ├── AuthGuard.tsx         ← Auth-gated route wrapper
│   ├── PaneGrid.tsx          ← React Grid Layout wrapper
│   ├── PaneShell.tsx         ← Pane header + lazy loading
│   ├── AppLayout.tsx         ← Main app layout
│   ├── Sidebar.tsx           ← Navigation sidebar
│   └── TopBar.tsx            ← Top navigation bar
└── lib/
    ├── api.ts                ← SentinelAPI class (80+ methods, points to localhost:8000)
    ├── hooks.ts              ← React Query hooks (useToolQuery, useDexTrending, etc.)
    ├── auth.tsx              ← AuthContext (BYOK login, sessionStorage)
    ├── store.ts              ← Zustand layout state
    └── pane-registry.ts      ← 14 pane configs + layout presets
```

### What Already Exists (and works)
- `src/lib/api.ts` — Full SentinelAPI class with `.call()` method and 80+ typed wrappers
- `src/lib/hooks.ts` — React Query hooks (`useToolQuery`, `useDexTrending`, `useHLPositions`, etc.) with refetch intervals
- `src/lib/auth.tsx` — BYOK auth with fallback local validation
- Dashboard with React Grid Layout, 4 layout presets, save/load custom layouts
- Dark terminal CSS with all design tokens defined

### What's Broken
1. **`api.ts` line 10** → points to `http://localhost:8000`, needs to be `https://sentinel-api-281199879392.us-south1.run.app`
2. **`hooks.ts` line 113** → also has `http://localhost:8000` hardcoded for legacy hooks
3. **`auth.tsx` line 33** → also has `http://localhost:8000`
4. **All 14 panes** use hardcoded mock data arrays instead of the React Query hooks from `hooks.ts`
5. **CopilotPane** uses `setTimeout` with random canned responses instead of real LLM chat
6. **Frontend references DexScreener tools** (`dex_trending`, `dex_new_pairs`) that don't exist on the Go gateway

---

## Tasks — Priority Order

### Phase 1: Wire Live Data (DO THIS NOW)

#### 1.1 Fix API Base URL
In all three files, change `http://localhost:8000` to use the env var with correct default:
```
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sentinel-api-281199879392.us-south1.run.app";
```
Files: `src/lib/api.ts:10`, `src/lib/hooks.ts:113`, `src/lib/auth.tsx:33`

Also set the env var in `.env.local`:
```
NEXT_PUBLIC_API_URL=https://sentinel-api-281199879392.us-south1.run.app
```

#### 1.2 Fix Hook Tool Names
Update hooks to match actual Go gateway tool names:
- `useDexTrending()` → should call `get_trending_tokens` (Elfa) instead of `dex_trending`
- `useDexSearch()` → should call `search_crypto` (CoinGecko) instead of `dex_search_tokens`
- Add new hooks for tools that exist but aren't hooked up yet

#### 1.3 Wire LivePairsPane (Market Data)
Replace the hardcoded `TRENDING` array with `useToolQuery("get_trending_tokens")` and/or `useToolQuery("get_crypto_top_n", { n: 20 })`. Show loading skeleton while fetching. Handle errors gracefully.

#### 1.4 Wire PositionsPane (Trading)
Replace the hardcoded `POSITIONS` array. Use `useHLPositions()` and `useAsterPositions()` hooks. Merge results into unified table. Handle the "Upgrade required" response gracefully — show a tier gate message for free users.

#### 1.5 Wire OrdersPane (Trading)
Replace `OPEN_ORDERS` and `TRADES` arrays. Use `useOpenOrders()` and `useTradeHistory()`. Wire the cancel button to `api.cancelHLOrder()`. Handle tier gating.

#### 1.6 Wire CopilotPane (AI Chat)
Replace the `setTimeout` fake response with a real API call. The Go gateway should have an LLM chat endpoint. If not available yet, use `POST /api/v1/tools/{tool_name}` with an appropriate tool. The copilot should:
- Send the user's message + conversation history
- Stream or display the response
- Support Solo/Swarm/Team modes (at minimum Solo working)

#### 1.7 Wire WalletPane
Replace the hardcoded `TOKENS` array with `useToolQuery("wallet_balance")` and `useToolQuery("wallet_tokens")`. Show real SOL + ETH balances from the fee wallets.

#### 1.8 Wire MacroPane
Use `useToolQuery("get_economic_dashboard")` for FRED data (GDP, CPI, Fed rate, unemployment, VIX).

#### 1.9 Wire IntelPane
Use `useToolQuery("get_news_sentiment")` for Y2 intelligence and `useToolQuery("get_trending_tokens")` for Elfa social data.

#### 1.10 Wire Remaining Panes
- TelegramPane → `useToolQuery("tg_list_channels")`, `useToolQuery("tg_read_channel")`
- DiscordPane → `useToolQuery("discord_list_guilds")`, `useToolQuery("discord_list_channels")`, `useToolQuery("discord_read_channel")`
- StrategyPane → placeholder until strategy tools are wired
- ChartPane → use `get_crypto_price` for price data, or `aster_klines` for candlestick data

### Phase 2: Error Handling & Tier Gating

#### 2.1 Graceful Degradation
- Free tools (market data, macro, news) should work without auth
- Paid tools should show a clean "Upgrade to Pro" message, not a crash
- Network errors should show retry buttons, not blank panes

#### 2.2 Loading States
- Use Tailwind shimmer/skeleton animations (already defined in globals.css)
- Show loading skeletons matching the final layout shape
- No "placeholder images" — loading state or real data only

### Phase 3: Revenue Integration

Reference the revenue model:
- **HL Builder Fee (1 BPS)** — already wired in Go gateway, `builder` param in every order
- **Jupiter SOL Referral (50 BPS)** — `platformFeeBps` in swap quotes
- **LLM API Markup (20-40%)** — proxy through gateway, bill via Stripe

Fee wallets:
- SOL: `ArTFqh8v2pZUbiAc5dkva6zGDxzWd6YGs3zRqtDrF8oi` (Jupiter)
- ETH/EVM: `0x4047d682525C21831fCF95b49340FC7A74B4aA27` (HL, Aster, PM)

Ensure all order submission flows (OrderEntryPane, DexTradingPane) pass through the Go gateway which injects the builder/referral fees.

### Phase 4: Polish

- Ensure dark terminal aesthetic is consistent (use CSS vars from globals.css)
- Accent colors: Cyan (#00D4FF / #00e5ff), Neon Green (#00FF88 / #00ff88), Warning Orange (#FF8800)
- Micro-animations on data updates (number tickers, fade transitions)
- Responsive for desktop (primary) and tablet

---

## Design Vision: Web4 Terminal

This is NOT a normal dashboard. It's a **terminal-first, customizable trading cockpit**.

**Reference site:** https://www.hyper-sentinel.com (live waitlist page)
- Cyberpunk aesthetic: Orbitron + Rajdhani fonts, neon green/gold/purple accents
- Custom cursor with particle trails, animated lightning bolts, rotating ring animations
- "Forged in the trenches where markets and cyber create edge"
- Currently shows: TradingView Charts, DEX Swaps, Perps, Polymarket, AI Agent Swarm, DexScreener, TG+Discord, Algo Trading

The webapp should feel like a premium, hacker-aesthetic terminal that matches the branding on hyper-sentinel.com. Dark mode ONLY. Glassmorphism panels. Terminal font (JetBrains Mono). Real-time feel.

---

## Revenue Pipeline Context

```
Phase 1: Terminal (proof of concept, error testing) ← DONE
Phase 2: REST API (Go gateway — production-grade)   ← LIVE
Phase 3: Webapp (user-facing revenue)                ← THIS IS WHAT WE'RE BUILDING
Phase 4: SDK (developer beta)                        ← FUTURE
```

The webapp is the consumer product driving volume. Every trade through the webapp generates builder fees (HL), referral fees (Jupiter), and will eventually generate LLM markup revenue through the AI copilot.

---

## Key Constraints

1. **Next.js 16** — Read `node_modules/next/dist/docs/` before using any Next.js APIs. Breaking changes from your training data.
2. **React 19** — Use latest patterns (use client directive, Server Components where appropriate)
3. **No DexScreener tools on gateway** — Use Elfa (`get_trending_tokens`) and CoinGecko (`get_crypto_top_n`) instead
4. **Paid tools return upgrade message** — Handle this in the UI, don't let it crash
5. **Session-only auth** — sessionStorage, not localStorage for user credentials
6. **All panes must be lazy-loaded** — Already using React.lazy() + Suspense via PaneShell

---

## Deliverables

1. `.env.local` with `NEXT_PUBLIC_API_URL` pointing to live Go gateway
2. Fixed API base URL in `api.ts`, `hooks.ts`, `auth.tsx`
3. Fixed hook tool names to match actual gateway tools
4. All 14 panes wired to real API (replace every hardcoded mock array)
5. CopilotPane sending real queries and displaying responses
6. Graceful tier gating for paid tools
7. Loading skeletons for all panes
8. App builds and runs without errors (`npm run build`)
