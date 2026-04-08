"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { StrategyRunner, ALGO_REGISTRY, DEFAULT_STRATEGY_CONFIG } from "@/lib/strategy-runner";
import { Guardrails } from "@/lib/guardrails";
import { TradeJournal } from "@/lib/trade-journal";
import { lastValid } from "@/lib/ta-engine";
import type { AlgoType, StrategyConfig, StrategyStatus } from "@/lib/algos/types";

// ── Constants ────────────────────────────────────────────────

const ALGO_OPTIONS: { value: AlgoType; label: string }[] = [
  { value: "sma", label: "SMA Crossover" },
  { value: "bb", label: "BB Reversion" },
  { value: "macd", label: "MACD Momentum" },
  { value: "ema_spread", label: "EMA Spread" },
  { value: "rsi_ict", label: "RSI + ICT" },
];

const VENUE_OPTIONS = [
  { value: "hl" as const, label: "Hyperliquid" },
  { value: "aster" as const, label: "Aster DEX" },
];

const INTERVAL_OPTIONS = ["1m", "5m", "15m", "1h", "4h"];

const CONFIG_STORAGE_KEY = "sentinel_strategy_config";

// ── Persistence ──────────────────────────────────────────────

function loadConfig(): Partial<StrategyConfig> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function saveConfig(config: StrategyConfig): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config)); } catch { /* full */ }
}

// ── Component ────────────────────────────────────────────────

