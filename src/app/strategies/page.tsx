"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";
import { useStrategyStatus, useAlgoList } from "@/lib/hooks";

// Fallback algo list — used if backend is unreachable
const FALLBACK_ALGOS = [
  { id: "sma", name: "SMA Crossover", icon: "SMA", risk: "Medium", riskColor: "var(--accent-yellow)", best: "Trending", desc: "Fast SMA crosses slow SMA", leverage: "1-3x" },
  { id: "bb", name: "BB Reversion", icon: "BB", risk: "Low", riskColor: "var(--accent-green)", best: "Ranging", desc: "Price touches Bollinger Bands", leverage: "1-2x" },
  { id: "macd", name: "MACD Momentum", icon: "MACD", risk: "High", riskColor: "var(--accent-red)", best: "Strong Trends", desc: "MACD line crosses signal", leverage: "2-5x" },
  { id: "ema_spread", name: "EMA Spread", icon: "EMA", risk: "Medium", riskColor: "var(--accent-yellow)", best: "Reversal", desc: "Fast/slow EMA spread reversal", leverage: "1-3x" },
  { id: "rsi_ict", name: "RSI + ICT", icon: "RSI", risk: "Medium", riskColor: "var(--accent-yellow)", best: "Filtered", desc: "RSI extremes + ICT kill zones", leverage: "2-5x" },
  { id: "gain_ema", name: "Gain EMA", icon: "GAIN", risk: "Low", riskColor: "var(--accent-green)", best: "Any", desc: "Price at EMA level + ROE exit", leverage: "1-2x" },
];

// TODO: wire to /api/v1/strategy/journal when backend endpoint exists
const JOURNAL_TRADES = [
  { time: "03:42", symbol: "BTC", algo: "SMA", side: "Long", leverage: "3x", entry: "$86,500", exit: "$87,100", pnl: "+$42.00", pnlColor: "var(--accent-green)" },
  { time: "03:18", symbol: "ETH", algo: "BB", side: "Short", leverage: "2x", entry: "$3,300", exit: "$3,274", pnl: "+$18.20", pnlColor: "var(--accent-green)" },
  { time: "02:55", symbol: "BTC", algo: "SMA", side: "Long", leverage: "3x", entry: "$87,200", exit: "$86,900", pnl: "-$21.00", pnlColor: "var(--accent-red)" },
  { time: "02:30", symbol: "ETH", algo: "MACD", side: "Long", leverage: "5x", entry: "$3,250", exit: "$3,310", pnl: "+$67.50", pnlColor: "var(--accent-green)" },
  { time: "01:15", symbol: "SOL", algo: "EMA", side: "Short", leverage: "2x", entry: "$170.00", exit: "$168.50", pnl: "+$8.40", pnlColor: "var(--accent-green)" },
];

