# Sentinel Web — Frontend Build Prompt

> **Master context document for building the Sentinel trading terminal frontend.**
> Read this before touching any code.

<!-- BEGIN:nextjs-agent-rules -->
This version of Next.js has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## What This Project Is

Sentinel is a **multi-venue AI trading terminal** — think Hyperliquid UI + Axiom.trade + TradingView + ChatGPT, unified in one dark-themed professional dashboard. Users bring their own LLM API key (Claude, GPT, Gemini, Grok), and the AI agent executes trades across 3 venues using 62+ backend tools.

### The Stack

| Layer | Tech | URL |
|-------|------|-----|
| Frontend | Next.js 16, React 19, Tailwind 4, TypeScript | `localhost:3000` |
| Go Gateway | Go + Chi, auth/billing/proxy | Cloud Run: `sentinel-api-*.run.app` |
| Python Engine | FastAPI, 62 tools, LLM agent | `localhost:8000` (proxied through Go) |

### Data Flow
```
Browser → Go Gateway (Cloud Run) → Python Engine → Exchange APIs
                ↓
        Auth + Billing + Fee Tracking
```

---

## Architecture

```
webdev/
├── .env.local                      # NEXT_PUBLIC_API_URL=https://sentinel-api-*.run.app
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with Providers
│   │   ├── page.tsx                # Landing page — auth flow (BYOAI + wallet)
│   │   ├── globals.css             # Design system — dark theme tokens + animations
│   │   ├── login/page.tsx          # Login page
│   │   ├── dashboard/page.tsx      # Main terminal dashboard (THE PRODUCT)
│   │   ├── billing/page.tsx        # Billing & subscription management
│   │   ├── settings/page.tsx       # User settings
│   │   ├── strategies/page.tsx     # Algo strategies
│   │   ├── monitors/page.tsx       # Monitors
│   │   ├── agent/page.tsx          # Agent control
│   │   └── terminal/page.tsx       # Legacy terminal route
│   ├── lib/
│   │   ├── api.ts                  # SentinelAPI class: 80+ methods, JWT + API key auth
│   │   ├── hooks.ts                # React Query hooks for ALL 62 tools with auto-refresh
│   │   ├── auth.tsx                # AuthContext: BYOK login, session management
│   │   ├── store.ts                # Zustand: layout persistence, pane management
│   │   └── pane-registry.ts        # 18 pane configs + 5 layout presets
│   ├── components/
│   │   ├── Providers.tsx           # React Query + Auth providers
│   │   ├── AuthGuard.tsx           # Auth-gated route wrapper
│   │   ├── PaneGrid.tsx            # React Grid Layout wrapper
│   │   ├── PaneShell.tsx           # Pane header + lazy loading
│   │   ├── AppLayout.tsx           # Main app layout with sidebar
│   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   ├── TopBar.tsx              # Top navigation bar
│   │   ├── CommandPalette.tsx      # ⌘K command palette
│   │   └── StatCard.tsx            # Stats display component
│   └── panes/
│       ├── ChartPane.tsx           # TradingView candlestick via lightweight-charts
│       ├── PositionsPane.tsx       # Unified positions (HL + Aster + Poly)
│       ├── OrdersPane.tsx          # Open orders + trade history
│       ├── OrderEntryPane.tsx      # Order form wired to 3 venues
│       ├── TradeFeedPane.tsx       # Live trade execution feed
│       ├── DexTradingPane.tsx      # Paste CA → instant DEX swap
│       ├── WalletPane.tsx          # Portfolio balance and token list
│       ├── LivePairsPane.tsx       # Trending token scanner
│       ├── MarketsPane.tsx         # Top crypto prices, sortable table
│       ├── MacroPane.tsx           # FRED economic indicators
│       ├── OrderbookPane.tsx       # HL orderbook with depth bars
│       ├── CopilotPane.tsx         # AI chat — multi-LLM, tool calls
│       ├── IntelPane.tsx           # Y2/Elfa news & sentiment feed
│       ├── TelegramPane.tsx        # Telegram channel monitoring
│       ├── DiscordPane.tsx         # Discord server monitoring
│       ├── StrategyPane.tsx        # Algo strategies + DCA engine
│       └── AccountPane.tsx         # Billing, usage, API keys
```

---

## Design System

**Inspired by:** Hyperliquid, Aster DEX, Axiom.trade, TradingView, Pump.fun

- **Theme:** Dark only — trading terminals are always dark
- **Font:** Inter (UI) + JetBrains Mono (numbers, code, prices)
- **Colors:**
  - Green: `#00ff88` (profit, buy, success)
  - Red: `#ff4444` (loss, sell, error)
  - Cyan: `#00e5ff` (accent, HL venue)
  - Purple: `#8b5cf6` (Aster venue, AI)
  - Yellow: `#fbbf24` (Polymarket venue)
  - Background: `#0a0a0a` → `#111` → `#161616` (depth layers)
  - Border: `#222` default, `#333` active
  - Text: `#e5e5e5` primary, `#999` secondary, `#555` dim
- **Effects:** Glassmorphism panels, subtle glow on hover, smooth transitions
- **CSS Classes:** `glass-panel`, `btn-primary`, `btn-auth`, `gradient-text`, `animate-fade-in`

---

## Key Concepts

