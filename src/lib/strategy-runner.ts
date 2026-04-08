/**
 * Strategy Runner — Interval-based algo trading engine.
 * Ported from Python hyper-sentinel/core/strategy_runner.py (476 lines)
 * + core/algos/base_algo.py (271 lines) + 5 algo implementations.
 */

import { api } from "./api";
import { computeAllIndicators, computeSMA, computeEMA, computeRSI, computeMACD, computeBB, detectCrossover, lastValid } from "./ta-engine";
import { Guardrails } from "./guardrails";
import { TradeJournal } from "./trade-journal";
import { DCAEngine } from "./dca-engine";
import type {
  AlgoType,
  AlgoSignal,
  AlgoDefinition,
  StrategyConfig,
  StrategyStatus,
  TAIndicators,
} from "./algos/types";
import { HL_SIZE_DECIMALS } from "./algos/types";

// ── Interval to milliseconds ─────────────────────────────────

const INTERVAL_MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
};

// ── ICT Kill Zones (UTC hours) ───────────────────────────────

function isKillZone(): boolean {
  const hour = new Date().getUTCHours();
  return (hour >= 7 && hour < 10)   // London
    || (hour >= 12 && hour < 15)     // NY AM
    || (hour >= 18 && hour < 21);    // NY PM
}

// ══════════════════════════════════════════════════════════════
// Algo Implementations
// ══════════════════════════════════════════════════════════════

const SMA_CROSSOVER: AlgoDefinition = {
  name: "SMA Crossover",
  type: "sma",
  description: "Buy when fast SMA crosses above slow SMA, sell when below.",
  defaultParams: { fast: 9, slow: 21 },
  computeSignal(closes, _highs, _lows, params): AlgoSignal {
    const fast = computeSMA(closes, params.fast || 9);
    const slow = computeSMA(closes, params.slow || 21);
    const cross = detectCrossover(fast, slow);
    const lastFast = lastValid(fast);
    const lastSlow = lastValid(slow);
    const spread = lastFast && lastSlow ? ((lastFast - lastSlow) / lastSlow) * 100 : 0;

    return {
      signal: cross,
      confidence: cross ? Math.min(Math.abs(spread) * 20, 80) : 0,
      reasons: cross
        ? [`SMA(${params.fast}) ${cross === "bullish" ? "crossed above" : "crossed below"} SMA(${params.slow})`, `Spread: ${spread.toFixed(2)}%`]
        : ["No crossover detected"],
      indicators: { smaFast: lastFast || 0, smaSlow: lastSlow || 0, spread },
    };
  },
};

const BB_REVERSION: AlgoDefinition = {
  name: "BB Reversion",
  type: "bb",
  description: "Long when price touches lower band, short when upper band.",
  defaultParams: { period: 20, stdDev: 2.0 },
  computeSignal(closes, _highs, _lows, params): AlgoSignal {
    const bb = computeBB(closes, params.period || 20, params.stdDev || 2.0);
    const price = closes[closes.length - 1];
    const upper = lastValid(bb.upper);
    const lower = lastValid(bb.lower);
    const mid = lastValid(bb.mid);

    if (!upper || !lower || !mid) {
      return { signal: null, confidence: 0, reasons: ["Not enough data for BB"], indicators: {} };
    }

    const bandwidth = ((upper - lower) / mid) * 100;
    let signal: "bullish" | "bearish" | null = null;
    const reasons: string[] = [];

    if (price <= lower) {
      signal = "bullish";
      reasons.push(`Price $${price.toFixed(2)} at/below lower BB $${lower.toFixed(2)}`);
    } else if (price >= upper) {
      signal = "bearish";
      reasons.push(`Price $${price.toFixed(2)} at/above upper BB $${upper.toFixed(2)}`);
    } else {
      reasons.push(`Price within bands ($${lower.toFixed(2)} - $${upper.toFixed(2)})`);
    }

    return {
      signal,
      confidence: signal ? Math.min(bandwidth * 5, 75) : 0,
      reasons,
      indicators: { upper, mid, lower, bandwidth, price },
    };
  },
};

