// src/lib/types.ts — TypeScript interfaces for Sentinel data models

// ── Trading ──

export interface Position {
  coin: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  liquidationPrice?: number;
  leverage?: number;
  venue: "hyperliquid" | "aster" | "polymarket";
}

export interface HLPosition {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  leverage: { type: string; value: number };
}

export interface AsterPosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  leverage: string;
  positionSide: string;
}

export interface PolymarketPosition {
  market: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
}

// ── Orders ──

export interface OrderParams {
  venue: "hyperliquid" | "aster" | "polymarket";
  coin: string;
  side: "buy" | "sell";
  size: number;
  price?: number;
  orderType: "market" | "limit";
  leverage?: number;
  reduceOnly?: boolean;
}

export interface OrderResult {
  status: "SUCCESS" | "FAILED" | "SUBMITTED";
  coin?: string;
  side?: string;
  size?: number;
  details?: Record<string, unknown>;
  error?: string;
}

// ── Market Data ──

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export interface LivePair {
  name: string;
  chain: string;
  price: string;
  mcap: string;
  change: string;
  time: string;
  ca: string;
  volume: string;
  liquidity: string;
}

export interface Orderbook {
  bids: [number, number][];
  asks: [number, number][];
}

export interface AsterKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

// ── Auth ──

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  provider: string | null;
  walletAddress: string | null;
  apiKey: string | null;
}

export type AuthProvider = "claude" | "gpt" | "gemini" | "grok";
export type Chain = "SOL" | "ETH" | "HL" | "ASTER" | "POLY";

// ── Pane System ──

export type PaneId =
  | "chart"
  | "positions"
  | "orders"
  | "order_entry"
  | "trade_feed"
  | "dex_trading"
  | "wallet"
  | "live_pairs"
  | "markets"
  | "macro"
  | "orderbook"
  | "copilot"
  | "intel"
  | "telegram"
  | "discord"
  | "strategy"
  | "account";

export interface PaneConfig {
  id: PaneId;
  title: string;
  icon: string;
  minW?: number;
  minH?: number;
}

// ── Intelligence ──

export interface NewsItem {
  title: string;
  summary?: string;
  source?: string;
  url?: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  timestamp?: string;
}

export interface TrendingToken {
  name: string;
  symbol: string;
  price?: number;
  change?: number;
  volume?: number;
  mentions?: number;
}

// ── Polymarket ──

export interface PolymarketMarket {
  title?: string;
  question?: string;
  volume?: string | number;
  yes_price?: number;
  no_price?: number;
  outcome_yes?: string;
  outcome_no?: string;
  condition_id?: string;
  [key: string]: unknown;
}

// ── Billing ──

export interface BillingStatus {
  tier: string;
  subscription: string;
  monthly_api_calls: number;
  monthly_limit: string;
  rate_limit_per_min: number;
  your_fees: {
    llm_markup: string;
    maker_fee: string;
    taker_fee: string;
  };
  upgrade: Record<string, unknown>;
}