export default function StrategiesPage() {
  const [selectedAlgo, setSelectedAlgo] = useState("sma");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    venue: "hl",
    symbol: "BTC",
    interval: "5m",
    leverage: "3",
    tradeUSD: "100",
  });
  const [journalTab, setJournalTab] = useState("Trades");

  // Fetch live strategy status (polls every 5s when running)
  const { data: statusData } = useStrategyStatus({ refetchInterval: isRunning ? 5000 : 30000 });

  // Fetch algo list from backend
  const { data: algoData } = useAlgoList();

  // Parse backend algo list or fall back to hardcoded
  const algos = (() => {
    if (!algoData) return FALLBACK_ALGOS;
    const d = algoData as Record<string, unknown>;
    const inner = d.data as Record<string, unknown> | undefined;
    const raw = inner?.algos ?? (d.algos as unknown[]) ?? inner;
    if (!Array.isArray(raw)) return FALLBACK_ALGOS;
    return raw.map((a: Record<string, unknown>) => ({
      id: (a.key ?? a.name ?? a.id) as string,
      name: (a.name ?? a.key) as string,
      icon: ((a.key ?? a.name ?? a.id) as string).toUpperCase().slice(0, 4),
      risk: "Medium",
      riskColor: "var(--accent-yellow)",
      best: (a.best_for ?? "") as string,
      desc: (a.description ?? a.desc ?? "") as string,
      leverage: "1-5x",
    }));
  })();

  // Sync running state + config from backend on mount
  useEffect(() => {
    if (!statusData) return;
    const sd = statusData as Record<string, unknown>;
    const s = (sd.data ?? statusData) as Record<string, unknown>;
    if (typeof s.running === "boolean") setIsRunning(s.running);
    if (s.algo) setSelectedAlgo(String(s.algo));
    if (s.venue) setConfig(prev => ({ ...prev, venue: String(s.venue) }));
    if (s.symbol) setConfig(prev => ({ ...prev, symbol: String(s.symbol) }));
    if (s.interval) setConfig(prev => ({ ...prev, interval: String(s.interval) }));
    if (s.leverage) setConfig(prev => ({ ...prev, leverage: String(s.leverage) }));
    if (s.trade_usd) setConfig(prev => ({ ...prev, tradeUSD: String(s.trade_usd) }));
  }, [statusData]);

  const updateConfig = (key: string, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Send config to backend
  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      await api.strategyConfig({
        algo: selectedAlgo,
        symbol: config.symbol,
        venue: config.venue,
        interval: config.interval,
        leverage: parseInt(config.leverage) || 3,
        trade_usd: parseFloat(config.tradeUSD) || 100,
      });
    } catch { /* silent — config sync is best-effort */ }
    setIsSaving(false);
  }, [selectedAlgo, config]);

  const handleStart = async () => {
    await saveConfig();
    try {
      await api.strategyStart();
      setIsRunning(true);
    } catch (e) {
      console.error("Failed to start strategy:", e);
    }
  };

  const handleStop = async () => {
    try {
      await api.strategyStop();
      setIsRunning(false);
    } catch (e) {
      console.error("Failed to stop strategy:", e);
    }
  };

  return (
    <AuthGuard>
    <AppLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Algo Trading</h1>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>{algos.length} strategies · paper trading · trade journal</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn-secondary"
              onClick={saveConfig}
              disabled={isSaving}
              style={{ opacity: isSaving ? 0.5 : 1 }}
            >
              {isSaving ? "Saving..." : "Save Config"}
            </button>
            {isRunning ? (
              <button className="btn-danger" onClick={handleStop}>■ Stop Strategy</button>
            ) : (
              <button className="btn-primary" onClick={handleStart}>Start Strategy</button>
            )}
          </div>
        </div>

        {/* Algorithm Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {algos.map(algo => (
            <button
              key={algo.id}
              onClick={() => setSelectedAlgo(algo.id)}
              className="p-4 rounded-xl text-center transition"
              style={{
                background: selectedAlgo === algo.id ? "rgba(0,255,136,0.08)" : "var(--bg-panel)",
                border: `1px solid ${selectedAlgo === algo.id ? "var(--accent-green)" : "var(--border)"}`,
                boxShadow: selectedAlgo === algo.id ? "var(--glow-green)" : "none",
              }}
            >
              <div className="text-sm font-mono font-bold mb-2" style={{ color: "var(--accent-cyan)" }}>{algo.icon}</div>
              <p className="text-xs font-bold mb-1">{algo.name}</p>
              <p className="text-[10px]" style={{ color: algo.riskColor }}>{algo.risk}</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{algo.leverage}</p>
            </button>
          ))}
        </div>

        {/* Strategy Config + Trade Journal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Config Panel */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3 className="text-sm font-bold">Strategy Config</h3>
              {isRunning && (
                <span className="flex items-center gap-1.5">
                  <span className="status-dot online"></span>
                  <span className="text-xs font-mono" style={{ color: "var(--accent-green)" }}>LIVE</span>
                </span>
              )}
            </div>
            <div className="dash-panel-body space-y-4">
              {/* Algorithm */}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>Algorithm</label>
                <select
                  className="input-field"
                  value={selectedAlgo}
                  onChange={(e) => setSelectedAlgo(e.target.value)}
                >
                  {algos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* Venue */}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>Exchange</label>
                <div className="flex gap-2">
                  {["hl", "aster"].map(v => (
                    <button
                      key={v}
                      onClick={() => updateConfig("venue", v)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold transition"
                      style={{
                        background: config.venue === v ? "var(--accent-green)" : "var(--bg-primary)",
                        color: config.venue === v ? "#000" : "var(--text-dim)",
                        border: `1px solid ${config.venue === v ? "var(--accent-green)" : "var(--border)"}`,
                      }}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbol */}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>Symbol</label>
                <input className="input-field" value={config.symbol} onChange={(e) => updateConfig("symbol", e.target.value)} />
              </div>

              {/* Interval + Leverage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>Interval</label>
                  <select className="input-field" value={config.interval} onChange={(e) => updateConfig("interval", e.target.value)}>
                    {["1m", "5m", "15m", "1h", "4h"].map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>Leverage</label>
                  <input className="input-field" type="number" min="1" max="50" value={config.leverage} onChange={(e) => updateConfig("leverage", e.target.value)} />
                </div>
              </div>

              {/* Trade Size */}
              <div>
                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>Trade Size (USD)</label>
                <input className="input-field" type="number" value={config.tradeUSD} onChange={(e) => updateConfig("tradeUSD", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Trade Journal */}
          <div className="lg:col-span-2 dash-panel">
            <div className="dash-panel-header">
              <h3 className="text-sm font-bold">Trade Journal</h3>
              <div className="flex items-center gap-4 text-sm font-mono">
                <span style={{ color: "var(--text-dim)" }}>Mock data — journal endpoint coming soon</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="tab-bar">
              {["Trades", "Sessions", "Equity Curve"].map(tab => (
                <button
                  key={tab}
                  className={`tab-item ${journalTab === tab ? "active" : ""}`}
                  onClick={() => setJournalTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Trade Table */}
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Symbol</th>
                    <th>Algo</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {JOURNAL_TRADES.map((t, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--text-dim)" }}>{t.time}</td>
                      <td className="font-bold" style={{ color: "var(--text-primary)" }}>{t.symbol}</td>
                      <td><span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-primary)", color: "var(--accent-cyan)" }}>{t.algo}</span></td>
                      <td>
                        <span style={{ color: t.side === "Long" ? "var(--accent-green)" : "var(--accent-red)" }}>
                          {t.side} {t.leverage}
                        </span>
                      </td>
                      <td>{t.entry}</td>
                      <td>{t.exit}</td>
                      <td style={{ color: t.pnlColor, fontWeight: 700 }}>{t.pnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
    </AuthGuard>
  );
}
