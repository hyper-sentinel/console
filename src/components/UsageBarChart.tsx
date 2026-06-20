"use client";

export interface DailyPoint {
  date: string;
  calls: number;
}

// UsageBarChart renders a simple daily activity bar chart. Shared by the Usage page
// and the Billing page so they never drift. Empty data shows a friendly placeholder.
export function UsageBarChart({ data, emptyHint }: { data: DailyPoint[]; emptyHint?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center">
        <span className="text-xs font-mono" style={{ color: "#3F3F46" }}>
          {emptyHint || "No usage data yet — make some API calls to see your chart"}
        </span>
      </div>
    );
  }

  const maxCalls = Math.max(...data.map((d) => d.calls), 1);

  return (
    <>
      <div className="flex items-end gap-1 h-40">
        {data.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div
              className="w-full rounded-t transition-all group-hover:opacity-100 opacity-80"
              style={{
                height: `${Math.max(2, (day.calls / maxCalls) * 100)}%`,
                background: "linear-gradient(to top, rgba(139, 92, 246, 0.6), rgba(139, 92, 246, 0.2))",
                minHeight: 2,
              }}
            />
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap rounded-lg px-2 py-1 text-[10px] z-10"
              style={{ background: "#27272A", color: "#E4E4E7", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {day.calls} calls · {day.date}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[9px] font-mono" style={{ color: "#3F3F46" }}>
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </>
  );
}