const MACD_MOMENTUM: AlgoDefinition = {
  name: "MACD Momentum",
  type: "macd",
  description: "Long when MACD crosses above signal, short when below.",
  defaultParams: { fast: 12, slow: 26, signal: 9 },
  computeSignal(closes, _highs, _lows, params): AlgoSignal {
    const macd = computeMACD(closes, params.fast || 12, params.slow || 26, params.signal || 9);
    const cross = detectCrossover(macd.macd, macd.signal);
    const lastMacd = lastValid(macd.macd);
    const lastSignal = lastValid(macd.signal);
    const lastHist = lastValid(macd.histogram);

    return {
      signal: cross,
      confidence: cross ? Math.min(Math.abs(lastHist || 0) * 50, 80) : 0,
      reasons: cross
        ? [`MACD ${cross === "bullish" ? "crossed above" : "crossed below"} signal line`, `Histogram: ${lastHist?.toFixed(2)}`]
        : ["No MACD crossover"],
      indicators: { macd: lastMacd || 0, signalLine: lastSignal || 0, histogram: lastHist || 0 },
    };
  },
};

const EMA_SPREAD: AlgoDefinition = {
  name: "EMA Spread",
  type: "ema_spread",
  description: "Long when EMAs converge after divergence (reversal).",
  defaultParams: { fast: 12, slow: 26 },
  computeSignal(closes, _highs, _lows, params): AlgoSignal {
    const fast = computeEMA(closes, params.fast || 12);
    const slow = computeEMA(closes, params.slow || 26);
    const len = closes.length;

    if (len < 3) return { signal: null, confidence: 0, reasons: ["Not enough data"], indicators: {} };

    const spreadNow = (fast[len - 1] - slow[len - 1]) / slow[len - 1] * 100;
    const spreadPrev = (fast[len - 2] - slow[len - 2]) / slow[len - 2] * 100;

    if (isNaN(spreadNow) || isNaN(spreadPrev)) {
      return { signal: null, confidence: 0, reasons: ["EMA not ready"], indicators: {} };
    }

    let signal: "bullish" | "bearish" | null = null;
    const reasons: string[] = [];

    // LONG: fast < slow AND spread is DECREASING (converging from below = reversal)
    if (spreadNow < 0 && Math.abs(spreadNow) < Math.abs(spreadPrev)) {
      signal = "bullish";
      reasons.push("EMAs converging from below — reversal signal");
    }
    // SHORT: fast > slow AND spread is DECREASING (converging from above)
    else if (spreadNow > 0 && Math.abs(spreadNow) < Math.abs(spreadPrev)) {
      signal = "bearish";
      reasons.push("EMAs converging from above — reversal signal");
    } else {
      reasons.push(`EMA spread: ${spreadNow.toFixed(3)}%`);
    }

    return {
      signal,
      confidence: signal ? Math.min(Math.abs(spreadPrev - spreadNow) * 100, 70) : 0,
      reasons,
      indicators: { emaFast: lastValid(fast) || 0, emaSlow: lastValid(slow) || 0, spread: spreadNow },
    };
  },
};

const RSI_ICT: AlgoDefinition = {
  name: "RSI + ICT",
  type: "rsi_ict",
  description: "RSI extremes filtered by ICT Kill Zone timing.",
  defaultParams: { rsiPeriod: 14, oversold: 35, overbought: 65 },
  computeSignal(closes, _highs, _lows, params): AlgoSignal {
    const rsi = computeRSI(closes, params.rsiPeriod || 14);
    const lastRsi = lastValid(rsi);
    const inKillZone = isKillZone();

    if (lastRsi === null) {
      return { signal: null, confidence: 0, reasons: ["RSI not ready"], indicators: {} };
    }

    let signal: "bullish" | "bearish" | null = null;
    const reasons: string[] = [];
    let confidence = 0;

    const oversold = params.oversold || 35;
    const overbought = params.overbought || 65;

    if (lastRsi < oversold) {
      signal = "bullish";
      confidence = Math.min((oversold - lastRsi) * 3, 80);
      reasons.push(`RSI ${lastRsi.toFixed(1)} < ${oversold} (oversold)`);
    } else if (lastRsi > overbought) {
      signal = "bearish";
      confidence = Math.min((lastRsi - overbought) * 3, 80);
      reasons.push(`RSI ${lastRsi.toFixed(1)} > ${overbought} (overbought)`);
    } else {
      reasons.push(`RSI ${lastRsi.toFixed(1)} — neutral zone`);
    }

    if (inKillZone && signal) {
      confidence = Math.min(confidence + 15, 90);
      reasons.push("In ICT Kill Zone — signal confirmed");
    } else if (!inKillZone && signal) {
      confidence = Math.max(confidence - 10, 20);
      reasons.push("Outside Kill Zone — lower confidence");
    }

    return {
      signal,
      confidence,
      reasons,
      indicators: { rsi: lastRsi, killZone: inKillZone ? 1 : 0 },
    };
  },
};

