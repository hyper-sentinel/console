"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Tool {
  name: string;
  description?: string;
  category?: string;
  tier?: string;
  parameters?: Record<string, unknown>;
}

const TOOL_CATEGORIES: Record<string, { icon: string; color: string; tools: string[] }> = {
  "Trading": {
    icon: "📈",
    color: "#00FF88",
    tools: ["place_hl_order", "close_hl_position", "cancel_hl_order", "get_hl_open_orders", "aster_place_order", "aster_cancel_order", "aster_cancel_all_orders", "aster_set_leverage", "buy_polymarket", "sell_polymarket", "place_polymarket_limit", "cancel_polymarket_order", "cancel_all_polymarket_orders"],
  },
  "Market Data": {
    icon: "📊",
    color: "#00E5FF",
    tools: ["get_crypto_price", "get_crypto_top_n", "get_crypto_batch_prices", "search_crypto", "get_crypto_chart", "get_stock_price", "get_hl_orderbook", "get_hl_positions", "get_hl_account_info", "get_hl_config", "aster_ticker", "aster_orderbook", "aster_klines", "aster_funding_rate", "aster_exchange_info", "aster_balance", "aster_positions", "aster_account_info", "aster_open_orders", "aster_diagnose", "aster_ping", "get_polymarket_markets", "search_polymarket", "get_polymarket_orderbook", "get_polymarket_price", "get_polymarket_positions"],
  },
  "Intelligence": {
    icon: "🧠",
    color: "#8B5CF6",
    tools: ["get_news_recap", "get_news_sentiment", "get_intelligence_reports", "get_report_detail", "get_trending_tokens", "get_top_mentions", "search_mentions", "get_trending_narratives", "get_token_news", "search_x"],
  },
  "Macro": {
    icon: "🏛",
    color: "#FBBF24",
    tools: ["get_economic_dashboard", "get_fred_series", "search_fred"],
  },
  "Social": {
    icon: "C",
    color: "#EC4899",
    tools: ["tg_read_channel", "tg_send_message", "tg_search_messages", "tg_list_channels", "discord_read_channel", "discord_send_message", "discord_search_messages", "discord_list_guilds", "discord_list_channels"],
  },
  "System": {
    icon: "T",
    color: "#6B7280",
    tools: ["open_in_browser", "open_app"],
  },
};

function getCategory(toolName: string): string {
  for (const [cat, info] of Object.entries(TOOL_CATEGORIES)) {
    if (info.tools.includes(toolName)) return cat;
  }
  return "Other";
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  useEffect(() => {
    api.listTools()
      .then((data) => {
        const t = (data as Record<string, unknown>)?.tools as Tool[] || [];
        setTools(t);
      })
      .catch(() => {
        // Fallback: generate tool list from our known tools
        const allTools: Tool[] = [];
        for (const [cat, info] of Object.entries(TOOL_CATEGORIES)) {
          for (const name of info.tools) {
            allTools.push({ name, category: cat });
          }
        }
        setTools(allTools);
      })
      .finally(() => setLoading(false));
  }, []);

  const categorized = tools.reduce((acc, tool) => {
    const cat = tool.category || getCategory(tool.name);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const filteredCategories = Object.entries(categorized).filter(([cat]) => {
    if (filterCat && cat !== filterCat) return false;
    return true;
  });

  const matchesSearch = (tool: Tool) => {
    if (!search) return true;
    return tool.name.toLowerCase().includes(search.toLowerCase()) ||
           (tool.description || "").toLowerCase().includes(search.toLowerCase());
  };

  const totalTools = tools.length;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8 stagger-1">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Tools</h1>
          <p className="text-sm" style={{ color: "#71717A" }}>{totalTools} tools available via the Sentinel API</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-6 stagger-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
          style={{ background: "#1A1A1E", color: "#E4E4E7", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setFilterCat(null)}
            className="text-xs px-3 py-2 rounded-lg font-medium transition"
            style={{
              background: !filterCat ? "rgba(139, 92, 246, 0.12)" : "rgba(255,255,255,0.04)",
              color: !filterCat ? "#A78BFA" : "#71717A",
            }}
          >
            All
          </button>
          {Object.entries(TOOL_CATEGORIES).map(([cat, info]) => (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? null : cat)}
              className="text-xs px-3 py-2 rounded-lg font-medium transition"
              style={{
                background: filterCat === cat ? `${info.color}15` : "rgba(255,255,255,0.04)",
                color: filterCat === cat ? info.color : "#71717A",
              }}
            >
              {info.icon} {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-3">
          {[1,2,3,4,5,6,7,8,9].map((i) => (
            <div key={i} className="rounded-xl p-4 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: "90%" }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8 stagger-3">
          {filteredCategories.map(([cat, catTools]) => {
            const filtered = catTools.filter(matchesSearch);
            if (filtered.length === 0) return null;
            const catInfo = TOOL_CATEGORIES[cat] || { icon: "📦", color: "#71717A" };

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span>{catInfo.icon}</span>
                  <h2 className="text-sm font-semibold" style={{ color: catInfo.color }}>{cat}</h2>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "#52525B" }}>
                    {filtered.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((tool) => (
                    <div
                      key={tool.name}
                      className="console-card console-card-interactive rounded-xl p-4 transition-all group"
                    >
                      <p className="text-sm font-mono font-medium text-white mb-1 group-hover:text-purple-300 transition">
                        {tool.name}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: "#71717A" }}>
                        {tool.description || tool.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      {tool.tier && tool.tier !== "free" && (
                        <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{
                          background: "rgba(139, 92, 246, 0.08)",
                          color: "#A78BFA",
                        }}>
                          {tool.tier.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* API Example */}
      <div className="mt-10 rounded-xl p-6 border stagger-4" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
        <h3 className="text-sm font-semibold text-white mb-3">Call any tool via the API</h3>
        <div className="rounded-lg p-4 font-mono text-xs leading-relaxed" style={{ background: "#0A0A0B", color: "#A1A1AA" }}>
          <p style={{ color: "#52525B" }}># Python SDK</p>
          <p>result = client.call(<span style={{ color: "#FBBF24" }}>&quot;get_crypto_price&quot;</span>, coin_id=<span style={{ color: "#FBBF24" }}>&quot;bitcoin&quot;</span>)</p>
          <br />
          <p style={{ color: "#52525B" }}># REST API</p>
          <p>POST https://api.hyper-sentinel.com/api/v1/tools/call</p>
          <p>{`{"tool": "get_crypto_price", "params": {"coin_id": "bitcoin"}}`}</p>
        </div>
      </div>
    </div>
  );
}
