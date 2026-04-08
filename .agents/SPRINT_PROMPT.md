# Claude Code — Sentinel Production Sprint (Full Architecture)

> **Read these first:**
> - `~/Antigravity/Python/Knowledgebase/00_Current_April_2026/2026_04_08_DAILY_BRIEF_AND_ROADMAP.md`
> - `~/Antigravity/Python/Knowledgebase/00_Current_April_2026/2026_04_04_SWARM_AND_ALGO_ARCHITECTURE.md`
> - `~/Antigravity/webdev/.agents/AGENTS.md` (project rules)

---

## Objective

Two workstreams, in order:

**A) Copilot Parity** — Make `CopilotPane.tsx` functionally equivalent to the Python SDK terminal.

**B) Algo Trading Engine** — Port the complete Python algo architecture to TypeScript. The Python backend has a full working implementation across 7 files (~2,500 lines). We port the architecture, patterns, and logic to run client-side in the browser using existing gateway tools for data + execution.

No deployment. No Netlify/Vercel. Everything stops at "build passes, git push to master."

---

## Architecture

```
Browser → CopilotPane.tsx → Go Gateway (api.hyper-sentinel.com) → Python Backend (62 tools)
                                    ↓
                           LLM Proxy: Anthropic / OpenAI / Google / xAI
```

### Live Gateway Tools (62 total — no strategy endpoints)
```
MARKET:  get_crypto_price, get_crypto_top_n, search_crypto
FRED:    get_fred_series, search_fred, get_economic_dashboard
INTEL:   get_news_sentiment, get_news_recap, get_intelligence_reports, get_report_detail
         get_trending_tokens, get_top_mentions, search_mentions, get_trending_narratives
         get_token_news, search_x
HL:      get_hl_config, get_hl_account_info, get_hl_positions, get_hl_orderbook
         get_hl_open_orders, place_hl_order, cancel_hl_order, close_hl_position
         set_hl_leverage, approve_hl_builder_fee
ASTER:   aster_diagnose, aster_ping, aster_ticker, aster_orderbook, aster_klines
         aster_funding_rate, aster_exchange_info, aster_balance, aster_positions
         aster_account_info, aster_place_order, aster_cancel_order, aster_cancel_all_orders
         aster_open_orders, aster_set_leverage
POLY:    get_polymarket_markets, search_polymarket, get_polymarket_orderbook
         get_polymarket_price, get_polymarket_positions, buy_polymarket, sell_polymarket
         place_polymarket_limit, cancel_polymarket_order, cancel_all_polymarket_orders
SOCIAL:  tg_read_channel, tg_search_messages, tg_list_channels, tg_send_message
         discord_read_channel, discord_search_messages, discord_list_guilds
         discord_list_channels, discord_send_message
SYSTEM:  open_in_browser, open_app
```

---

## WORKSTREAM A: Copilot Parity (Tasks 1-5)

### Task 1: Fix Empty Bubbles (P0)
**File:** `src/panes/CopilotPane.tsx`

SSE streaming works (tool calls render), but "hi there" returns blank bubbles.

Debug: The Go gateway may wrap responses differently than raw provider format. `extractText()` (line 50-72) assumes raw provider format, but the gateway normalizes. For non-streaming, the gateway may return `{"response":"text","usage":{}}` instead of raw Anthropic/OpenAI format.

Fix: Add gateway wrapper detection in `extractText()`:
```typescript
function extractText(data: Record<string, unknown>, provider: string): string {
  // Gateway wrapper format (Go standardizes all providers)
  if (typeof data.response === "string") return data.response;
  if (typeof data.text === "string") return data.text;
  if (typeof data.content === "string") return data.content;
  // Then fall through to provider-specific parsing...
}
```

### Task 2: Model Selector Dropdown
Small `<select>` in CopilotPane header. Persist to localStorage.
```
google:    gemini-2.5-flash, gemini-2.5-pro
anthropic: claude-sonnet-4-20250514, claude-haiku-3-20250514
openai:    gpt-4o, gpt-4o-mini
xai:       grok-3-mini-fast, grok-3
```

### Task 3: Tool Catalog Parity
Match Python `chat.py` (lines 196-700). Add missing schemas for stocks, DexScreener, TA, portfolio, wallets, Aster trading, social actions.

### Task 4: System Prompt Parity
Port Python `chat.py` SYSTEM_PROMPT (lines 132-171): capabilities list, tool-first rules, 10-section quant report format, number formatting ($87,421.32).