// ── Algo Registry ────────────────────────────────────────────

export const ALGO_REGISTRY: Record<AlgoType, AlgoDefinition> = {
  sma: SMA_CROSSOVER,
  bb: BB_REVERSION,
  macd: MACD_MOMENTUM,
  ema_spread: EMA_SPREAD,
  rsi_ict: RSI_ICT,
  dca: SMA_CROSSOVER, // DCA uses SMA as base signal
};

// ══════════════════════════════════════════════════════════════
// Strategy Runner
// ══════════════════════════════════════════════════════════════

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  algo: "sma",
  venue: "hl",
  symbol: "ETH",
  interval: "5m",
  sizeUsd: 20,
  leverage: 3,
  algoParams: { fast: 9, slow: 21 },
  takeProfitPct: 1.0,
  stopLossPct: 2.0,
  dcaEnabled: false,
  dcaSpreadPct: 2.0,
  dcaMaxCount: 3,
};

export class StrategyRunner {
  config: StrategyConfig;
  guardrails: Guardrails;
  journal: TradeJournal;
  dca: DCAEngine;

  private timer: ReturnType<typeof setInterval> | null = null;
  running: boolean = false;

  // Position state
  position: "long" | "short" | null = null;
  entryPrice: number | null = null;
  entryTime: string | null = null;
  quantity: number | null = null;

  // Tracking
  lastSignal: AlgoSignal | null = null;
  lastIndicators: TAIndicators | null = null;
  runCount: number = 0;
  lastTick: string | null = null;
  sessionId: string | null = null;
  lastError: string | null = null;

  // Event listeners
  private listeners: Array<() => void> = [];

  constructor(
    config?: Partial<StrategyConfig>,
    guardrails?: Guardrails,
    journal?: TradeJournal
  ) {
    this.config = { ...DEFAULT_STRATEGY_CONFIG, ...config };
    this.guardrails = guardrails || new Guardrails();
    this.journal = journal || new TradeJournal();
    this.dca = new DCAEngine(
      this.config.dcaSpreadPct,
      this.config.dcaMaxCount
    );
  }

  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastError = null;

    // Start journal session
    this.sessionId = this.journal.startSession({
      symbol: this.config.symbol,
      venue: this.config.venue,
      interval: this.config.interval,
      algo: this.config.algo,
      leverage: this.config.leverage,
      tradeUsd: this.config.sizeUsd,
    });

