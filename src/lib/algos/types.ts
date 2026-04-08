/**
 * Shared types for the Sentinel Algo Trading Engine.
 * Ported from Python hyper-sentinel/core/algos/base_algo.py + strategy_runner.py
 */

// ── TA Indicators ────────────────────────────────────────────

export interface TAIndicators {
  sma9: number[];
  sma21: number[];
  ema12: number[];
  ema26: number[];
  rsi14: number[];
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bb: { upper: number[]; mid: number[]; lower: number[] };
  closes: number[];
}

// ── Algo Signal ──────────────────────────────────────────────

export type AlgoType = "sma" | "bb" | "macd" | "ema_spread" | "rsi_ict" | "dca";

export interface AlgoSignal {
  signal: "bullish" | "bearish" | null;
  confidence: number; // 0-100
  reasons: string[];
  indicators: Record<string, number>;
}

export interface AlgoDefinition {
  name: string;
  type: AlgoType;
  description: string;
  defaultParams: Record<string, number>;
  computeSignal(
    closes: number[],
    highs: number[],
    lows: number[],
    params: Record<string, number>
  ): AlgoSignal;
}

// ── Strategy Config ──────────────────────────────────────────

export interface StrategyConfig {
  algo: AlgoType;
  venue: "hl" | "aster";
  symbol: string;
  interval: string; // "1m" | "5m" | "15m" | "1h"
  sizeUsd: number;
  leverage: number; // 1-20x
  algoParams: Record<string, number>;
  takeProfitPct: number; // default 1.0
  stopLossPct: number;   // default 2.0
  dcaEnabled: boolean;
  dcaSpreadPct: number;
  dcaMaxCount: number;
}

// ── Guardrails ───────────────────────────────────────────────

export interface GuardrailConfig {
  maxTradeUsd: number;        // default 500
  maxDailyTrades: number;     // default 5
  maxDailyLossUsd: number;    // default 1000
  autoExecuteEnabled: boolean; // default false
  killSwitch: boolean;        // default false
}

export interface GuardrailStatus {
  autoExecute: boolean;
  killSwitch: boolean;
  tradesToday: string; // "2/5"
  dailyPnl: string;   // "+$45.00"
  maxTrade: number;
  maxDailyLoss: number;
}

// ── Trade Journal ────────────────────────────────────────────

export interface TradeSession {
  id: string;
  startedAt: string; // ISO
  endedAt?: string;
  symbol: string;
  venue: "hl" | "aster";
  interval: string;
  algo: string;
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
  indicators?: {
    smaFast?: number;
    smaSlow?: number;
    rsi?: number;
    spreadPct?: number;
  };
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

export interface SessionSummary {
  session: TradeSession;
  trades: TradeEntry[];
  events: PositionEvent[];
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
}

// ── Strategy Runner Status ───────────────────────────────────

export interface StrategyStatus {
  running: boolean;
  config: StrategyConfig;
  position: "long" | "short" | null;
  entryPrice: number | null;
  currentROE: number | null;
  lastSignal: AlgoSignal | null;
  runCount: number;
  lastTick: string | null;
  sessionId: string | null;
}

// ── DCA ──────────────────────────────────────────────────────

export interface DCAOrder {
  price: number;
  quantity: number;
  type: string;
}

export interface DCAStatus {
  dcaCount: number;
  maxCount: number;
  avgEntry: number;
  totalQuantity: number;
  totalCost: number;
  spreadPct: number;
  orders: DCAOrder[];
}

// ── HL Size Decimals ─────────────────────────────────────────

export const HL_SIZE_DECIMALS: Record<string, number> = {
  BTC: 5, ETH: 4, SOL: 2, DOGE: 0, AVAX: 2, MATIC: 1,
  ARB: 1, OP: 1, LINK: 2, UNI: 2, AAVE: 3, LTC: 3,
  ADA: 0, DOT: 1, ATOM: 2, NEAR: 1, APE: 1, FTM: 0,
  HYPE: 1, SUI: 1, APT: 2, SEI: 0, TIA: 2, JUP: 0,
  WIF: 0, PEPE: 0, BONK: 0, SHIB: 0,
};
