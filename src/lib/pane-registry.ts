import { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LineChart, Briefcase, ClipboardList, Target, Zap,
  ArrowLeftRight, Wallet, Search, Landmark, Bot, Shield,
  MessageCircle, Gamepad2, BarChart3, BookOpen, ShieldCheck,
  TrendingUp,
} from "lucide-react";

// ── Pane Config ──────────────────────────────────────────────

export interface PaneConfig {
  id: string;
  title: string;
  icon: LucideIcon;
  component: () => Promise<{ default: ComponentType }>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  tier: "free" | "pro" | "enterprise";
  category: "trading" | "data" | "intelligence" | "tools";
  description: string;
}

// ── Registry ─────────────────────────────────────────────────

export const PANE_REGISTRY: Record<string, PaneConfig> = {
  // Trading
  chart: {
    id: "chart", title: "Price Chart", icon: LineChart,
    component: () => import("@/panes/ChartPane"),
    defaultSize: { w: 6, h: 4 }, minSize: { w: 4, h: 3 },
    tier: "free", category: "trading", description: "TradingView candlestick chart with indicators",
  },
  positions: {
    id: "positions", title: "Positions", icon: Briefcase,
    component: () => import("@/panes/PositionsPane"),
    defaultSize: { w: 6, h: 2 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "trading", description: "Unified positions across HL, Aster, Spot",
  },
  orders: {
    id: "orders", title: "Orders", icon: ClipboardList,
    component: () => import("@/panes/OrdersPane"),
    defaultSize: { w: 3, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "trading", description: "Open orders + trade history",
  },
  order_entry: {
    id: "order_entry", title: "Order Entry", icon: Target,
    component: () => import("@/panes/OrderEntryPane"),
    defaultSize: { w: 3, h: 4 }, minSize: { w: 2, h: 3 },
    tier: "free", category: "trading", description: "Place trades on HL and Aster DEX",
  },
  trade_feed: {
    id: "trade_feed", title: "Trade Feed", icon: Zap,
    component: () => import("@/panes/TradeFeedPane"),
    defaultSize: { w: 3, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "trading", description: "Live trade execution feed",
  },
  dex_trading: {
    id: "dex_trading", title: "DEX Swap", icon: ArrowLeftRight,
    component: () => import("@/panes/DexTradingPane"),
    defaultSize: { w: 3, h: 4 }, minSize: { w: 2, h: 3 },
    tier: "free", category: "trading", description: "Paste CA → instant DEX swap",
  },
  wallet: {
    id: "wallet", title: "Wallet", icon: Wallet,
    component: () => import("@/panes/WalletPane"),
    defaultSize: { w: 3, h: 3 }, minSize: { w: 2, h: 2 },
    tier: "free", category: "trading", description: "Portfolio balance and token list",
  },

  // Market Data
  live_pairs: {
    id: "live_pairs", title: "Live Pairs", icon: Search,
    component: () => import("@/panes/LivePairsPane"),
    defaultSize: { w: 3, h: 4 }, minSize: { w: 2, h: 3 },
    tier: "free", category: "data", description: "DexScreener live pair scanner",
  },
  macro: {
    id: "macro", title: "Macro Dashboard", icon: Landmark,
    component: () => import("@/panes/MacroPane"),
    defaultSize: { w: 6, h: 2 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "data", description: "FRED economic indicators",
  },
  polymarket: {
    id: "polymarket", title: "Polymarket", icon: TrendingUp,
    component: () => import("@/panes/PolymarketPane"),
    defaultSize: { w: 4, h: 4 }, minSize: { w: 3, h: 3 },
    tier: "free", category: "data", description: "Prediction markets browser + prices",
  },

  // Intelligence
  copilot: {
    id: "copilot", title: "Sentinel Copilot", icon: Bot,
    component: () => import("@/panes/CopilotPane"),
    defaultSize: { w: 6, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "intelligence", description: "AI chat assistant with multi-agent modes",
  },
  intel: {
    id: "intel", title: "Intelligence", icon: Shield,
    component: () => import("@/panes/IntelPane"),
    defaultSize: { w: 3, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "intelligence", description: "Y2/Elfa news & sentiment feed",
  },
  telegram: {
    id: "telegram", title: "Telegram", icon: MessageCircle,
    component: () => import("@/panes/TelegramPane"),
    defaultSize: { w: 4, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "intelligence", description: "Telegram channel monitoring",
  },
  discord: {
    id: "discord", title: "Discord", icon: Gamepad2,
    component: () => import("@/panes/DiscordPane"),
    defaultSize: { w: 4, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "intelligence", description: "Discord server monitoring",
  },

  // Tools
  strategy: {
    id: "strategy", title: "Strategy", icon: Zap,
    component: () => import("@/panes/StrategyPane"),
    defaultSize: { w: 3, h: 3 }, minSize: { w: 2, h: 2 },
    tier: "free", category: "tools", description: "Algo strategies + DCA engine",
  },

  // Market Overview
  markets: {
    id: "markets", title: "Markets", icon: BarChart3,
    component: () => import("@/panes/MarketsPane"),
    defaultSize: { w: 5, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "data", description: "Top crypto prices, sortable table",
  },
  orderbook: {
    id: "orderbook", title: "Orderbook", icon: BookOpen,
    component: () => import("@/panes/OrderbookPane"),
    defaultSize: { w: 3, h: 4 }, minSize: { w: 2, h: 3 },
    tier: "free", category: "trading", description: "Live bid/ask depth ladder",
  },
  account: {
    id: "account", title: "Account & Billing", icon: ShieldCheck,
    component: () => import("@/panes/AccountPane"),
    defaultSize: { w: 4, h: 3 }, minSize: { w: 3, h: 2 },
    tier: "free", category: "tools", description: "Billing, usage, API keys",
  },
};

// ── Categories ───────────────────────────────────────────────

export interface CategoryConfig {
  id: "trading" | "data" | "intelligence" | "tools";
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryConfig[] = [
  { id: "trading", label: "Trading", icon: Zap },
  { id: "data", label: "Market Data", icon: BarChart3 },
  { id: "intelligence", label: "Intelligence", icon: Bot },
  { id: "tools", label: "Tools", icon: Target },
];

// ── Layout Presets ────────────────────────────────────────────

export type LayoutPreset = "sentinel" | "trading" | "research" | "monitor" | "terminal";

export const DEFAULT_LAYOUTS: Record<LayoutPreset, { i: string; x: number; y: number; w: number; h: number }[]> = {
  sentinel: [
    { i: "chart", x: 0, y: 0, w: 5, h: 4 },
    { i: "order_entry", x: 5, y: 0, w: 3, h: 4 },
    { i: "copilot", x: 8, y: 0, w: 4, h: 6 },
    { i: "markets", x: 0, y: 4, w: 5, h: 3 },
    { i: "account", x: 5, y: 4, w: 3, h: 3 },
  ],
  trading: [
    { i: "live_pairs", x: 0, y: 0, w: 3, h: 4 },
    { i: "chart", x: 3, y: 0, w: 6, h: 4 },
    { i: "orders", x: 9, y: 0, w: 3, h: 4 },
    { i: "positions", x: 0, y: 4, w: 6, h: 2 },
    { i: "copilot", x: 6, y: 4, w: 6, h: 2 },
  ],
  terminal: [
    { i: "live_pairs", x: 0, y: 0, w: 3, h: 4 },
    { i: "chart", x: 3, y: 0, w: 6, h: 4 },
    { i: "order_entry", x: 9, y: 0, w: 3, h: 4 },
    { i: "trade_feed", x: 0, y: 4, w: 3, h: 3 },
    { i: "positions", x: 3, y: 4, w: 6, h: 3 },
    { i: "orders", x: 9, y: 4, w: 3, h: 3 },
  ],
  research: [
    { i: "chart", x: 0, y: 0, w: 6, h: 4 },
    { i: "copilot", x: 6, y: 0, w: 6, h: 4 },
    { i: "polymarket", x: 0, y: 4, w: 6, h: 3 },
    { i: "intel", x: 6, y: 4, w: 6, h: 3 },
  ],
  monitor: [
    { i: "positions", x: 0, y: 0, w: 6, h: 3 },
    { i: "orders", x: 6, y: 0, w: 6, h: 3 },
    { i: "trade_feed", x: 0, y: 3, w: 4, h: 3 },
    { i: "telegram", x: 4, y: 3, w: 4, h: 3 },
    { i: "discord", x: 8, y: 3, w: 4, h: 3 },
  ],
};
