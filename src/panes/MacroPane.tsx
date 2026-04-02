"use client";
import { useMacroData } from "@/lib/hooks";

interface MacroIndicator {
  metric?: string;
  name?: string;
  label?: string;
  value?: string | number;
  source?: string;
  updated?: string;
  date?: string;
  status?: string;
  change?: number;
}

function getStatus(val: string | number | undefined, metric?: string): "ok" | "warning" | "neutral" {
  if (!val) return "neutral";
  const n = typeof val === "string" ? parseFloat(val.replace(/[^-\d.]/g, "")) : val;
  if (isNaN(n)) return "neutral";
  if (metric?.toLowerCase().includes("vix") && n > 25) return "warning";
  if (metric?.toLowerCase().includes("cpi") && n > 3) return "warning";
  return "ok";
}

const statusColor = (s: "ok" | "warning" | "neutral") =>
  s === "ok" ? "var(--accent-green)" : s === "warning" ? "var(--accent-yellow)" : "var(--text-secondary)";

export default function MacroPane() {
  const { data: rawData, isLoading, error } = useMacroData();

  // Normalize macro data — API might return object with indicators or array
  const indicators: { metric: string; value: string; source: string; updated: string; status: "ok" | "warning" | "neutral" }[] = [];

  if (rawData) {
    const items: MacroIndicator[] = Array.isArray(rawData) ? rawData : (rawData as Record<string, unknown>).indicators as MacroIndicator[] || Object.entries(rawData as Record<string, unknown>).map(([key, val]) => ({
      metric: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: typeof val === "object" && val !== null ? (val as Record<string, unknown>).value as string : String(val),
      source: "FRED",
      updated: typeof val === "object" && val !== null ? (val as Record<string, unknown>).date as string : "Live",
    }));

    if (Array.isArray(items)) {
      items.forEach((m) => {
        const name = m.metric || m.name || m.label || "—";
        const val = m.value?.toString() || "—";
        indicators.push({
          metric: name,
          value: val,
          source: m.source || "FRED",
          updated: m.updated || m.date || "Live",
          status: getStatus(m.value, name),
        });
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs font-mono animate-pulse" style={{ color: "var(--text-dim)" }}>Loading macro data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-xs font-mono mb-2" style={{ color: "var(--accent-red)" }}>⚠ Failed to load macro data</p>
          <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>Check API connection</p>
        </div>
      </div>
    );
  }

  if (indicators.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>No macro data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-2 space-y-1.5">
        {indicators.map((m) => (
          <div
            key={m.metric}
            className="flex items-center justify-between p-2.5 rounded-lg"
            style={{ background: "var(--bg-primary)" }}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{m.metric}</p>
              <p className="text-[9px]" style={{ color: "var(--text-dim)" }}>
                {m.source} · {m.updated}
              </p>
            </div>
            <span
              className="text-sm font-mono font-bold ml-3 shrink-0"
              style={{ color: statusColor(m.status) }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