### Task 5: Copilot Hardening
- 5A: Styled error cards with retry button
- 5B: Message hover actions (retry/delete)
- 5C: `/tools` command → formatted tool table
- 5D: Swarm/Team → "Coming Soon" tooltip

---

## WORKSTREAM B: Algo Trading Engine (Tasks 6-11)

This is a direct port of the Python algo architecture. Here's what exists in Python:

### Python Source Architecture (reference — DO NOT modify these files)

```
~/Antigravity/Python/hyper-sentinel/
├── core/
│   ├── sentinel.py          → Guardrails class (lines 59-115) + Sentinel runtime
│   ├── strategy_runner.py   → StrategyRunner (476 lines) — SMA crossover runner
│   ├── ta_engine.py         → TA indicators: SMA, EMA, RSI, MACD, BB (258 lines)
│   ├── trade_journal.py     → SQLite trade journal (375 lines) — sessions, trades, events
│   ├── dca_engine.py        → DCA module (124 lines) — layered entries on dips
│   ├── algos/
│   │   ├── base_algo.py     → BaseAlgo ABC (271 lines) — ROE exits, position mgmt
│   │   ├── bb_reversion.py  → Bollinger Bands mean reversion
│   │   ├── macd_momentum.py → MACD crossover
│   │   ├── ema_spread.py    → EMA spread reversal
│   │   └── gain_ema.py      → EMA level + profit target
│   └── strategy/
│       ├── sentinel_algo.py → RSI+ICT confluence (721 lines) — the flagship
│       ├── superguppy.py    → CM SuperGuppy EMA ribbon
│       └── breaker_blocks.py → SMC breaker block detection
```

### Web Files to Create

```
src/lib/
├── ta-engine.ts          → Port of core/ta_engine.py
├── guardrails.ts         → Port of Guardrails class from core/sentinel.py
├── strategy-runner.ts    → Port of core/strategy_runner.py + base_algo.py
├── trade-journal.ts      → Port of core/trade_journal.py (localStorage, not SQLite)
├── dca-engine.ts         → Port of core/dca_engine.py
└── algos/
    ├── types.ts          → Shared interfaces (Signal, StrategyConfig, etc.)
    ├── sma-crossover.ts  → Port of strategy_runner SMA logic
    ├── bb-reversion.ts   → Port of algos/bb_reversion.py
    ├── macd-momentum.ts  → Port of algos/macd_momentum.py
    ├── ema-spread.ts     → Port of algos/ema_spread.py
    └── rsi-ict.ts        → Simplified port of strategy/sentinel_algo.py (no SMC lib)

src/panes/
└── StrategyPane.tsx      → Full rebuild (currently 166-line shell)
```

---

### Task 6: TA Engine (`src/lib/ta-engine.ts`)

Port from Python `core/ta_engine.py`. Pure TypeScript, no external libs.

```typescript
// Port these functions from ta_engine.py:

export function computeSMA(closes: number[], period: number): number[]
// Python: df["close"].rolling(window=fast).mean()

export function computeEMA(closes: number[], period: number): number[]
// Exponential moving average with multiplier k = 2/(period+1)

export function computeRSI(closes: number[], period: number = 14): number[]
// Python ta_engine.py line 278-290 (Wilder's smoothing):
// delta = close.diff()
// gain = delta.where(delta > 0, 0.0)
// loss = -delta.where(delta < 0, 0.0)
// avg_gain = gain.rolling(period).mean()
// avg_loss = loss.rolling(period).mean()
// RS = avg_gain / avg_loss
// RSI = 100 - (100 / (1 + RS))

export function computeMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: number[]; signal: number[]; histogram: number[] }

export function computeBB(
  closes: number[],
  period: number = 20,
  stdDev: number = 2.0
): { upper: number[]; mid: number[]; lower: number[] }

export function detectCrossover(
  fast: number[],
  slow: number[]
): "bullish" | "bearish" | null
// Python ta_engine.py lines 141-147:
// cross_diff = sma_fast - sma_slow
// cross_prev = cross_diff.shift(1)
// bullish = cross_diff > 0 AND cross_prev <= 0
// bearish = cross_diff < 0 AND cross_prev >= 0

export function computeAllIndicators(closes: number[]): TAIndicators
// Returns: { sma9, sma21, ema12, ema26, rsi14, macd, bb, price }
```

---

### Task 7: Guardrails (`src/lib/guardrails.ts`)

Port from Python `core/sentinel.py` lines 59-115.

