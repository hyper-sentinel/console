"use client";
import { useStrategyStatus, useSentinelStatus } from "@/lib/hooks";
import { api } from "@/lib/api";
import { useState } from "react";

interface Strategy {
  id?: string;
  strategy_id?: string;
  name?: string;
  description?: string;
  desc?: string;
  active?: boolean;
  running?: boolean;
  status?: string;
}

interface StrategyData {
  strategies?: Strategy[];
  running?: boolean;
  status?: string;
}

interface SignalData {
  signal?: string;
  last_signal?: string;
  time?: string;
  symbol?: string;
}

export default function StrategyPane() {
  const { data: stratRaw, isLoading: stratLoading, error: stratError, refetch: refetchStrat } = useStrategyStatus();
  const { data: sentinelRaw, isLoading: sentinelLoading } = useSentinelStatus();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const stratData = stratRaw as StrategyData | undefined;
  const sentinelData = sentinelRaw as Record<string, unknown> | undefined;

  // Normalize strategies
  const strategies: { id: string; name: string; desc: string; active: boolean }[] = [];

  if (stratData?.strategies && Array.isArray(stratData.strategies)) {
    stratData.strategies.forEach((s) => {
      strategies.push({
        id: s.id || s.strategy_id || Math.random().toString(),
        name: s.name || s.id || "—",
        desc: s.description || s.desc || "",
        active: s.active ?? s.running ?? s.status === "running",
      });
    });
  }

  const isRunning = sentinelData?.status === "running" || sentinelData?.running === true || stratData?.running === true;

  // Get last signal info
  const signalData = sentinelData as SignalData | undefined;
  const lastSignal = signalData?.last_signal || signalData?.signal || null;

  const toggleStrategy = async (id: string) => {
    setActionLoading(id);
    try {
      const strat = strategies.find((s) => s.id === id);
      if (strat?.active) {
        await api.call("stop_strategy", { strategy_id: id });
      } else {
        await api.call("start_strategy", { strategy_id: id });
      }
      refetchStrat();
    } catch (e) {
      console.error("Strategy toggle failed:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSentinel = async () => {
    setActionLoading("sentinel");
    try {
      if (isRunning) {
        await api.call("sentinel_stop", {});
      } else {
        await api.call("sentinel_start", {});
      }
      refetchStrat();
    } catch (e) {
      console.error("Sentinel toggle failed:", e);
    } finally {
      setActionLoading(null);
    }
  };

  if (stratLoading && sentinelLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs font-mono animate-pulse" style={{ color: "var(--text-dim)" }}>Loading strategies...</p>
      </div>
    );
  }

  if (stratError) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-xs font-mono mb-2" style={{ color: "var(--accent-red)" }}>⚠ Strategy engine unavailable</p>
          <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>Check API connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${isRunning ? "online" : "offline"}`}></span>
          <span className="text-xs font-medium">{isRunning ? "Running" : "Stopped"}</span>
        </div>
        <button
          onClick={toggleSentinel}
          disabled={actionLoading === "sentinel"}
          className="text-[10px] font-bold px-3 py-1 rounded"
          style={{
            background: isRunning ? "rgba(255,68,68,0.15)" : "rgba(0,255,136,0.15)",
            color: isRunning ? "var(--accent-red)" : "var(--accent-green)",
            border: `1px solid ${isRunning ? "rgba(255,68,68,0.3)" : "rgba(0,255,136,0.3)"}`,
            opacity: actionLoading === "sentinel" ? 0.5 : 1,
          }}
        >
          {actionLoading === "sentinel" ? "..." : isRunning ? "Stop" : "Start"}
        </button>
      </div>

      {/* Algos */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {strategies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>No strategies configured</p>
          </div>
        ) : (
          strategies.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "var(--bg-primary)" }}>
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                <p className="text-[9px]" style={{ color: "var(--text-dim)" }}>{a.desc}</p>
              </div>
              <div
                className={`toggle-switch ${a.active ? "active" : ""}`}
                onClick={() => toggleStrategy(a.id)}
                style={{ opacity: actionLoading === a.id ? 0.5 : 1 }}
              ></div>
            </div>
          ))
        )}
      </div>

      {/* Signal */}
      <div className="px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-[9px]" style={{ color: "var(--text-dim)" }}>Last Signal</p>
        <p className="text-xs font-mono" style={{ color: lastSignal ? "var(--accent-green)" : "var(--text-dim)" }}>
          {lastSignal ? `Signal: ${lastSignal}` : "No signals yet"}
        </p>
      </div>
    </div>
  );
}
