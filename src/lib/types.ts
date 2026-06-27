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
  venue: "hyperliquid" | "aster";
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


// ── Orders ──

export interface OrderParams {
  venue: "hyperliquid" | "aster";
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
export type Chain = "SOL" | "ETH" | "HL" | "ASTER";

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


// ── Billing ──

export interface BillingStatus {
  plan: string;
  payment_status: string;
  monthly_api_calls: number;
  monthly_limit: string;
  rate_limit_per_min: number;
  platform_fees?: string;
  billing?: string;
  your_fees: {
    llm_markup: string;
    maker_fee: string;
    taker_fee: string;
  };
}