    // Run immediately, then on interval
    this.tick();
    const ms = INTERVAL_MS[this.config.interval] || 300_000;
    this.timer = setInterval(() => this.tick(), ms);
    this.notify();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.sessionId) {
      this.journal.endSession(this.sessionId);
    }

    this.notify();
  }

  updateConfig(partial: Partial<StrategyConfig>): void {
    const wasRunning = this.running;
    if (wasRunning) this.stop();
    this.config = { ...this.config, ...partial };

    // Update algo params to defaults if algo changed
    if (partial.algo) {
      const algo = ALGO_REGISTRY[this.config.algo];
      if (algo) this.config.algoParams = { ...algo.defaultParams };
    }

    // Update DCA
    this.dca = new DCAEngine(this.config.dcaSpreadPct, this.config.dcaMaxCount);
    this.notify();
  }

  // ── Core Tick ──────────────────────────────────────────────

  private async tick(): Promise<void> {
    try {
      // 1. Fetch klines
      const closes = await this.fetchCloses();
      if (!closes || closes.length < 30) {
        this.lastError = "Not enough candle data";
        this.notify();
        return;
      }

      // 2. Compute TA indicators
      this.lastIndicators = computeAllIndicators(closes);

      // 3. Run algo signal
      const algo = ALGO_REGISTRY[this.config.algo];
      const highs = closes; // Approximation — klines would give real OHLC
      const lows = closes;
      this.lastSignal = algo.computeSignal(closes, highs, lows, this.config.algoParams);

      // 4. Check ROE exits
      if (this.position && this.entryPrice) {
        const currentPrice = closes[closes.length - 1];
        const roe = this.calcROE(currentPrice);

        // Take profit
        if (roe >= this.config.takeProfitPct) {
          await this.closePosition(currentPrice, "take_profit", roe);
          this.runCount++;
          this.lastTick = new Date().toISOString();
          this.notify();
          return;
        }

        // Stop loss
        if (roe <= -this.config.stopLossPct) {
          await this.closePosition(currentPrice, "stop_loss", roe);
          this.runCount++;
          this.lastTick = new Date().toISOString();
          this.notify();
          return;
        }

        // Check DCA
        if (this.config.dcaEnabled && this.quantity) {
          const dcaSide = this.position === "long" ? "buy" : "sell";
          if (this.dca.shouldDCA(currentPrice, dcaSide)) {
            const dcaQty = this.dca.getDCASize(this.quantity);
            await this.executeOrder(dcaSide, dcaQty, currentPrice, "dca");
            this.dca.recordDCA(currentPrice, dcaQty);
          }
        }
      }

      // 5. Enter new position if no current position and signal present
      if (!this.position && this.lastSignal.signal) {
        const side = this.lastSignal.signal === "bullish" ? "buy" : "sell";
        const price = closes[closes.length - 1];
        const quantity = this.calcQuantity(price);

        // Check guardrails
        const check = this.guardrails.canExecute(this.config.sizeUsd);
        if (!check.allowed) {
          this.lastError = check.reason;
          this.runCount++;
          this.lastTick = new Date().toISOString();
          this.notify();
          return;
        }

        await this.executeOrder(side, quantity, price, "entry");
        this.position = this.lastSignal.signal === "bullish" ? "long" : "short";
        this.entryPrice = price;
        this.entryTime = new Date().toISOString();
        this.quantity = quantity;

        // Set DCA initial
        if (this.config.dcaEnabled) {
          this.dca.setInitialEntry(price, quantity);
        }

        this.lastError = null;
      }

      this.runCount++;
      this.lastTick = new Date().toISOString();
      this.notify();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Tick failed";
      this.notify();
    }
  }

  // ── Data Fetching ──────────────────────────────────────────

  private async fetchCloses(): Promise<number[]> {
    try {
      let data: unknown;
      if (this.config.venue === "aster") {
        data = await api.call("aster_klines", {
          symbol: this.config.symbol + "USDT",
          interval: this.config.interval,
          limit: 100,
        });
      } else {
        data = await api.call("get_klines", {
          symbol: this.config.symbol,
          interval: this.config.interval,
          limit: 100,
          venue: "hl",
        });
      }

      // Parse closes from klines response
      const klines = (data as Record<string, unknown>).data || data;
      if (Array.isArray(klines)) {
        return klines.map((k: unknown) => {
          if (Array.isArray(k)) return Number(k[4]); // [time, open, high, low, close, volume]
          const kObj = k as Record<string, unknown>;
          return Number(kObj.close || kObj.c || kObj[4] || 0);
        }).filter(v => v > 0);
      }
      return [];
    } catch {
      return [];
    }
  }

  // ── Order Execution ────────────────────────────────────────

  private async executeOrder(
    side: "buy" | "sell",
    quantity: number,
    price: number,
    type: string
  ): Promise<void> {
    try {
      if (this.config.venue === "aster") {
        await api.call("aster_set_leverage", {
          symbol: this.config.symbol + "USDT",
          leverage: this.config.leverage,
        });
        await api.call("aster_place_order", {
          symbol: this.config.symbol + "USDT",
          side: side.toUpperCase(),
          quantity,
          order_type: "MARKET",
        });
      } else {
        await api.call("place_hl_order", {
          coin: this.config.symbol,
          side,
          size: quantity,
          order_type: "market",
        });
      }

      // Log to journal
      if (this.sessionId) {
        this.journal.logTrade({
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          signal: side === "buy" ? "bullish" : "bearish",
          side,
          symbol: this.config.symbol,
          venue: this.config.venue,
          entryPrice: price,
          quantity,
          usdValue: this.config.sizeUsd,
          leverage: this.config.leverage,
          success: true,
          position: side === "buy" ? "long" : "short",
          indicators: this.lastSignal?.indicators ? {
            smaFast: this.lastSignal.indicators.smaFast,
            smaSlow: this.lastSignal.indicators.smaSlow,
            rsi: this.lastSignal.indicators.rsi,
            spreadPct: this.lastSignal.indicators.spread,
          } : undefined,
        });
      }

      this.guardrails.recordTrade();
    } catch (err) {
      // Log failed trade
      if (this.sessionId) {
        this.journal.logTrade({
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          signal: side === "buy" ? "bullish" : "bearish",
          side,
          symbol: this.config.symbol,
          venue: this.config.venue,
          entryPrice: price,
          quantity,
          usdValue: this.config.sizeUsd,
          leverage: this.config.leverage,
          success: false,
          position: null,
        });
      }
      throw err;
    }
  }

  // ── Position Management ────────────────────────────────────

  private async closePosition(
    exitPrice: number,
    reason: "take_profit" | "stop_loss" | "close",
    roePct: number
  ): Promise<void> {
    if (!this.position || !this.entryPrice) return;

    try {
      if (this.config.venue === "aster") {
        // Close by placing opposite order
        const closeSide = this.position === "long" ? "SELL" : "BUY";
        await api.call("aster_place_order", {
          symbol: this.config.symbol + "USDT",
          side: closeSide,
          quantity: this.quantity,
          order_type: "MARKET",
        });
      } else {
        await api.call("close_hl_position", { coin: this.config.symbol });
      }
    } catch {
      // Best effort close
    }

    // Calculate P&L
    const pnlPct = roePct;
    const pnlUsd = (this.config.sizeUsd * pnlPct) / 100;

    // Log position event
    if (this.sessionId) {
      const holdTimeS = this.entryTime
        ? Math.floor((Date.now() - new Date(this.entryTime).getTime()) / 1000)
        : undefined;

      this.journal.logPositionEvent({
        tradeId: "", // best effort
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        eventType: reason,
        exitPrice,
        pnlUsd,
        pnlPct,
        holdTimeS,
        reason,
      });
    }

    this.guardrails.recordTrade(pnlUsd);

    // Reset position
    this.position = null;
    this.entryPrice = null;
    this.entryTime = null;
    this.quantity = null;
    this.dca.reset();
  }

  // ── Calculations ───────────────────────────────────────────

  calcROE(currentPrice: number): number {
    if (!this.entryPrice || !this.position) return 0;
    if (this.position === "long") {
      return ((currentPrice - this.entryPrice) / this.entryPrice) * 100 * this.config.leverage;
    }
    return ((this.entryPrice - currentPrice) / this.entryPrice) * 100 * this.config.leverage;
  }

  private calcQuantity(price: number): number {
    const raw = this.config.sizeUsd / price;
    const symbol = this.config.symbol.toUpperCase();
    const decimals = HL_SIZE_DECIMALS[symbol] ?? 4;
    const factor = Math.pow(10, decimals);
    return Math.floor(raw * factor) / factor;
  }

  // ── Status ─────────────────────────────────────────────────

  status(): StrategyStatus {
    return {
      running: this.running,
      config: { ...this.config },
      position: this.position,
      entryPrice: this.entryPrice,
      currentROE: this.entryPrice && this.lastIndicators
        ? this.calcROE(this.lastIndicators.closes[this.lastIndicators.closes.length - 1])
        : null,
      lastSignal: this.lastSignal,
      runCount: this.runCount,
      lastTick: this.lastTick,
      sessionId: this.sessionId,
    };
  }
}