```typescript
export interface GuardrailConfig {
  maxTradeUsd: number;       // default 500 (SENTINEL_MAX_TRADE_USD)
  maxDailyTrades: number;    // default 5 (SENTINEL_MAX_DAILY_TRADES)
  maxDailyLossUsd: number;   // default 1000 (SENTINEL_MAX_DAILY_LOSS)
  autoExecuteEnabled: boolean; // default false
  killSwitch: boolean;       // default false
}

export class Guardrails {
  private tradesToday: number = 0;
  private dailyPnl: number = 0;
  private tradeDate: string; // YYYY-MM-DD, resets at midnight

  canExecute(tradeUsd: number): { allowed: boolean; reason: string }
  // Checks: kill switch → auto-execute → daily reset → daily trades → max trade → daily loss

  recordTrade(pnl: number = 0): void
  // tradesToday++ and dailyPnl += pnl

  engageKillSwitch(): void
  // killSwitch = true

  disengageKillSwitch(): void

  status(): GuardrailStatus
  // { autoExecute, killSwitch, tradesToday: "2/5", dailyPnl: "+$45.00", maxTrade, maxDailyLoss }
}

// Persist to localStorage: sentinel_guardrails
```

---

### Task 8: Trade Journal (`src/lib/trade-journal.ts`)

Port from Python `core/trade_journal.py` (375 lines). Use localStorage instead of SQLite.

```typescript
// Python schema → TypeScript interfaces:

export interface TradeSession {
  id: string;            // nanoid
  startedAt: string;     // ISO
  endedAt?: string;
  symbol: string;
  venue: "hl" | "aster";
  interval: string;
  algo: string;          // "sma" | "rsi_ict" | "bb" | etc.
  leverage: number;
  tradeUsd: number;
  totalTrades: number;
  totalPnl: number;
  status: "active" | "stopped";
}

export interface TradeEntry {
  id: string;
  sessionId: string;
  timestamp: string;
  signal: "bullish" | "bearish";
  side: "buy" | "sell";
  symbol: string;
  venue: string;
  entryPrice: number;
  quantity: number;
  usdValue: number;
  leverage: number;
  success: boolean;
  position: "long" | "short" | null;
  // TA data at time of entry
  indicators?: { smaFast?: number; smaSlow?: number; rsi?: number; spreadPct?: number };
}

export interface PositionEvent {
  id: string;
  tradeId: string;
  sessionId: string;
  timestamp: string;
  eventType: "close" | "stop_loss" | "take_profit" | "liquidation";
  exitPrice: number;
  pnlUsd: number;
  pnlPct: number;
  holdTimeS?: number;
  reason?: string;
}

export class TradeJournal {
  // Port from Python trade_journal.py:
  startSession(config: Partial<TradeSession>): string
  endSession(sessionId: string): void
  logTrade(entry: Omit<TradeEntry, "id">): string
  logPositionEvent(event: Omit<PositionEvent, "id">): string

  // Analytics (port from Python lines 290-375):
  winRate(sessionId?: string): { total: number; wins: number; losses: number; winRatePct: number }
  sessionSummary(sessionId: string): SessionSummary
  equityCurve(sessionId: string): { timestamp: string; pnlUsd: number; cumulativePnl: number }[]
  allSessions(): TradeSession[]
  recentTrades(limit?: number): TradeEntry[]
}

// Persist to localStorage: sentinel_trade_journal
```

---

### Task 9: DCA Engine (`src/lib/dca-engine.ts`)

Port from Python `core/dca_engine.py` (124 lines). Module that layers into positions.

```typescript
// Exact port of Python DCAEngine class:

export class DCAEngine {
  spreadPct: number;      // default 2.0 — DCA when price moves 2% against
  maxCount: number;       // default 3 — max DCA orders
  sizeMultiplier: number; // default 1.0 — DCA size relative to initial

  dcaCount: number;
  lastOrderPrice: number | null;
  totalQuantity: number;
  totalCost: number;
  orders: { price: number; quantity: number; type: string }[];

  get avgEntry(): number { return this.totalCost / this.totalQuantity; }

  reset(): void
  setInitialEntry(price: number, quantity: number): void
  shouldDCA(currentPrice: number, side: "buy" | "sell"): boolean
  // For longs: price must drop spreadPct% below lastOrderPrice
  // For shorts: price must rise spreadPct% above lastOrderPrice

  getDCASize(baseQuantity: number): number
  recordDCA(price: number, quantity: number): void
  status(): DCAStatus
}
```

---

### Task 10: Strategy Runner (`src/lib/strategy-runner.ts`)

Port from Python `core/strategy_runner.py` (476 lines) + `core/algos/base_algo.py` (271 lines).