export default function StrategyPane() {
  const runnerRef = useRef<StrategyRunner | null>(null);
  const guardrailsRef = useRef<Guardrails>(new Guardrails());
  const journalRef = useRef<TradeJournal>(new TradeJournal());

  // Config state
  const [config, setConfig] = useState<StrategyConfig>(() => ({
    ...DEFAULT_STRATEGY_CONFIG,
    ...loadConfig(),
  }));

  // Runtime state
  const [status, setStatus] = useState<StrategyStatus | null>(null);
  const [, setTick] = useState(0); // Force re-render on tick

  // Initialize runner
  useEffect(() => {
    const runner = new StrategyRunner(config, guardrailsRef.current, journalRef.current);
    runnerRef.current = runner;

    const unsub = runner.onChange(() => {
      setStatus(runner.status());
      setTick(t => t + 1);
    });

    return () => {
      unsub();
      runner.stop();
    };
    // Only re-create on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateConfig = useCallback((partial: Partial<StrategyConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      // Update algo params when algo changes
      if (partial.algo) {
        const algo = ALGO_REGISTRY[partial.algo];
        if (algo) next.algoParams = { ...algo.defaultParams };
      }
      saveConfig(next);
      runnerRef.current?.updateConfig(partial);
      return next;
    });
  }, []);

  const handleStart = () => {
    if (!runnerRef.current) return;
    runnerRef.current.updateConfig(config);
    runnerRef.current.start();
    setStatus(runnerRef.current.status());
  };

  const handleStop = () => {
    runnerRef.current?.stop();
    setStatus(runnerRef.current?.status() || null);
  };

  const running = status?.running || false;
  const guardrailStatus = guardrailsRef.current.status();
  const journal = journalRef.current;
  const recentEvents = journal.recentEvents(status?.sessionId || undefined, 10);
  const winRate = journal.winRate(status?.sessionId || undefined);
  const ind = runnerRef.current?.lastIndicators;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: "#08080C" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,20,0.5)" }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: running ? "#00FF88" : "#FF4444", boxShadow: running ? "0 0 6px rgba(0,255,136,0.4)" : "0 0 6px rgba(255,68,68,0.4)" }} />
          <span className="text-[11px] font-semibold" style={{ color: "#E4E4E7" }}>Strategy Engine</span>
          {running && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,255,136,0.08)", color: "#00FF88", border: "1px solid rgba(0,255,136,0.15)" }}>
              LIVE
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={running ? handleStop : handleStart}
            className="text-[10px] font-bold px-3 py-1 rounded transition-colors"
            style={{
              background: running ? "rgba(255,68,68,0.15)" : "rgba(0,255,136,0.15)",
              color: running ? "#FF4444" : "#00FF88",
              border: `1px solid ${running ? "rgba(255,68,68,0.3)" : "rgba(0,255,136,0.3)"}`,
            }}
          >
            {running ? "STOP" : "START"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-3 space-y-3">

          {/* ── CONFIGURATION ─────────────────────────────── */}
          <Section title="CONFIGURATION">
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Algorithm" value={config.algo} options={ALGO_OPTIONS.map(o => ({ value: o.value, label: o.label }))} onChange={v => updateConfig({ algo: v as AlgoType })} disabled={running} />
              <SelectField label="Venue" value={config.venue} options={VENUE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} onChange={v => updateConfig({ venue: v as "hl" | "aster" })} disabled={running} />
              <InputField label="Symbol" value={config.symbol} onChange={v => updateConfig({ symbol: v.toUpperCase() })} disabled={running} />
              <SelectField label="Interval" value={config.interval} options={INTERVAL_OPTIONS.map(i => ({ value: i, label: i }))} onChange={v => updateConfig({ interval: v })} disabled={running} />
              <InputField label="Size (USD)" value={String(config.sizeUsd)} onChange={v => updateConfig({ sizeUsd: Number(v) || 20 })} type="number" disabled={running} />
              <div>
                <label className="block text-[9px] font-mono mb-0.5" style={{ color: "#71717A" }}>Leverage: {config.leverage}x</label>
                <input
                  type="range" min={1} max={20} step={1} value={config.leverage}
                  onChange={e => updateConfig({ leverage: Number(e.target.value) })}
                  disabled={running}
                  className="w-full accent-green-500"
                  style={{ accentColor: "#00FF88" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <InputField label="TP %" value={String(config.takeProfitPct)} onChange={v => updateConfig({ takeProfitPct: Number(v) || 1.0 })} type="number" disabled={running} />
              <InputField label="SL %" value={String(config.stopLossPct)} onChange={v => updateConfig({ stopLossPct: Number(v) || 2.0 })} type="number" disabled={running} />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-1.5 text-[10px]" style={{ color: "#A1A1AA" }}>
                <input
                  type="checkbox" checked={config.dcaEnabled}
                  onChange={e => updateConfig({ dcaEnabled: e.target.checked })}
                  disabled={running}
                  className="rounded"
                />
                DCA Enabled
              </label>
              {config.dcaEnabled && (
                <>
                  <span className="text-[9px] font-mono" style={{ color: "#52525B" }}>
                    Spread: {config.dcaSpreadPct}%
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: "#52525B" }}>
                    Max: {config.dcaMaxCount}
                  </span>
                </>
              )}
            </div>
          </Section>

          {/* ── GUARDRAILS ────────────────────────────────── */}
          <Section title="GUARDRAILS" right={
            <button
              onClick={() => {
                if (guardrailsRef.current.config.killSwitch) {
                  guardrailsRef.current.disengageKillSwitch();
                } else {
                  guardrailsRef.current.engageKillSwitch();
                  handleStop();
                }
                setTick(t => t + 1);
              }}
              className="text-[9px] font-bold px-2 py-1 rounded transition-colors"
              style={{
                background: guardrailStatus.killSwitch ? "rgba(255,68,68,0.2)" : "rgba(255,68,68,0.08)",
                color: "#FF4444",
                border: "1px solid rgba(255,68,68,0.3)",
              }}
            >
              {guardrailStatus.killSwitch ? "KILL SWITCH ON" : "KILL SWITCH"}
            </button>
          }>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
              <span style={{ color: "#71717A" }}>Max Trade</span>
              <span style={{ color: "#E4E4E7" }}>${guardrailStatus.maxTrade}</span>
              <span style={{ color: "#71717A" }}>Daily Trades</span>
              <span style={{ color: "#E4E4E7" }}>{guardrailStatus.tradesToday}</span>
              <span style={{ color: "#71717A" }}>Daily P&L</span>
              <span style={{ color: guardrailStatus.dailyPnl.startsWith("+") ? "#00FF88" : guardrailStatus.dailyPnl === "+$0.00" ? "#71717A" : "#FF4444" }}>
                {guardrailStatus.dailyPnl} / ${guardrailStatus.maxDailyLoss}
              </span>
              <span style={{ color: "#71717A" }}>Auto Execute</span>
              <button
                onClick={() => {
                  guardrailsRef.current.setAutoExecute(!guardrailsRef.current.config.autoExecuteEnabled);
                  setTick(t => t + 1);
                }}
                className="text-left text-[10px] font-bold"
                style={{ color: guardrailStatus.autoExecute ? "#00FF88" : "#FF4444" }}
              >
                {guardrailStatus.autoExecute ? "ON" : "OFF"}
              </button>
            </div>
          </Section>

          {/* ── LIVE STATUS ───────────────────────────────── */}
          <Section title="LIVE STATUS">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
              <span style={{ color: "#71717A" }}>Position</span>
              <span style={{ color: status?.position ? "#00E5FF" : "#52525B" }}>
                {status?.position
                  ? `${status.position.toUpperCase()} ${config.symbol} @ $${status.entryPrice?.toLocaleString()}`
                  : "None"}
              </span>
              <span style={{ color: "#71717A" }}>ROE</span>
              <span style={{
                color: status?.currentROE
                  ? (status.currentROE >= 0 ? "#00FF88" : "#FF4444")
                  : "#52525B"
              }}>
                {status?.currentROE != null ? `${status.currentROE >= 0 ? "+" : ""}${status.currentROE.toFixed(2)}%` : "--"}
              </span>
              <span style={{ color: "#71717A" }}>Last Signal</span>
              <span style={{
                color: status?.lastSignal?.signal === "bullish" ? "#00FF88"
                  : status?.lastSignal?.signal === "bearish" ? "#FF4444"
                  : "#52525B"
              }}>
                {status?.lastSignal?.signal
                  ? `${status.lastSignal.signal.toUpperCase()} (${status.lastSignal.confidence}%)`
                  : "None"}
              </span>
              <span style={{ color: "#71717A" }}>Runs</span>
              <span style={{ color: "#E4E4E7" }}>
                {status?.runCount || 0}
                {status?.lastTick && (
                  <span style={{ color: "#3F3F46" }}> | {new Date(status.lastTick).toLocaleTimeString("en-US", { hour12: false })}</span>
                )}
              </span>
            </div>
            {status?.lastSignal?.reasons && status.lastSignal.reasons.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {status.lastSignal.reasons.map((r, i) => (
                  <p key={i} className="text-[9px] font-mono" style={{ color: "#52525B" }}>
                    {r}
                  </p>
                ))}
              </div>
            )}
            {runnerRef.current?.lastError && (
              <p className="text-[9px] font-mono mt-1" style={{ color: "#FF4444" }}>
                {runnerRef.current.lastError}
              </p>
            )}
          </Section>

          {/* ── JOURNAL ───────────────────────────────────── */}
          <Section title="JOURNAL" right={
            <span className="text-[9px] font-mono" style={{ color: winRate.total > 0 ? "#00FF88" : "#52525B" }}>
              Win Rate: {winRate.winRatePct.toFixed(1)}% ({winRate.wins}/{winRate.total})
            </span>
          }>
            {recentEvents.length === 0 ? (
              <p className="text-[9px] font-mono" style={{ color: "#3F3F46" }}>No trades yet</p>
            ) : (
              <div className="text-[9px] font-mono">
                <div className="grid grid-cols-5 gap-1 mb-1 pb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "#52525B" }}>Time</span>
                  <span style={{ color: "#52525B" }}>Type</span>
                  <span style={{ color: "#52525B" }}>Exit</span>
                  <span style={{ color: "#52525B" }}>P&L</span>
                  <span style={{ color: "#52525B" }}>ROE</span>
                </div>
                {recentEvents.map(e => (
                  <div key={e.id} className="grid grid-cols-5 gap-1 py-0.5">
                    <span style={{ color: "#71717A" }}>{new Date(e.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
                    <span style={{ color: e.eventType === "take_profit" ? "#00FF88" : "#FF4444" }}>
                      {e.eventType === "take_profit" ? "TP" : e.eventType === "stop_loss" ? "SL" : e.eventType}
                    </span>
                    <span style={{ color: "#A1A1AA" }}>${e.exitPrice.toLocaleString()}</span>
                    <span style={{ color: e.pnlUsd >= 0 ? "#00FF88" : "#FF4444" }}>
                      {e.pnlUsd >= 0 ? "+" : ""}${e.pnlUsd.toFixed(2)}
                    </span>
                    <span style={{ color: e.pnlPct >= 0 ? "#00FF88" : "#FF4444" }}>
                      {e.pnlPct >= 0 ? "+" : ""}{e.pnlPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── TA INDICATORS ─────────────────────────────── */}
          <Section title="TA INDICATORS">
            {ind ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                <span style={{ color: "#71717A" }}>SMA(9)</span>
                <span style={{ color: "#E4E4E7" }}>${(lastValid(ind.sma9) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span style={{ color: "#71717A" }}>SMA(21)</span>
                <span style={{ color: "#E4E4E7" }}>${(lastValid(ind.sma21) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span style={{ color: "#71717A" }}>RSI(14)</span>
                <span style={{
                  color: (() => {
                    const rsi = lastValid(ind.rsi14);
                    if (!rsi) return "#52525B";
                    if (rsi < 30) return "#00FF88";
                    if (rsi > 70) return "#FF4444";
                    return "#E4E4E7";
                  })()
                }}>
                  {lastValid(ind.rsi14)?.toFixed(1) || "--"}
                </span>
                <span style={{ color: "#71717A" }}>MACD</span>
                <span style={{ color: (lastValid(ind.macd.histogram) || 0) >= 0 ? "#00FF88" : "#FF4444" }}>
                  {lastValid(ind.macd.histogram)?.toFixed(2) || "--"}
                </span>
                <span style={{ color: "#71717A" }}>BB</span>
                <span style={{ color: "#A1A1AA" }}>
                  ${(lastValid(ind.bb.lower) || 0).toFixed(0)} / ${(lastValid(ind.bb.mid) || 0).toFixed(0)} / ${(lastValid(ind.bb.upper) || 0).toFixed(0)}
                </span>
                <span style={{ color: "#71717A" }}>Price</span>
                <span style={{ color: "#00E5FF" }}>${(ind.closes[ind.closes.length - 1] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <p className="text-[9px] font-mono" style={{ color: "#3F3F46" }}>Start the engine to see live indicators</p>
            )}
          </Section>

        </div>
      </div>
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[9px] font-bold tracking-wider" style={{ color: "#52525B" }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function SelectField({ label, value, options, onChange, disabled }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[9px] font-mono mb-0.5" style={{ color: "#71717A" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-[10px] font-mono px-2 py-1.5 rounded-md outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#E4E4E7",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[9px] font-mono mb-0.5" style={{ color: "#71717A" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-[10px] font-mono px-2 py-1.5 rounded-md outline-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#E4E4E7",
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  );
}
