"use client";
import { useState } from "react";
import {
  useNewsSentiment,
  useNewsRecap,
  useIntelReports,
  useTrendingTokens,
  useTopMentions,
  useTrendingNarratives,
  useXSearch,
} from "@/lib/hooks";

type Tab = "sentiment" | "recap" | "reports" | "trending" | "social" | "x";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "sentiment", label: "Sentiment", icon: "" },
  { id: "recap", label: "Recap", icon: "" },
  { id: "reports", label: "Reports", icon: "" },
  { id: "trending", label: "Trending", icon: "" },
  { id: "social", label: "Mentions", icon: "" },
  { id: "x", label: "X Search", icon: "" },
];

export default function IntelPane() {
  const [tab, setTab] = useState<Tab>("sentiment");
  const [xQuery, setXQuery] = useState("");

  const { data: sentiment, isLoading: sentimentLoading } = useNewsSentiment();
  const { data: recap, isLoading: recapLoading } = useNewsRecap();
  const { data: reports, isLoading: reportsLoading } = useIntelReports();
  const { data: trending, isLoading: trendingLoading } = useTrendingTokens();
  const { data: mentions, isLoading: mentionsLoading } = useTopMentions();
  const { data: narratives } = useTrendingNarratives();
  const { data: xResults, isLoading: xLoading } = useXSearch(tab === "x" ? xQuery : "");

  const isLoading = tab === "sentiment" ? sentimentLoading
    : tab === "recap" ? recapLoading
    : tab === "reports" ? reportsLoading
    : tab === "trending" ? trendingLoading
    : tab === "social" ? mentionsLoading
    : xLoading;

  const renderItems = (data: unknown, emptyText: string) => {
    if (!data) return <EmptyState text={emptyText} />;
    const arr = Array.isArray(data) ? data : (data as Record<string, unknown>)?.data ? (data as Record<string, unknown>).data as unknown[] : [data];
    if (Array.isArray(arr) && arr.length === 0) return <EmptyState text={emptyText} />;

    return (
      <div className="space-y-2">
        {(Array.isArray(arr) ? arr : [arr]).slice(0, 30).map((item: unknown, i: number) => {
          const obj = item as Record<string, unknown>;
          const title = String(obj.title || obj.name || obj.token || obj.query || obj.text || obj.content || obj.headline || `Item ${i + 1}`);
          const desc = String(obj.description || obj.summary || obj.body || obj.snippet || obj.mention_count || "");
          const score = obj.score || obj.sentiment || obj.sentiment_score;
          const url = obj.url || obj.link;

          return (
            <div key={i} className="p-2 rounded-lg transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {url ? (
                    <a href={String(url)} target="_blank" rel="noopener noreferrer" className="hover:underline">{title}</a>
                  ) : title}
                </p>
                {score !== undefined && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0" style={{
                    background: Number(score) > 0 ? "rgba(0,255,136,0.1)" : Number(score) < 0 ? "rgba(255,68,68,0.1)" : "rgba(255,255,255,0.05)",
                    color: Number(score) > 0 ? "var(--accent-green)" : Number(score) < 0 ? "var(--accent-red)" : "var(--text-dim)",
                  }}>
                    {Number(score) > 0 ? "+" : ""}{typeof score === "number" ? score.toFixed(2) : String(score)}
                  </span>
                )}
              </div>
              {desc && desc !== "undefined" && (
                <p className="text-[10px] mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--text-dim)" }}>{desc}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" style={{ fontSize: "11px" }}>
      {/* Tabs */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="text-[11px] px-2.5 py-1 rounded shrink-0 flex items-center gap-1"
            style={{
              background: tab === t.id ? "rgba(0,255,136,0.1)" : "transparent",
              color: tab === t.id ? "var(--accent-green)" : "var(--text-dim)",
              border: tab === t.id ? "1px solid rgba(0,255,136,0.3)" : "1px solid transparent",
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {/* X Search Input */}
        {tab === "x" && (
          <div className="mb-2">
            <input
              value={xQuery}
              onChange={(e) => setXQuery(e.target.value)}
              placeholder="Search X / Twitter..."
              className="w-full px-2 py-1.5 rounded text-xs font-mono"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px] font-mono animate-pulse" style={{ color: "var(--text-dim)" }}>Loading intelligence...</span>
          </div>
        ) : (
          <>
            {tab === "sentiment" && renderItems(sentiment, "No sentiment data")}
            {tab === "recap" && renderItems(recap, "No news recap")}
            {tab === "reports" && renderItems(reports, "No intel reports")}
            {tab === "trending" && (
              <>
                {narratives && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: "var(--text-dim)" }}>Hot Narratives</p>
                    {renderItems(narratives, "No narratives")}
                  </div>
                )}
                <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: "var(--text-dim)" }}>Trending Tokens</p>
                {renderItems(trending, "No trending tokens")}
              </>
            )}
            {tab === "social" && renderItems(mentions, "No social mentions")}
            {tab === "x" && (xQuery.length > 1 ? renderItems(xResults, "No results") : <EmptyState text="Type to search X / Twitter" />)}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2">
      <span className="text-lg font-mono font-bold" style={{ color: "var(--text-dim)", opacity: 0.3 }}>—</span>
      <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>{text}</span>
    </div>
  );
}