### SentinelAPI Class (`api.ts`)
Singleton class that manages auth state and provides typed methods for all 62+ tools:
```ts
import { api } from "@/lib/api";

// Auth
await api.loginWithAIKey("claude", "sk-ant-...");
api.isAuthenticated(); // true

// Read data
const positions = await api.getHLPositions();
const price = await api.getCryptoPrice("bitcoin");

// Place a trade
const result = await api.placeHLOrder("BTC", "buy", 0.01, undefined, "market");

// Generic tool call
const data = await api.call("any_tool_name", { param: "value" });
```

### React Query Hooks (`hooks.ts`)
```ts
// Auto-refreshing read hook
const { data, isLoading, error } = useHLPositions(); // refreshes every 10s

// Generic tool query
const { data } = useToolQuery("get_crypto_price", { coin_id: "bitcoin" }, { refetchInterval: 30000 });

// Write mutation (auto-invalidates position caches)
const placeOrder = usePlaceHLOrder();
placeOrder.mutate({ coin: "BTC", side: "buy", size: 0.01 });
```

### Zustand Store (`store.ts`)
Layout management with localStorage persistence:
```ts
const { layout, activePanes, addPane, removePane, loadPreset } = useTerminalStore();
```

---

## Available Backend Tools (62 total)

### Trading
| Tool | Venue | Action |
|------|-------|--------|
| `place_hl_order` | Hyperliquid | Place market/limit order |
| `close_hl_position` | Hyperliquid | Close entire position |
| `cancel_hl_order` | Hyperliquid | Cancel order by OID |
| `get_hl_open_orders` | Hyperliquid | List open orders |
| `aster_place_order` | Aster DEX | Place market/limit order |
| `aster_cancel_order` | Aster DEX | Cancel order |
| `aster_cancel_all_orders` | Aster DEX | Cancel all orders |
| `aster_set_leverage` | Aster DEX | Set leverage |
| `buy_polymarket` | Polymarket | Buy shares |
| `sell_polymarket` | Polymarket | Sell shares |
| `place_polymarket_limit` | Polymarket | Limit order |
| `cancel_polymarket_order` | Polymarket | Cancel order |
| `cancel_all_polymarket_orders` | Polymarket | Cancel all orders |

### Market Data
| Tool | Returns |
|------|---------| 
| `get_crypto_price` | Price, 24h change, volume, mcap |
| `get_crypto_top_n` | Top N coins by market cap |
| `get_crypto_batch_prices` | Batch price lookup |
| `search_crypto` | Search coins by query |
| `get_crypto_chart` | Price chart data (OHLCV) |
| `get_stock_price` | Stock/ETF price data |
| `get_hl_orderbook` | HL bids/asks with sizes |
| `get_hl_positions` | Open HL positions |
| `get_hl_account_info` | Account equity/margin |
| `get_hl_config` | HL exchange configuration |
| `aster_ticker` | 24h ticker stats |
| `aster_orderbook` | Aster orderbook |
| `aster_klines` | OHLCV candlestick data |
| `aster_funding_rate` | Funding rate data |
| `aster_exchange_info` | Exchange info & symbols |
| `aster_balance` | USDT balance |
| `aster_positions` | Open Aster positions |
| `aster_account_info` | Account details |
| `aster_open_orders` | Open Aster orders |
| `aster_diagnose` | Connection diagnostics |
| `aster_ping` | Connectivity check |
| `get_polymarket_markets` | Browse markets |
| `search_polymarket` | Search prediction markets |
| `get_polymarket_orderbook` | Market orderbook |
| `get_polymarket_price` | Market price |
| `get_polymarket_positions` | Open positions |

### Intelligence
| Tool | Returns |
|------|---------|
| `get_news_recap` | AI news summary |
| `get_news_sentiment` | Sentiment analysis |
| `get_intelligence_reports` | AI research reports |
| `get_report_detail` | Specific report detail |
| `get_trending_tokens` | Trending tokens (Elfa) |
| `get_top_mentions` | Top social mentions |
| `search_mentions` | Search mentions by query |
| `get_trending_narratives` | Hot narratives |
| `get_token_news` | Token-specific news |
| `search_x` | X/Twitter search |

### Macro Economics
| Tool | Returns |
|------|---------|
| `get_economic_dashboard` | GDP, CPI, Fed rate, unemployment, VIX |
| `get_fred_series` | Specific FRED series data |
| `search_fred` | Search FRED datasets |

### Social
| Tool | Returns |
|------|---------|
| `tg_read_channel` | Telegram channel messages |
| `tg_send_message` | Send to Telegram |
| `tg_search_messages` | Search Telegram messages |
| `tg_list_channels` | List available channels |
| `discord_read_channel` | Discord messages |
| `discord_send_message` | Send to Discord |
| `discord_search_messages` | Search Discord messages |
| `discord_list_guilds` | List servers |
| `discord_list_channels` | List server channels |

### System
| Tool | Returns |
|------|---------|
| `open_in_browser` | Open URL in browser |
| `open_app` | Open application |

---

## How to Run

```bash
# 1. Start frontend
cd webdev && npm run dev
# → http://localhost:3000

# 2. (Optional) Start Go gateway locally
cd hyper-sentinel-go && go run cmd/sentinel-api/main.go
# → http://localhost:8080

# 3. (Optional) Start Python engine locally
cd hyper-sentinel && uv run python main.py --api-only
# → http://localhost:8000
```

Production API is at the Cloud Run URL in `.env.local` — no local backend needed for development.

---

*This prompt is the single source of truth for the Sentinel frontend. Update it as you build.*
