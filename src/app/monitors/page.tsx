"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AuthGuard from "@/components/AuthGuard";

const MONITORS = [
  { id: "price", name: "Price Monitor", icon: "P", interval: "15 min", desc: "Threshold alerts on tracked assets", lastRun: "3 min ago", alerts: 2 },
  { id: "position", name: "Position Monitor", icon: "$", interval: "30 min", desc: "Drawdown, leverage, PnL warnings", lastRun: "12 min ago", alerts: 0 },
  { id: "sentiment", name: "Sentiment Monitor", icon: "S", interval: "60 min", desc: "Y2/Elfa/X social spike detection", lastRun: "45 min ago", alerts: 1 },
  { id: "macro", name: "Macro Monitor", icon: "M", interval: "6 hours", desc: "FRED regime changes (CPI, rates, VIX)", lastRun: "2 hr ago", alerts: 0 },
];

const DECISION_LOG = [
  { time: "03:42", type: "price", msg: "BTC crossed $87K — threshold alert triggered", action: "Notified" },
  { time: "03:27", type: "position", msg: "ETH-PERP position healthy — P&L +$47, leverage 3x within limits", action: "OK" },
  { time: "02:58", type: "price", msg: "SOL dropped 2.1% in 15m — monitoring for further decline", action: "Watching" },
  { time: "02:15", type: "sentiment", msg: "SOL sentiment flipped bearish → neutral on X/Twitter", action: "Logged" },
  { time: "01:30", type: "position", msg: "All positions within guardrail limits", action: "OK" },
  { time: "00:45", type: "macro", msg: "VIX at 18.2 — normal range, no regime change detected", action: "OK" },
];

export default function MonitorsPage() {
  const [sentinelActive, setSentinelActive] = useState(false);
  const [monitorStatus, setMonitorStatus] = useState<Record<string, boolean>>({
    price: true,
    position: true,
    sentiment: false,
    macro: false,
  });

  const toggleMonitor = (id: string) => {
    setMonitorStatus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AuthGuard>
    <AppLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Autonomous Monitors</h1>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>4 monitors · Guardrails · Decision log · 24/7 surveillance</p>
          </div>
          <div className="flex items-center gap-3">
            {sentinelActive ? (
              <button className="btn-danger flex items-center gap-2" onClick={() => setSentinelActive(false)}>
                <span className="status-dot online"></span>
                ■ Stop Sentinel
              </button>
            ) : (
              <button className="btn-primary flex items-center gap-2" onClick={() => setSentinelActive(true)}>
                Start Sentinel Loop
              </button>
            )}
          </div>
        </div>

        {/* Monitor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {MONITORS.map(mon => (
            <div
              key={mon.id}
              className="dash-panel cursor-pointer transition"
              onClick={() => toggleMonitor(mon.id)}
              style={{
                borderColor: monitorStatus[mon.id] ? "rgba(0,255,136,0.3)" : "var(--border)",
                boxShadow: monitorStatus[mon.id] ? "var(--glow-green)" : "none",
              }}
            >
              <div className="dash-panel-body">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{mon.icon}</span>
                  <span className={`status-dot ${monitorStatus[mon.id] ? "online" : "offline"}`}></span>
                </div>
                <h3 className="text-sm font-bold mb-1">{mon.name}</h3>
                <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>{mon.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>Every {mon.interval}</span>
                  <span className="text-[10px] font-mono" style={{ color: monitorStatus[mon.id] ? "var(--accent-green)" : "var(--text-dim)" }}>
                    {mon.lastRun}
                  </span>
                </div>
                {mon.alerts > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(255,68,68,0.15)", color: "var(--accent-red)" }}>
                      {mon.alerts} alert{mon.alerts > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Guardrails + Decision Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Guardrails */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3 className="text-sm font-bold">Guardrails</h3>
              <span className="text-xs" style={{ color: "var(--accent-green)" }}>Active</span>
            </div>
            <div className="dash-panel-body space-y-4">
              {[
                { label: "Max Trade Size", value: "$500", env: "SENTINEL_MAX_TRADE_USD" },
                { label: "Max Daily Trades", value: "5", env: "SENTINEL_MAX_DAILY_TRADES" },
                { label: "Max Daily Loss", value: "$1,000", env: "SENTINEL_MAX_DAILY_LOSS" },
                { label: "Auto-Execute", value: "OFF", env: "SENTINEL_AUTO_EXECUTE" },
              ].map(g => (
                <div key={g.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                  <div>
                    <p className="text-sm font-medium">{g.label}</p>
                    <p className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>{g.env}</p>
                  </div>
                  <span className="text-sm font-mono font-bold" style={{ color: "var(--accent-green)" }}>{g.value}</span>
                </div>
              ))}

              {/* Kill Switch */}
              <button
                className="w-full py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                style={{
                  background: "rgba(255,68,68,0.1)",
                  border: "1px solid rgba(255,68,68,0.3)",
                  color: "var(--accent-red)",
                }}
              >
                                KILL SWITCH
              </button>
              <p className="text-[10px] text-center" style={{ color: "var(--text-dim)" }}>
                Emergency halt — cancels all orders, closes all positions
              </p>
            </div>
          </div>

          {/* Decision Log */}
          <div className="lg:col-span-2 dash-panel">
            <div className="dash-panel-header">
              <h3 className="text-sm font-bold">Decision Log</h3>
              <span className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>{DECISION_LOG.length} entries</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
              {DECISION_LOG.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-5 py-3 transition"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span className="text-xs font-mono mt-0.5" style={{ color: "var(--text-dim)", minWidth: 40 }}>{entry.time}</span>
                  <span className="text-sm mt-0.5">
                    {entry.type === "price" && "P"}
                    {entry.type === "position" && "$"}
                    {entry.type === "sentiment" && "S"}
                    {entry.type === "macro" && "M"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{entry.msg}</p>
                  </div>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                    style={{
                      background: entry.action === "OK" ? "rgba(0,255,136,0.1)" : entry.action === "Notified" ? "rgba(251,191,36,0.1)" : "var(--bg-primary)",
                      color: entry.action === "OK" ? "var(--accent-green)" : entry.action === "Notified" ? "var(--accent-yellow)" : "var(--text-dim)",
                    }}
                  >
                    {entry.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
    </AuthGuard>
  );
}