```typescript
// ── Algo Interface (from base_algo.py) ──

export type AlgoType = "sma" | "bb" | "macd" | "ema_spread" | "rsi_ict" | "dca";

export interface AlgoSignal {
  signal: "bullish" | "bearish" | null;
  confidence: number;  // 0-100
  reasons: string[];
  indicators: Record<string, number>;
}

export interface AlgoDefinition {
  name: string;
  type: AlgoType;
  description: string;
  defaultParams: Record<string, number>;
  computeSignal(closes: number[], highs: number[], lows: number[], params: Record<string, number>): AlgoSignal;
}

// ── Concrete Algos ──

// 1. SMA Crossover (from strategy_runner.py)
//    Signal: fast SMA crosses slow SMA
//    Params: fast=9, slow=21

// 2. BB Reversion (from algos/bb_reversion.py)
//    Signal: LONG when price <= lower BB, SHORT when price >= upper BB
//    Params: period=20, stdDev=2.0

// 3. MACD Momentum (from algos/macd_momentum.py)
//    Signal: LONG when MACD crosses above signal, SHORT when below
//    Params: fast=12, slow=26, signal=9

// 4. EMA Spread (from algos/ema_spread.py)
//    Signal: LONG when fast EMA < slow EMA AND spread DECREASING (reversal)
//    Params: fast=12, slow=26

// 5. RSI+ICT (simplified from strategy/sentinel_algo.py — no SMC lib in browser)
//    Signal: LONG when RSI < oversold + price near support, SHORT when RSI > overbought
//    Params: rsiPeriod=14, oversold=35, overbought=65
//    Note: Kill Zone check (London 7-10 UTC, NY 12-15 UTC, NY PM 18-21 UTC)

// ── Strategy Runner ──

export interface StrategyConfig {
  algo: AlgoType;
  venue: "hl" | "aster";
  symbol: string;
  interval: string;     // "1m" | "5m" | "15m" | "1h"
  sizeUsd: number;      // trade size in USD
  leverage: number;     // 1-20x
  algoParams: Record<string, number>;
  dcaEnabled: boolean;
  dcaSpreadPct: number;
  dcaMaxCount: number;
}

export class StrategyRunner {
  private config: StrategyConfig;
  private guardrails: Guardrails;
  private journal: TradeJournal;
  private dca: DCAEngine;
  private timer: NodeJS.Timeout | null;
  private running: boolean;

  // Position state (from base_algo.py lines 61-68)
  private position: "long" | "short" | null;
  private entryPrice: number | null;
  private entryTime: string | null;
  private quantity: number | null;

  constructor(config: StrategyConfig, guardrails: Guardrails, journal: TradeJournal)

  start(): void
  // 1. Start journal session
  // 2. Set interval timer based on config.interval
  // 3. On each tick: fetchData → computeSignal → checkExits → checkGuardrails → execute

  stop(): void
  // End journal session, clear timer

  private async tick(): Promise<void>
  // EXECUTION FLOW (from strategy_runner.py lines 121-325):
  // 1. Fetch klines → api.call("aster_klines", {symbol, interval}) or use HL orderbook
  // 2. Parse OHLCV from response
  // 3. Compute TA indicators (computeAllIndicators)
  // 4. Run algo.computeSignal()
  // 5. Check ROE exits (from base_algo.py lines 160-178):
  //    - TP: ROE >= takeProfitPct → close
  //    - SL: ROE <= -stopLossPct → close
  // 6. Check DCA conditions (shouldDCA)
  // 7. Check guardrails.canExecute(sizeUsd)
  // 8. Set leverage: api.call("set_hl_leverage" or "aster_set_leverage")
  // 9. Calculate quantity: sizeUsd / price (round for HL — see size_decimals map)
  // 10. Execute: api.call("place_hl_order" or "aster_place_order")
  // 11. Journal: log trade entry
  // 12. Update position state

  private calcROE(currentPrice: number): number
  // From base_algo.py lines 180-189:
  // LONG:  ((price - entryPrice) / entryPrice) * 100 * leverage
  // SHORT: ((entryPrice - price) / entryPrice) * 100 * leverage

  status(): StrategyStatus
}

// HL size decimal map (from strategy_runner.py lines 219-225):
const HL_SIZE_DECIMALS: Record<string, number> = {
  BTC: 5, ETH: 4, SOL: 2, DOGE: 0, AVAX: 2, MATIC: 1,
  ARB: 1, OP: 1, LINK: 2, UNI: 2, AAVE: 3, LTC: 3,
  ADA: 0, DOT: 1, ATOM: 2, NEAR: 1, APE: 1, FTM: 0,
};
```

---

