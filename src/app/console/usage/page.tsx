"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { UsageBarChart } from "@/components/UsageBarChart";

// ── Types matching Go gateway response ──
interface ToolStat {
  name: string;
  calls: number;
  avg_latency_ms?: number;
  model?: string;
  provider?: string;
  total_tokens?: number;
  cost?: string;
}

interface DailyStat {
  date: string;
  calls: number;
}

interface UsageBreakdown {
  user_id: string;
  period: string;
  tools: ToolStat[];
  daily: DailyStat[];
}

export default function UsagePage() {
  const [billing, setBilling] = useState<Record<string, unknown> | null>(null);
  const [breakdown, setBreakdown] = useState<UsageBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getBillingStatus().then((d) => setBilling(d as unknown as Record<string, unknown>)),
      api.getUsageBreakdown().then((d) => setBreakdown(d as UsageBreakdown)),
    ]).finally(() => setLoading(false));
  }, []);

  const apiCalls = Number(billing?.monthly_api_calls || 0);
  const rateLimit = Number(billing?.rate_limit_per_min || 300);

  // Separate tool calls from LLM calls
  const toolStats = (breakdown?.tools || []).filter((t) => !t.model);
  const llmStats = (breakdown?.tools || []).filter((t) => !!t.model);

  // Daily chart data — use real data if available, otherwise show empty
  const daily = breakdown?.daily || [];

  // Total platform fees from LLM usage
  const totalFees = llmStats.reduce((sum, t) => {
    const cost = parseFloat((t.cost || "$0").replace("$", ""));
    return sum + cost;
  }, 0);

  const totalTokens = llmStats.reduce((sum, t) => sum + (t.total_tokens || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8 stagger-1">
        <h1 className="text-2xl font-semibold text-white mb-1">Usage</h1>
        <p className="text-sm" style={{ color: "#71717A" }}>
          API usage for {breakdown?.period || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 stagger-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: "40%" }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 stagger-2">
            <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525B" }}>Total API Calls</p>
              <p className="text-3xl font-bold font-mono text-white">{apiCalls.toLocaleString()}</p>
            </div>
            <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525B" }}>LLM Tokens</p>
              <p className="text-3xl font-bold font-mono text-white">{totalTokens.toLocaleString()}</p>
              <p className="text-[10px] mt-1" style={{ color: "#52525B" }}>Platform fees: ${totalFees.toFixed(2)}</p>
            </div>
            <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525B" }}>Plan</p>
              <p className="text-xl font-bold font-mono" style={{ color: "#A78BFA" }}>Pay-as-you-go</p>
              <p className="text-[10px] mt-1" style={{ color: "#52525B" }}>{rateLimit}/min rate limit</p>
            </div>
            <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525B" }}>Avg / Day</p>
              <p className="text-3xl font-bold font-mono text-white">
                {daily.length > 0
                  ? Math.round(daily.reduce((s, d) => s + d.calls, 0) / daily.length).toLocaleString()
                  : Math.round(apiCalls / 30).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Daily Usage Chart */}
          <div className="rounded-xl p-6 border mb-8 stagger-3" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
            <h2 className="text-sm font-semibold text-white mb-6">Daily API Calls</h2>
            <UsageBarChart data={daily} />
          </div>

          {/* Tool Usage Breakdown */}
          {toolStats.length > 0 && (
            <div className="rounded-xl border overflow-hidden mb-8 stagger-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="px-5 py-3" style={{ background: "#141416" }}>
                <h2 className="text-sm font-semibold text-white">Tool Usage</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Tool</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Calls</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {toolStats.map((tool) => (
                    <tr key={tool.name} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="px-5 py-3 text-sm font-mono" style={{ color: "#E4E4E7" }}>{tool.name}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono font-bold" style={{ color: "#00FF88" }}>{tool.calls}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono" style={{ color: "#71717A" }}>
                        {tool.avg_latency_ms ? `${Math.round(tool.avg_latency_ms)}ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LLM Usage Breakdown */}
          {llmStats.length > 0 && (
            <div className="rounded-xl border overflow-hidden mb-8 stagger-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="px-5 py-3" style={{ background: "#141416" }}>
                <h2 className="text-sm font-semibold text-white">LLM Usage</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Provider</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Model</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Calls</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Tokens</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Platform Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {llmStats.map((stat, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="px-5 py-3 text-sm" style={{ color: "#A78BFA" }}>{stat.provider}</td>
                      <td className="px-5 py-3 text-sm font-mono" style={{ color: "#E4E4E7" }}>{stat.model}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono font-bold" style={{ color: "#00FF88" }}>{stat.calls}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono" style={{ color: "#E4E4E7" }}>{(stat.total_tokens || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono" style={{ color: "#FBBF24" }}>{stat.cost || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fee Schedule — flat pay-as-you-go */}
          <div className="rounded-xl border overflow-hidden stagger-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="px-5 py-3" style={{ background: "#141416" }}>
              <h2 className="text-sm font-semibold text-white">Fee Schedule</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Fee Type</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase" style={{ color: "#52525B" }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "LLM Markup", rate: "20%" },
                  { label: "Maker Fee", rate: "0.01%" },
                  { label: "Taker Fee", rate: "0.01%" },
                  { label: "Rate Limit", rate: "1,000/min" },
                ].map((row) => (
                  <tr key={row.label} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3 text-sm text-white">{row.label}</td>
                    <td className="px-5 py-3 text-sm text-right font-mono" style={{ color: "#A78BFA" }}>{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
