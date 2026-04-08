/**
 * Trading Guardrails — Kill switch, daily limits, trade gating.
 * Ported from Python hyper-sentinel/core/sentinel.py lines 59-115.
 */

import type { GuardrailConfig, GuardrailStatus } from "./algos/types";

const STORAGE_KEY = "sentinel_guardrails";

const DEFAULT_CONFIG: GuardrailConfig = {
  maxTradeUsd: 500,
  maxDailyTrades: 5,
  maxDailyLossUsd: 1000,
  autoExecuteEnabled: false,
  killSwitch: false,
};

export class Guardrails {
  config: GuardrailConfig;
  private tradesToday: number = 0;
  private dailyPnl: number = 0;
  private tradeDate: string;

  constructor(config?: Partial<GuardrailConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tradeDate = this.today();
    this.load();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private resetIfNewDay(): void {
    const now = this.today();
    if (now !== this.tradeDate) {
      this.tradesToday = 0;
      this.dailyPnl = 0;
      this.tradeDate = now;
      this.save();
    }
  }

  canExecute(tradeUsd: number): { allowed: boolean; reason: string } {
    this.resetIfNewDay();

    if (this.config.killSwitch) {
      return { allowed: false, reason: "Kill switch engaged" };
    }

    if (!this.config.autoExecuteEnabled) {
      return { allowed: false, reason: "Auto-execute disabled" };
    }

    if (this.tradesToday >= this.config.maxDailyTrades) {
      return { allowed: false, reason: `Daily trade limit reached (${this.config.maxDailyTrades})` };
    }

    if (tradeUsd > this.config.maxTradeUsd) {
      return { allowed: false, reason: `Trade $${tradeUsd} exceeds max $${this.config.maxTradeUsd}` };
    }

    if (this.dailyPnl < 0 && Math.abs(this.dailyPnl) >= this.config.maxDailyLossUsd) {
      return { allowed: false, reason: `Daily loss limit reached ($${Math.abs(this.dailyPnl).toFixed(2)} / $${this.config.maxDailyLossUsd})` };
    }

    return { allowed: true, reason: "OK" };
  }

  recordTrade(pnl: number = 0): void {
    this.resetIfNewDay();
    this.tradesToday++;
    this.dailyPnl += pnl;
    this.save();
  }

  engageKillSwitch(): void {
    this.config.killSwitch = true;
    this.save();
  }

  disengageKillSwitch(): void {
    this.config.killSwitch = false;
    this.save();
  }

  setAutoExecute(enabled: boolean): void {
    this.config.autoExecuteEnabled = enabled;
    this.save();
  }

  updateConfig(partial: Partial<GuardrailConfig>): void {
    this.config = { ...this.config, ...partial };
    this.save();
  }

  status(): GuardrailStatus {
    this.resetIfNewDay();
    return {
      autoExecute: this.config.autoExecuteEnabled,
      killSwitch: this.config.killSwitch,
      tradesToday: `${this.tradesToday}/${this.config.maxDailyTrades}`,
      dailyPnl: `${this.dailyPnl >= 0 ? "+" : ""}$${this.dailyPnl.toFixed(2)}`,
      maxTrade: this.config.maxTradeUsd,
      maxDailyLoss: this.config.maxDailyLossUsd,
    };
  }

  // ── Persistence ────────────────────────────────────────────

  private save(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        config: this.config,
        tradesToday: this.tradesToday,
        dailyPnl: this.dailyPnl,
        tradeDate: this.tradeDate,
      }));
    } catch { /* storage full */ }
  }

  private load(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const data = JSON.parse(stored);
      if (data.config) this.config = { ...this.config, ...data.config };
      if (data.tradeDate === this.today()) {
        this.tradesToday = data.tradesToday || 0;
        this.dailyPnl = data.dailyPnl || 0;
      }
      this.tradeDate = data.tradeDate || this.today();
    } catch { /* corrupt data, use defaults */ }
  }
}