### Task 11: StrategyPane (`src/panes/StrategyPane.tsx`)

Full rebuild of the current 166-line shell. Production UI:

```
┌──────────────────────────────────────────┐
│ Strategy Engine          [STOP] [CONFIG] │
├──────────────────────────────────────────┤
│ CONFIGURATION                            │
│ Algorithm: [SMA Crossover          ▼]   │
│ Venue:     [Hyperliquid            ▼]   │
│ Symbol:    [ETH                     ]   │
│ Interval:  [5m ▼]   Size: [$20     ]   │
│ Leverage:  [━━━━━━━○━━━━━━━━] 3x       │
│ TP: [1.0%]  SL: [2.0%]                 │
│ [  ] DCA Enabled  Spread: 2%  Max: 3   │
├──────────────────────────────────────────┤
│ GUARDRAILS                 [KILL SWITCH] │
│ Max Trade     $500         |  Status OK │
│ Daily Trades  2 / 5        |  Auto: OFF │
│ Daily P&L     +$45 / $1000             │
├──────────────────────────────────────────┤
│ LIVE STATUS                              │
│ Position:  LONG ETH @ $3,421.50        │
│ ROE:       +2.4% (leverage-adjusted)    │
│ Last Signal: BULLISH (SMA9 > SMA21)    │
│ Run Count:  47  |  Last: 15:42 UTC     │
├──────────────────────────────────────────┤
│ JOURNAL               Win Rate: 62.5%   │
│ Time   Symbol  Side  Size    P&L        │
│ 14:20  ETH     BUY   0.01   +$2.40     │
│ 15:42  ETH     SELL  0.01   -$0.80     │
│ 16:15  ETH     BUY   0.01   pending    │
│                      Net P&L: +$1.60   │
├──────────────────────────────────────────┤
│ TA INDICATORS (live)                     │
│ SMA(9): $3,425   SMA(21): $3,410       │
│ RSI(14): 58.2    MACD: +12.4           │
│ BB: $3,380 / $3,420 / $3,460           │
│ Signal: BULLISH  Spread: +0.44%        │
└──────────────────────────────────────────┘
```

Sections:
1. **Config** — dropdowns/inputs for algo, venue, symbol, interval, size, leverage, TP/SL, DCA
2. **Guardrails** — real-time display + kill switch button (red, prominent)
3. **Live Status** — current position, ROE, last signal, run count
4. **Journal** — recent trades table with P&L, win rate summary
5. **TA Indicators** — live indicator values from latest tick

State management: All config via `useStrategyStore()` Zustand slice or standalone state.
Persistence: localStorage for config, guardrails, journal, running state.

---

## Global Rules

1. **No emojis in UI code.** Text or SVG only.
2. **Dark theme only.** BG: `#0a0a0a` → `#111` → `#161616`. Accent: `#00ff88`.
3. **Build must pass.** `npx next build` after every change.
4. **Commit per workstream.** `feat: copilot parity` and `feat: algo trading engine`
5. **Don't break existing.** Inline commands, chart pane, vault must keep working.
6. **No deployment.** No Netlify/Vercel/DNS.

## Verification

```bash
npx next build           # 0 errors
npx tsc --noEmit         # 0 type errors
```

## Success Criteria

```
WORKSTREAM A (Copilot):
  [ ] "hi there" → visible text response (no empty bubbles)
  [ ] Model selector → persists, sends correct model
  [ ] Tool catalog → 50+ schemas matching Python chat.py
  [ ] System prompt → matches Python analysis formatting
  [ ] Error cards with retry
  [ ] /tools command
  [ ] Swarm → "Coming Soon"

WORKSTREAM B (Algo):
  [ ] ta-engine.ts — SMA, EMA, RSI, MACD, BB (pure TS, no deps)
  [ ] guardrails.ts — kill switch, daily limits, trade gate
  [ ] trade-journal.ts — sessions, trades, events, win rate, equity curve
  [ ] dca-engine.ts — layered entries on dips
  [ ] strategy-runner.ts — 5 algos, ROE exits, interval-based tick loop
  [ ] StrategyPane.tsx — config, guardrails, live status, journal, TA indicators
  [ ] Data flow: aster_klines → TA compute → signal → guardrails → execute → journal
  [ ] Build passes
```

## Recommended Claude Code Commands

```bash
# Phase 1: Architecture (use feature-dev plugin)
# Claude Code will scaffold all files with types + interfaces

# Phase 2: Iteration (use ralph-loop)
/ralph-loop   # iterate until build passes + all criteria met

# Phase 3: Commit
/commit       # auto-generate commit message + push
```
