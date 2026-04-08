/**
 * Trade Journal — Session tracking, trade logging, analytics.
 * Ported from Python hyper-sentinel/core/trade_journal.py (375 lines).
 * Uses localStorage instead of SQLite.
 */

import type {
  TradeSession,
  TradeEntry,
  PositionEvent,
  SessionSummary,
} from "./algos/types";

const STORAGE_KEY = "sentinel_trade_journal";

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface JournalData {
  sessions: TradeSession[];
  trades: TradeEntry[];
  events: PositionEvent[];
}

export class TradeJournal {
  private data: JournalData;

  constructor() {
    this.data = { sessions: [], trades: [], events: [] };
    this.load();
  }

  // ── Sessions ───────────────────────────────────────────────

  startSession(config: Partial<TradeSession>): string {
    const session: TradeSession = {
      id: genId(),
      startedAt: new Date().toISOString(),
      symbol: config.symbol || "ETH",
      venue: config.venue || "hl",
      interval: config.interval || "5m",
      algo: config.algo || "sma",
      leverage: config.leverage || 3,
      tradeUsd: config.tradeUsd || 20,
      totalTrades: 0,
      totalPnl: 0,
      status: "active",
    };
    this.data.sessions.push(session);
    this.save();
    return session.id;
  }

  endSession(sessionId: string): void {
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (session) {
      session.endedAt = new Date().toISOString();
      session.status = "stopped";
      this.save();
    }
  }

  getActiveSession(): TradeSession | null {
    return this.data.sessions.find(s => s.status === "active") || null;
  }

  // ── Trades ─────────────────────────────────────────────────

  logTrade(entry: Omit<TradeEntry, "id">): string {
    const trade: TradeEntry = { id: genId(), ...entry };
    this.data.trades.push(trade);

    // Update session stats
    const session = this.data.sessions.find(s => s.id === entry.sessionId);
    if (session) {
      session.totalTrades++;
      this.save();
    }

    this.save();
    return trade.id;
  }

  // ── Position Events ────────────────────────────────────────

  logPositionEvent(event: Omit<PositionEvent, "id">): string {
    const pe: PositionEvent = { id: genId(), ...event };
    this.data.events.push(pe);

    // Update session P&L
    const session = this.data.sessions.find(s => s.id === event.sessionId);
    if (session) {
      session.totalPnl += event.pnlUsd;
    }

    this.save();
    return pe.id;
  }

  // ── Analytics ──────────────────────────────────────────────

  winRate(sessionId?: string): { total: number; wins: number; losses: number; winRatePct: number } {
    const events = sessionId
      ? this.data.events.filter(e => e.sessionId === sessionId)
      : this.data.events;

    const total = events.length;
    const wins = events.filter(e => e.pnlUsd > 0).length;
    const losses = events.filter(e => e.pnlUsd <= 0).length;
    const winRatePct = total > 0 ? (wins / total) * 100 : 0;

    return { total, wins, losses, winRatePct };
  }

  sessionSummary(sessionId: string): SessionSummary | null {
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    const trades = this.data.trades.filter(t => t.sessionId === sessionId);
    const events = this.data.events.filter(e => e.sessionId === sessionId);
    const wr = this.winRate(sessionId);
    const pnls = events.map(e => e.pnlUsd);

    return {
      session,
      trades,
      events,
      winRate: wr.winRatePct,
      totalPnl: pnls.reduce((s, p) => s + p, 0),
      avgPnl: pnls.length > 0 ? pnls.reduce((s, p) => s + p, 0) / pnls.length : 0,
      bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
      worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    };
  }

  equityCurve(sessionId: string): { timestamp: string; pnlUsd: number; cumulativePnl: number }[] {
    const events = this.data.events
      .filter(e => e.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let cumulative = 0;
    return events.map(e => {
      cumulative += e.pnlUsd;
      return { timestamp: e.timestamp, pnlUsd: e.pnlUsd, cumulativePnl: cumulative };
    });
  }

  allSessions(): TradeSession[] {
    return [...this.data.sessions].reverse();
  }

  recentTrades(limit: number = 20): TradeEntry[] {
    return this.data.trades.slice(-limit).reverse();
  }

  recentEvents(sessionId?: string, limit: number = 20): PositionEvent[] {
    const events = sessionId
      ? this.data.events.filter(e => e.sessionId === sessionId)
      : this.data.events;
    return events.slice(-limit).reverse();
  }

  // ── Persistence ────────────────────────────────────────────

  private save(): void {
    if (typeof window === "undefined") return;
    try {
      // Keep last 100 sessions, 500 trades, 500 events
      const data: JournalData = {
        sessions: this.data.sessions.slice(-100),
        trades: this.data.trades.slice(-500),
        events: this.data.events.slice(-500),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* storage full */ }
  }

  private load(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const data = JSON.parse(stored) as JournalData;
      if (data.sessions) this.data.sessions = data.sessions;
      if (data.trades) this.data.trades = data.trades;
      if (data.events) this.data.events = data.events;
    } catch { /* corrupt data, use empty */ }
  }

  clearAll(): void {
    this.data = { sessions: [], trades: [], events: [] };
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
