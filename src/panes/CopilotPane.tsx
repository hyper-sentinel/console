"use client";
import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSecretKey, decryptVault, encryptVault, type VaultConfig } from "@/lib/vault";

// ── Types ─────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "calling" | "done" | "error";
}

interface SentinelMeta {
  total_tokens?: number;
  platform_fee?: string;
  provider?: string;
  latency_ms?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  meta?: SentinelMeta;
  error?: string;
}

// ── Provider mapping ──────────────────────────────────────────

const GATEWAY_PROVIDER: Record<string, string> = {
  gemini: "google",
  claude: "anthropic",
  gpt: "openai",
  grok: "xai",
};

const DEFAULT_MODELS: Record<string, string> = {
  google: "gemini-2.0-flash",
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  xai: "grok-2",
};

const MODELS_PER_PROVIDER: Record<string, { id: string; label: string }[]> = {
  google: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { id: "claude-haiku-3-20250514", label: "Claude Haiku 3" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  xai: [
    { id: "grok-3", label: "Grok 3" },
    { id: "grok-3-mini-fast", label: "Grok 3 Mini" },
    { id: "grok-2", label: "Grok 2" },
  ],
};

// ── Response text extraction per provider ─────────────────────

function extractText(data: Record<string, unknown>, provider: string): string {
  try {
    // The Go gateway returns raw provider responses with sentinel_meta injected.
    // Try provider-specific extraction first, then generic fallbacks.
    let text = "";
    switch (provider) {
      case "google": {
        const c = data.candidates as { content: { parts: { text: string }[] } }[];
        text = c?.[0]?.content?.parts?.[0]?.text || "";
        break;
      }
      case "openai":
      case "xai": {
        const c = data.choices as { message: { content: string } }[];
        text = c?.[0]?.message?.content || "";
        break;
      }
      case "anthropic": {
        const c = data.content as { text: string }[];
        text = c?.[0]?.text || "";
        break;
      }
    }
    // Fallback: gateway may return {text: "..."} directly in some cases
    if (!text && typeof data.text === "string") text = data.text;
    if (!text && typeof data.content === "string") text = data.content;
    if (!text && typeof data.message === "string") text = data.message;
    return text || "";
  } catch {
    return typeof data?.text === "string" ? data.text : JSON.stringify(data);
  }
}

// ── Tool call parsing ─────────────────────────────────────────

interface ParsedTool { name: string; params: Record<string, unknown> }

function parseToolCalls(text: string): ParsedTool[] {
  const calls: ParsedTool[] = [];
  const regex = /```tool\s*([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    try {
      const p = JSON.parse(m[1].trim());
      if (p.name) calls.push({ name: p.name, params: p.params || {} });
    } catch { /* skip malformed */ }
  }
  return calls;
}

function stripToolBlocks(text: string): string {
  return text.replace(/```tool\s*[\s\S]*?```\n?/g, "").trim();
}

// ── Direct API fallbacks ──────────────────────────────────────

async function directToolCall(name: string, params: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_crypto_price": {
      const id = String(params.coin_id || "bitcoin").toLowerCase();
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
      );
      const data = await res.json();
      const coin = data[id];
      if (!coin) throw new Error(`Coin "${id}" not found`);
      return {
        coin_id: id,
        price: `$${coin.usd.toLocaleString()}`,
        change_24h: `${coin.usd_24h_change?.toFixed(2)}%`,
        market_cap: `$${(coin.usd_market_cap / 1e9).toFixed(2)}B`,
        volume_24h: `$${(coin.usd_24h_vol / 1e9).toFixed(2)}B`,
      };
    }
    case "get_crypto_top_n": {
      const n = Number(params.n) || 10;
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${n}&page=1&sparkline=false&price_change_percentage=24h`
      );
      const coins = await res.json();
      return coins.map((c: Record<string, unknown>) => ({
        name: c.name,
        symbol: String(c.symbol).toUpperCase(),
        price: `$${Number(c.current_price).toLocaleString()}`,
        change_24h: `${Number(c.price_change_percentage_24h).toFixed(2)}%`,
        market_cap: `$${(Number(c.market_cap) / 1e9).toFixed(1)}B`,
      }));
    }
    case "search_crypto": {
      const q = String(params.query || "");
      const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      return (data.coins || []).slice(0, 10).map((c: Record<string, unknown>) => ({
        id: c.id, name: c.name, symbol: c.symbol, market_cap_rank: c.market_cap_rank,
      }));
    }
    default:
      throw new Error(`Tool "${name}" requires the backend. Try a market data query.`);
  }
}

// ── Tool catalog for system prompt ────────────────────────────

const TOOL_CATALOG = `
TOOL CALLING FORMAT — when you need live data or want to execute an action, output EXACTLY:

\`\`\`tool
{"name": "tool_name", "params": {"key": "value"}}
\`\`\`

After each tool call you will receive the result, then respond to the user.

AVAILABLE TOOLS (62+):

Crypto Market Data (no wallet needed):
  get_crypto_price — params: {coin_id: "bitcoin"} — live price, 24h change, volume, mcap
  get_crypto_top_n — params: {n: 10} — top coins by market cap
  search_crypto — params: {query: "..."} — search coins by name
  get_crypto_chart — params: {coin_id: "bitcoin", days: 30} — price chart OHLCV

Stock Data:
  get_stock_price — params: {symbol: "AAPL"} — stock/ETF price, volume, day range

Hyperliquid (wallet required):
  get_hl_positions — no params — open perp positions (crypto + TradFi)
  get_hl_account_info — no params — equity, margin, balances
  get_hl_orderbook — params: {coin: "BTC"} — orderbook depth (crypto or TradFi: GOLD, SP500, TSLA)
  get_hl_open_orders — no params — open orders
  place_hl_order — params: {coin: "BTC", side: "buy", size: 0.01, order_type: "market"} — trade crypto or TradFi
  close_hl_position — params: {coin: "BTC"} — close position
  cancel_hl_order — params: {coin: "BTC", order_id: "..."} — cancel order
  get_hl_tradfi_assets — no params — list all TradFi perps (GOLD, SILVER, OIL, TSLA, SP500, 50+)
  get_hl_tradfi_price — params: {symbol: "GOLD"} — price, spread, funding for TradFi asset

Aster DEX (wallet required):
  aster_ticker — params: {symbol: "BTCUSDT"} — 24h stats
  aster_positions — no params — open positions
  aster_balance — no params — USDT balance
  aster_orderbook — params: {symbol: "BTCUSDT"} — orderbook
  aster_klines — params: {symbol: "ETHUSDT", interval: "1h", limit: 100} — candlestick data
  aster_place_order — params: {symbol: "BTCUSDT", side: "BUY", quantity: 100, order_type: "MARKET"}
  aster_cancel_order — params: {symbol: "BTCUSDT", order_id: "..."} — cancel order
  aster_cancel_all_orders — params: {symbol: "BTCUSDT"} — cancel all orders
  aster_set_leverage — params: {symbol: "BTCUSDT", leverage: 10} — set leverage
  aster_diagnose — no params — connection check

Polymarket (wallet required):
  get_polymarket_markets — params: {limit: 10} — browse prediction markets
  search_polymarket — params: {query: "..."} — search markets
  get_polymarket_positions — no params — open positions
  buy_polymarket — params: {token_id: "...", amount: 10} — buy shares
  sell_polymarket — params: {token_id: "...", amount: 10} — sell shares
  get_polymarket_price — params: {token_id: "..."} — current price/odds
  get_polymarket_orderbook — params: {token_id: "..."} — orderbook

Intelligence (no wallet needed):
  get_news_sentiment — params: {query: "..."} — sentiment analysis for a topic
  get_news_recap — no params — AI news summary
  get_intelligence_reports — no params — AI research reports
  get_trending_tokens — no params — trending tokens from social intelligence
  get_top_mentions — no params — top social mentions
  search_mentions — params: {query: "..."} — search social mentions across platforms
  get_trending_narratives — no params — trending narratives in crypto
  get_token_news — params: {token: "..."} — token-specific news
  search_x — params: {query: "...", max_results: 10} — search X/Twitter

Macro (no wallet needed):
  get_economic_dashboard — no params — GDP, CPI, Fed rate, VIX, unemployment, 10yr yield
  get_fred_series — params: {series_id: "DGS10", limit: 10} — specific FRED data
  search_fred — params: {query: "..."} — search FRED datasets

Telegram:
  tg_read_channel — params: {channel: "...", limit: 10} — read channel messages
  tg_list_channels — no params — list available channels
  tg_send_message — params: {channel: "...", message: "..."} — send message
  tg_search_messages — params: {query: "...", channel: "..."} — search messages

Discord:
  discord_list_guilds — no params — list connected servers
  discord_read_channel — params: {channel_id: 123, limit: 50} — read messages
  discord_send_message — params: {channel_id: 123, message: "..."} — send message
  discord_search_messages — params: {query: "...", channel_id: 123} — search messages
  discord_list_channels — params: {guild_id: 123} — list server channels


`;

function buildSystemPrompt(hasWallets: boolean): string {
  const walletStatus = hasWallets
    ? "Exchange wallets are configured. Trading tools are available."
    : `IMPORTANT: Exchange wallets are NOT configured yet. If the user tries to trade or check positions/balances, tell them to go to Settings > Exchanges to configure:
  - Hyperliquid (wallet address + private key)
  - Aster DEX (API key + API secret)
  - Polymarket (API key + API secret + passphrase)
Data tools (prices, news, sentiment, macro) work without wallets.`;

  return `You are Sentinel, a production-grade AI trading agent built by Sentinel Labs.
Platform: hyper-sentinel.com | Web Terminal

CAPABILITIES:
- Real-time crypto prices (CoinGecko — 10,000+ coins)
- Stock data (YFinance — prices, analyst recs, financials, news, full quant analysis)
- Economic data (FRED — GDP, CPI, unemployment, interest rates)
- DEX data (DexScreener — pairs, trending tokens, on-chain analytics)
- Social intelligence (X/Twitter search, Elfa AI trending, Y2 news)
- Technical analysis (SMA, EMA, RSI, MACD, Bollinger Bands for any asset)
- DEX trading (Hyperliquid perps, Aster futures, Polymarket predictions)
- TradFi perps on Hyperliquid (GOLD, SILVER, OIL, TSLA, SP500, NVDA, 50+ more)
- On-chain swaps (Jupiter SOL, Uniswap ETH)
- Wallet management (generate, import, balance, send)
- Portfolio analytics (cross-venue summary, risk analysis)

${walletStatus}

${TOOL_CATALOG}

RULES:
- Always use tools to get REAL data. Never fabricate prices, dates, statistics, or metadata.
- Do NOT invent version numbers, dates, uptime percentages, or system status details.
- Be concise and data-driven. Lead with numbers.
- When asked about multiple things, call multiple tools and synthesize ONE unified response.
- Format numbers clearly: $87,421.32 not 87421.32, 2.3% not 0.023.
- Format large numbers: $1.2B, $450M, $66.5K.
- If a tool fails, say so honestly and suggest alternatives.
- For trading operations (placing orders, closing positions), confirm the action clearly.
- Keep responses focused — no unnecessary preamble.
- Use markdown formatting: **bold** for emphasis, \`code\` for values, tables for structured data.

ANALYSIS FORMATTING:
When performing stock/crypto analysis or "quant analysis", produce a COMPREHENSIVE report with these sections:
1. CURRENT PRICE & MARKET DATA — price, change, day range, market cap
2. VALUATION METRICS — P/E (trailing & forward), P/B, P/S, PEG, EV/EBITDA
3. FINANCIAL HEALTH — margins, ROE, ROA, growth rates, balance sheet, cash flow
4. TECHNICAL ANALYSIS — 50-day & 200-day MA, price vs MA %, trend direction, volume vs average
5. ANALYST SENTIMENT — recommendation breakdown, price targets (high/mean/median/low), implied upside
6. RISK FACTORS — beta, overall risk score, short interest, governance risk
7. FUNDAMENTAL CONCERNS — bullet list of negatives
8. POSITIVE FACTORS — bullet list of positives
9. QUANTITATIVE SUMMARY — score out of 10 with breakdown
10. TRADING PERSPECTIVE — key support/resistance levels, momentum signals
11. FINAL VERDICT — BULLISH/NEUTRAL/BEARISH with reasoning

Use section dividers (----) between each section.`;
}

// ── Constants ─────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 5;
const CHAT_STORAGE_KEY = "sentinel_copilot_history";

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function ts() { return new Date().toLocaleTimeString("en-US", { hour12: false }); }

// ── Rich Markdown Renderer ────────────────────────────────────

function RichMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={elements.length} className="my-2 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          {lang && (
            <div className="px-3 py-1 text-[9px] font-mono uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.04)", color: "#52525B" }}>
              {lang}
            </div>
          )}
          <pre className="px-3 py-2 text-[11px] font-mono leading-relaxed overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: "#A1A1AA", margin: 0 }}>
            {codeLines.join("\n")}
          </pre>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={elements.length} className="text-xs font-bold mt-3 mb-1" style={{ color: "#E4E4E7" }}>{renderInline(line.slice(4))}</h4>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={elements.length} className="text-sm font-bold mt-3 mb-1" style={{ color: "#E4E4E7" }}>{renderInline(line.slice(3))}</h3>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={elements.length} className="text-base font-bold mt-3 mb-1" style={{ color: "#FFFFFF" }}>{renderInline(line.slice(2))}</h2>);
      i++; continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim())) {
      elements.push(<hr key={elements.length} className="my-2" style={{ borderColor: "rgba(255,255,255,0.06)" }} />);
      i++; continue;
    }

    // Bullet lists
    if (/^\s*[-*•]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*•]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={elements.length} className="my-1 space-y-0.5">
          {listItems.map((item, j) => (
            <li key={j} className="flex gap-1.5 text-xs leading-relaxed" style={{ color: "#D4D4D8" }}>
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "#00FF88" }} />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered lists
    if (/^\s*\d+[.)]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+[.)]\s/, ""));
        i++;
      }
      elements.push(
        <ol key={elements.length} className="my-1 space-y-0.5">
          {listItems.map((item, j) => (
            <li key={j} className="flex gap-1.5 text-xs leading-relaxed" style={{ color: "#D4D4D8" }}>
              <span className="text-[10px] font-mono shrink-0 mt-0.5" style={{ color: "#00E5FF" }}>{j + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter(l => !/^\|[\s-:|]+\|$/.test(l.trim()))
        .map(l => l.split("|").filter(c => c.trim()).map(c => c.trim()));
      if (rows.length > 0) {
        elements.push(
          <div key={elements.length} className="my-2 rounded-lg overflow-hidden text-[11px]" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {rows[0].map((h, j) => (
                    <th key={j} className="px-2 py-1.5 text-left font-semibold" style={{ color: "#A1A1AA" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, j) => (
                  <tr key={j} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    {row.map((cell, k) => (
                      <td key={k} className="px-2 py-1.5 font-mono" style={{ color: "#D4D4D8" }}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={elements.length} className="h-1" />);
      i++; continue;
    }

    // Regular paragraph
    elements.push(
      <p key={elements.length} className="text-xs leading-relaxed my-0.5" style={{ color: "#D4D4D8" }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

/** Inline markdown: bold, italic, code, links */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "#FFFFFF", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(0,229,255,0.08)", color: "#00E5FF" }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#00E5FF" }}>{linkMatch[1]}</a>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// ── Coin aliases for fast-path ────────────────────────────────

const COIN_ALIASES: Record<string, string> = {
  btc: "bitcoin", bitcoin: "bitcoin", eth: "ethereum", ethereum: "ethereum",
  sol: "solana", solana: "solana", xmr: "monero", monero: "monero",
  doge: "dogecoin", dogecoin: "dogecoin", xrp: "ripple", ripple: "ripple",
  ada: "cardano", cardano: "cardano", dot: "polkadot", link: "chainlink",
  avax: "avalanche-2", matic: "matic-network", atom: "cosmos", uni: "uniswap",
  hype: "hyperliquid", bnb: "binancecoin", sui: "sui", apt: "aptos",
  arb: "arbitrum", op: "optimism", near: "near", ftm: "fantom",
  pepe: "pepe", shib: "shiba-inu", ton: "the-open-network",
};

function detectPriceQuery(text: string): string[] | null {
  const lower = text.toLowerCase();
  if (!/(price|how much|what.*trad|what.*at|what.*worth|quote)/i.test(lower)) return null;
  const found: string[] = [];
  for (const [alias, id] of Object.entries(COIN_ALIASES)) {
    if (lower.includes(alias)) found.push(id);
  }
  return found.length > 0 ? [...new Set(found)] : null;
}

// ── Format tool results into readable markdown ──────────────

function formatToolResult(tool: string, data: unknown): string {
  try {
    const d = data as Record<string, unknown>;

    // Positions (HL or Aster)
    if (tool === "get_hl_positions" || tool === "aster_positions") {
      const positions = (d.positions || d.data || []) as Record<string, unknown>[];
      if (positions.length === 0) return "No open positions.";
      const venue = tool.includes("hl") ? "Hyperliquid" : "Aster";
      let md = `| Coin | Size | Entry | PnL | ROE | Leverage | Liq Price |\n|---|---|---|---|---|---|---|\n`;
      for (const p of positions) {
        const coin = String(p.coin || p.symbol || "?");
        const size = Number(p.size || p.szi || 0);
        const entry = Number(p.entry_price || p.entryPx || 0);
        const pnl = Number(p.unrealized_pnl || p.unrealizedPnl || 0);
        const roe = Number(p.return_on_equity || p.returnOnEquity || 0);
        const lev = p.leverage || "?";
        const liq = p.liquidation_price || p.liquidationPx || "N/A";
        const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
        const roeStr = `${(roe * 100).toFixed(1)}%`;
        md += `| **${coin}** | ${size} | $${entry.toLocaleString()} | ${pnlStr} | ${roeStr} | ${lev}x | $${Number(liq).toLocaleString()} |\n`;
      }
      md += `\n**${positions.length} positions** on ${venue}`;
      if (d.total_positions) md += ` (${d.total_positions} total)`;
      return md;
    }

    // Account info
    if (tool === "get_hl_account_info") {
      return `| Metric | Value |\n|---|---|\n| Account Value | $${Number(d.account_value).toLocaleString()} |\n| Margin Used | $${Number(d.total_margin_used).toLocaleString()} |\n| Position Notional | $${Number(d.total_ntl_pos).toLocaleString()} |\n| Withdrawable | $${Number(d.withdrawable).toLocaleString()} |`;
    }

    // Aster balance
    if (tool === "aster_balance") {
      const bal = d.data || d;
      return `**Aster Balance:** $${Number((bal as Record<string, unknown>).balance || (bal as Record<string, unknown>).availableBalance || 0).toLocaleString()} USDT`;
    }

    // Top N crypto
    if (tool === "get_crypto_top_n") {
      const coins = (Array.isArray(d) ? d : d.data || []) as Record<string, unknown>[];
      let md = `| # | Coin | Price | 24h | MCap |\n|---|---|---|---|---|\n`;
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];
        md += `| ${i + 1} | **${c.symbol || c.name}** | $${Number(c.current_price || c.price).toLocaleString()} | ${Number(c.price_change_percentage_24h || c.change_24h).toFixed(1)}% | $${(Number(c.market_cap) / 1e9).toFixed(1)}B |\n`;
      }
      return md;
    }

    // Economic dashboard
    if (tool === "get_economic_dashboard") {
      const indicators = (d.data || d.indicators || d) as Record<string, unknown>;
      if (typeof indicators === "object" && !Array.isArray(indicators)) {
        let md = `| Indicator | Value |\n|---|---|\n`;
        for (const [k, v] of Object.entries(indicators)) {
          if (typeof v === "object" && v !== null) {
            const val = (v as Record<string, unknown>).value || (v as Record<string, unknown>).latest;
            md += `| ${k} | ${val} |\n`;
          } else {
            md += `| ${k} | ${v} |\n`;
          }
        }
        return md;
      }
    }

    // Trending tokens
    if (tool === "get_trending_tokens") {
      const tokens = (d.data || d.tokens || d) as Record<string, unknown>[];
      if (Array.isArray(tokens)) {
        let md = `| Token | Mentions | Sentiment |\n|---|---|---|\n`;
        for (const t of tokens.slice(0, 15)) {
          md += `| **${t.token || t.name || t.symbol}** | ${t.mentions || t.count || "?"} | ${t.sentiment || "?"} |\n`;
        }
        return md;
      }
    }

    // Polymarket markets
    if (tool === "get_polymarket_markets") {
      const markets = (d.data || d.markets || d) as Record<string, unknown>[];
      if (Array.isArray(markets)) {
        let md = `| Market | Volume | End Date |\n|---|---|---|\n`;
        for (const m of markets.slice(0, 10)) {
          md += `| ${String(m.question || m.title || "?").slice(0, 60)} | $${Number(m.volume || 0).toLocaleString()} | ${m.end_date || "?"} |\n`;
        }
        return md;
      }
    }

    // Fallback: pretty JSON
    const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return `\`\`\`json\n${str.slice(0, 3000)}\n\`\`\``;
  } catch {
    return `\`\`\`json\n${JSON.stringify(data, null, 2).slice(0, 3000)}\n\`\`\``;
  }
}

// ── Direct tool routing (works without LLM) ─────────────────
interface DirectRoute { tool: string; params: Record<string, unknown>; label: string }

function detectDirectTool(text: string): DirectRoute[] | null {
  const lower = text.toLowerCase().trim();
  const routes: DirectRoute[] = [];

  // HL positions
  if (/(hl|hyperliquid)\s*(position|pos|balance|account|portfolio)/i.test(lower) || lower === "get hl" || lower === "get hl positions") {
    routes.push({ tool: "get_hl_positions", params: {}, label: "Hyperliquid Positions" });
  }
  // HL account
  if (/(hl|hyperliquid)\s*(account|equity|margin|info)/i.test(lower)) {
    routes.push({ tool: "get_hl_account_info", params: {}, label: "Hyperliquid Account" });
  }
  // HL orderbook
  const hlOb = lower.match(/(hl|hyperliquid)\s*(?:orderbook|ob|book)\s*(\w+)?/i);
  if (hlOb) routes.push({ tool: "get_hl_orderbook", params: { coin: hlOb[2]?.toUpperCase() || "BTC" }, label: "HL Orderbook" });

  // Aster positions
  if (/(aster)\s*(position|pos|balance|account)/i.test(lower) || lower === "get aster" || lower === "get aster positions") {
    routes.push({ tool: "aster_positions", params: {}, label: "Aster Positions" });
    routes.push({ tool: "aster_balance", params: {}, label: "Aster Balance" });
  }

  // Polymarket
  if (/(polymarket|poly)\s*(position|pos|market)/i.test(lower) || lower === "get polymarket") {
    routes.push({ tool: "get_polymarket_positions", params: {}, label: "Polymarket Positions" });
  }
  if (/(polymarket|poly)\s*(browse|list|trending)/i.test(lower)) {
    routes.push({ tool: "get_polymarket_markets", params: {}, label: "Polymarket Markets" });
  }

  // All positions
  if (/(all|my)\s*(position|portfolio|balance)/i.test(lower) || lower === "positions" || lower === "portfolio") {
    routes.push({ tool: "get_hl_positions", params: {}, label: "Hyperliquid Positions" });
    routes.push({ tool: "aster_positions", params: {}, label: "Aster Positions" });
  }

  // Top crypto
  if (/top\s*\d*\s*(crypto|coin|token)/i.test(lower) || lower === "top 10" || lower === "top coins") {
    const n = parseInt(lower.match(/\d+/)?.[0] || "10");
    routes.push({ tool: "get_crypto_top_n", params: { n }, label: `Top ${n} Crypto` });
  }

  // Trending tokens
  if (/(trending|trend)\s*(token|coin)?/i.test(lower)) {
    routes.push({ tool: "get_trending_tokens", params: {}, label: "Trending Tokens" });
  }

  // News
  if (/(news|recap|headline|sentiment)/i.test(lower)) {
    routes.push({ tool: "get_news_recap", params: {}, label: "News Recap" });
  }

  // Macro / economic
  if (/(macro|economic|gdp|cpi|fed|vix|dashboard)/i.test(lower)) {
    routes.push({ tool: "get_economic_dashboard", params: {}, label: "Economic Dashboard" });
  }

  // X/Twitter search
  const xMatch = lower.match(/(?:search\s+x|x\s+search|tweet|twitter)\s+(.+)/i);
  if (xMatch) routes.push({ tool: "search_x", params: { query: xMatch[1] }, label: "X Search" });

  // Top mentions
  if (/(top\s*mention|social\s*mention|mention)/i.test(lower)) {
    routes.push({ tool: "get_top_mentions", params: {}, label: "Top Mentions" });
  }

  // Stock price shortcut
  const stockMatch = lower.match(/(?:stock|equity)\s+(\w+)/i);
  if (stockMatch) routes.push({ tool: "get_stock_price", params: { symbol: stockMatch[1].toUpperCase() }, label: `Stock: ${stockMatch[1].toUpperCase()}` });

  // HL TradFi price
  const tradfiMatch = lower.match(/(?:hl|hyperliquid)\s*(?:price|quote)\s+(\w+)/i);
  if (tradfiMatch) routes.push({ tool: "get_hl_tradfi_price", params: { coin: tradfiMatch[1].toUpperCase() }, label: `HL TradFi: ${tradfiMatch[1].toUpperCase()}` });

  // Search polymarket
  const polySearch = lower.match(/(?:polymarket|poly)\s*search\s+(.+)/i);
  if (polySearch) routes.push({ tool: "search_polymarket", params: { query: polySearch[1] }, label: "Polymarket Search" });

  // Intelligence reports
  if (/(intelligence|report|intel)\s*(report)?/i.test(lower)) {
    routes.push({ tool: "get_intelligence_reports", params: {}, label: "Intelligence Reports" });
  }

  return routes.length > 0 ? routes : null;
}

// ── Component ─────────────────────────────────────────────────

export default function CopilotPane() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("sentinel_model") || "";
    return "";
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close model dropdown on outside click
  useEffect(() => {
    if (!showModelDropdown) return;
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelDropdown]);

  // Detect wallet configuration
  const checkWallets = useCallback(() => {
    if (typeof window === "undefined") return false;
    // Flag must exist AND vault must contain data — prevents stale flag after logout/vault wipe
    return !!localStorage.getItem("sentinel_wallets_configured") && !!localStorage.getItem("sentinel_vault");
  }, []);

  const [hasWallets, setHasWallets] = useState(false);

  // ── Chat persistence ────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        if (parsed.length > 0) {
          setMessages(parsed);
          setHasWallets(checkWallets());
          return;
        }
      }
    } catch { /* ignore */ }

    // Initialize welcome message
    setHasWallets(checkWallets());
    const provider = user?.provider?.toUpperCase() || "AI";
    const wallets = checkWallets();
    const welcome = wallets
      ? `Sentinel online · 62 tools armed · ${provider}\n\nI have access to live market data, can execute trades on **Hyperliquid**, **Aster DEX**, and **Polymarket**, and monitor social intelligence feeds.\n\n**Commands:**\n\`add hl\` — Configure Hyperliquid\n\`add aster\` — Configure Aster DEX\n\`add polymarket\` — Configure Polymarket\n\`status\` — Show connections\n\`help\` — All commands\n\nOr just ask me anything.`
      : `Welcome to Sentinel · ${provider}\n\nI'm your autonomous trading agent with 62+ tools. Configure your exchanges to unlock trading:\n\n\`add hl\` — Hyperliquid DEX (wallet address + private key)\n\`add aster\` — Aster DEX (API key + secret)\n\`add polymarket\` — Polymarket (API key + secret + passphrase)\n\n**Data commands (no setup needed):**\n\`add y2\` — Y2 news intelligence\n\`add fred\` — FRED economic data\n\`add elfa\` — Elfa AI social mentions\n\`status\` — Show all connections\n\`help\` — All commands\n\nMeanwhile, I can fetch live prices, news, trending tokens, macro data, and social intelligence.`;

    setMessages([{ id: genId(), role: "assistant", content: welcome, timestamp: ts() }]);
  }, [user, checkWallets]);

  // Persist chat to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
      } catch { /* storage full, ignore */ }
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // Copy message
  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const clearChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    const provider = user?.provider?.toUpperCase() || "AI";
    setMessages([{ id: genId(), role: "assistant", content: `Sentinel ready · ${provider}`, timestamp: ts() }]);
  };

  // ── Core: send message ──────────────────────────────────────

  // ── Inline command handler (add hl, add aster, etc.) ──
  const handleCommand = useCallback(async (cmd: string): Promise<string | null | undefined> => {
    const lower = cmd.toLowerCase().trim();

    // help command
    if (lower === "help" || lower === "/help") {
      return `**Sentinel Commands:**\n\n**Exchange Setup:**\n\`add hl\` — Configure Hyperliquid (wallet + private key)\n\`add aster\` — Configure Aster DEX (API key + secret)\n\`add polymarket\` — Configure Polymarket (key + secret + passphrase)\n\n**Data Sources:**\n\`add y2\` — Y2 news sentiment\n\`add fred\` — FRED economic data (GDP, CPI, rates)\n\`add elfa\` — Elfa AI social mentions\n\n**System:**\n\`status\` — Show all connections\n\`tools\` — List all available tools\n\`clear\` — Clear chat history\n\`help\` — Show this help\n\nOr just ask me anything — I'll use the right tools automatically.`;
    }

    // tools command
    if (lower === "tools" || lower === "/tools") {
      return `**Available Tools (62+)**\n\n| Category | Tools |\n|---|---|\n| **Crypto** | get_crypto_price, get_crypto_top_n, get_crypto_batch_prices, search_crypto, get_crypto_chart |\n| **Stocks** | get_stock_price |\n| **Hyperliquid** | get_hl_positions, get_hl_account_info, get_hl_orderbook, get_hl_open_orders, get_hl_config, place_hl_order, close_hl_position, cancel_hl_order, get_hl_tradfi_assets, get_hl_tradfi_price |\n| **Aster DEX** | aster_ticker, aster_positions, aster_balance, aster_orderbook, aster_klines, aster_funding_rate, aster_exchange_info, aster_account_info, aster_open_orders, aster_place_order, aster_cancel_order, aster_cancel_all_orders, aster_set_leverage, aster_diagnose, aster_ping |\n| **Polymarket** | get_polymarket_markets, search_polymarket, get_polymarket_positions, buy_polymarket, sell_polymarket, get_polymarket_price, get_polymarket_orderbook, place_polymarket_limit, cancel_polymarket_order, cancel_all_polymarket_orders |\n| **Intelligence** | get_news_sentiment, get_news_recap, get_intelligence_reports, get_report_detail, get_trending_tokens, get_top_mentions, search_mentions, get_trending_narratives, get_token_news, search_x |\n| **Macro** | get_economic_dashboard, get_fred_series, search_fred |\n| **Telegram** | tg_read_channel, tg_list_channels, tg_send_message, tg_search_messages |\n| **Discord** | discord_list_guilds, discord_read_channel, discord_send_message, discord_search_messages, discord_list_channels |`;
    }

    // status command
    if (lower === "status" || lower === "/status") {
      const sk = getSecretKey();
      const exchanges: string[] = [];
      if (sk) {
        try {
          const vaultData = localStorage.getItem("sentinel_vault");
          if (vaultData) {
            const { encrypted_blob, nonce } = JSON.parse(vaultData);
            const vault = await decryptVault(encrypted_blob, nonce, sk);
            if (vault.exchanges?.hl?.wallet_address) exchanges.push("- **Hyperliquid** — " + (vault.exchanges.hl.private_key ? "Trading enabled" : "Read-only"));
            if (vault.exchanges?.aster?.api_key) exchanges.push("- **Aster DEX** — Connected");
            if (vault.exchanges?.polymarket?.api_key) exchanges.push("- **Polymarket** — Connected");
            if (vault.data_sources?.fred?.api_key) exchanges.push("- **FRED** — Connected");
            if (vault.data_sources?.y2?.api_key) exchanges.push("- **Y2 Intelligence** — Connected");
            if (vault.data_sources?.elfa?.api_key) exchanges.push("- **Elfa AI** — Connected");
          }
        } catch { /* vault decrypt failed */ }
      }

      const provider = localStorage.getItem("sentinel_provider")?.toUpperCase() || "None";
      const alwaysOn = ["- **CoinGecko** — Always available", "- **DexScreener** — Always available"];
      const allSources = [...alwaysOn, ...exchanges];
      const notConfigured = [];
      if (!exchanges.some(e => e.includes("Hyperliquid"))) notConfigured.push("- Hyperliquid — \`add hl\`");
      if (!exchanges.some(e => e.includes("Aster"))) notConfigured.push("- Aster DEX — \`add aster\`");
      if (!exchanges.some(e => e.includes("Polymarket"))) notConfigured.push("- Polymarket — \`add polymarket\`");

      return `**Sentinel Status**\n\n**LLM Provider:** ${provider}\n\n**Connected:**\n${allSources.join("\n")}\n${notConfigured.length > 0 ? `\n**Not configured:**\n${notConfigured.join("\n")}` : "\nAll exchanges configured."}`;
    }

    // clear command
    if (lower === "clear" || lower === "/clear") {
      clearChat();
      return null; // null = handled but no response (clearChat resets messages)
    }

    // add command — show available services
    if (lower === "add") {
      return `**Available integrations:**\n\n**Exchanges (trading):**\n\`add hl\` — Hyperliquid DEX (wallet + private key)\n\`add aster\` — Aster DEX (API key + secret)\n\`add polymarket\` — Polymarket (API key + secret + passphrase)\n\n**Market Data:**\n\`add eodhd\` — Stocks, options chains, fundamentals\n\`add coingecko\` — CoinGecko Pro (optional, free works)\n\n**Intelligence:**\n\`add y2\` — Y2 news sentiment\n\`add fred\` — FRED economic data (GDP, CPI, rates)\n\`add elfa\` — Elfa AI social mentions\n\`add x\` — X/Twitter bearer token\n\nAll keys are encrypted locally with your secret key. We never see them.`;
    }

    // add <exchange> commands — trigger the pending form state
    const addMatch = lower.match(/^add\s+(hl|hyperliquid|aster|polymarket|y2|fred|elfa|x|twitter|eodhd|yahoo|coingecko)$/);
    if (addMatch) {
      const service = addMatch[1];
      const serviceMap: Record<string, { label: string; fields: { key: string; label: string; placeholder: string; secret?: boolean }[]; url: string; vaultPath: string }> = {
        hl: { label: "Hyperliquid", url: "app.hyperliquid.xyz", vaultPath: "exchanges.hl", fields: [{ key: "wallet_address", label: "Wallet address", placeholder: "0x..." }, { key: "private_key", label: "Private key", placeholder: "0x... (for trading)", secret: true }] },
        hyperliquid: { label: "Hyperliquid", url: "app.hyperliquid.xyz", vaultPath: "exchanges.hl", fields: [{ key: "wallet_address", label: "Wallet address", placeholder: "0x..." }, { key: "private_key", label: "Private key", placeholder: "0x... (for trading)", secret: true }] },
        aster: { label: "Aster DEX", url: "asterdex.com", vaultPath: "exchanges.aster", fields: [{ key: "api_key", label: "API key", placeholder: "Your Aster API key" }, { key: "api_secret", label: "API secret", placeholder: "Your Aster secret", secret: true }] },
        polymarket: { label: "Polymarket", url: "polymarket.com", vaultPath: "exchanges.polymarket", fields: [{ key: "api_key", label: "API key", placeholder: "Your Polymarket API key" }, { key: "api_secret", label: "API secret", placeholder: "Your secret", secret: true }, { key: "passphrase", label: "Passphrase", placeholder: "Your passphrase", secret: true }] },
        y2: { label: "Y2 Intelligence", url: "y2.finance", vaultPath: "data_sources.y2", fields: [{ key: "api_key", label: "API key", placeholder: "Your Y2 API key" }] },
        fred: { label: "FRED", url: "fred.stlouisfed.org/docs/api/api_key.html", vaultPath: "data_sources.fred", fields: [{ key: "api_key", label: "API key", placeholder: "Your FRED API key" }] },
        elfa: { label: "Elfa AI", url: "elfa.ai", vaultPath: "data_sources.elfa", fields: [{ key: "api_key", label: "API key", placeholder: "Your Elfa API key" }] },
        x: { label: "X (Twitter)", url: "developer.twitter.com", vaultPath: "data_sources.x", fields: [{ key: "bearer_token", label: "Bearer token", placeholder: "Your X API bearer token", secret: true }] },
        twitter: { label: "X (Twitter)", url: "developer.twitter.com", vaultPath: "data_sources.x", fields: [{ key: "bearer_token", label: "Bearer token", placeholder: "Your X API bearer token", secret: true }] },
        eodhd: { label: "EODHD (Stocks & Options)", url: "eodhd.com/register", vaultPath: "data_sources.eodhd", fields: [{ key: "api_key", label: "API key", placeholder: "Your EODHD API key (free tier available)" }] },
        yahoo: { label: "EODHD (Stocks & Options)", url: "eodhd.com/register", vaultPath: "data_sources.eodhd", fields: [{ key: "api_key", label: "API key", placeholder: "EODHD replaces Yahoo Finance — free tier at eodhd.com" }] },
        coingecko: { label: "CoinGecko Pro", url: "coingecko.com/en/api/pricing", vaultPath: "data_sources.coingecko", fields: [{ key: "api_key", label: "API key", placeholder: "Optional — free tier works without key" }] },
      };

      const svc = serviceMap[service];
      if (!svc) return `Unknown service: ${service}`;

      // Set pending add state — the UI will render inline form fields
      setPendingAdd({ service, ...svc });
      return `**Configure ${svc.label}**\n\nGet your credentials at [${svc.url}](https://${svc.url})\n\nFill in the fields below and click **Save**. Your credentials are encrypted locally and never sent to our servers.`;
    }

    return undefined; // not a command
  }, [clearChat]);

  // Pending add exchange state
  const [pendingAdd, setPendingAdd] = useState<{
    service: string;
    label: string;
    fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
    vaultPath: string;
  } | null>(null);

  // Save exchange credentials to vault
  const saveExchangeCredentials = useCallback(async (values: Record<string, string>) => {
    const sk = getSecretKey();
    if (!sk) {
      setMessages((m) => [...m, { id: genId(), role: "assistant", content: "Error: No vault key found. Please log out and log back in.", timestamp: ts() }]);
      setPendingAdd(null);
      return;
    }

    // Load existing vault or create empty
    let vault: VaultConfig = { exchanges: {}, data_sources: {} };
    try {
      const vaultData = localStorage.getItem("sentinel_vault");
      if (vaultData) {
        const { encrypted_blob, nonce } = JSON.parse(vaultData);
        vault = await decryptVault(encrypted_blob, nonce, sk);
      }
    } catch { /* start fresh */ }

    // Set values at the correct vault path
    const path = pendingAdd?.vaultPath || "";
    const [section, key] = path.split(".") as ["exchanges" | "data_sources", string];
    if (section && key) {
      if (!vault[section]) vault[section] = {} as VaultConfig["exchanges"] & VaultConfig["data_sources"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (vault[section] as any)[key] = values;
    }

    // Encrypt and save
    const encrypted = await encryptVault(vault, sk);
    localStorage.setItem("sentinel_vault", JSON.stringify(encrypted));

    // Mark wallets as configured
    if (section === "exchanges") {
      localStorage.setItem("sentinel_wallets_configured", "true");
      setHasWallets(true);
    }

    const label = pendingAdd?.label || "Service";
    setMessages((m) => [...m, { id: genId(), role: "assistant", content: `**${label}** configured successfully.\n\nCredentials encrypted and saved to your local vault. You can now use ${label} tools.\n\nType \`status\` to verify all connections.`, timestamp: ts() }]);
    setPendingAdd(null);
  }, [pendingAdd]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return;

    // ── Check for commands first ──
    const cmdResult = await handleCommand(text);
    if (cmdResult === null) return; // command handled with side effect (e.g. clear)
    if (cmdResult !== undefined) {
      // Command returned a response — show it without hitting LLM
      setMessages((m) => [...m,
        { id: genId(), role: "user", content: text, timestamp: ts() },
        { id: genId(), role: "assistant", content: cmdResult, timestamp: ts() },
      ]);
      setInput("");
      if (inputRef.current) { inputRef.current.style.height = "auto"; }
      return;
    }

    const userMsg: Message = { id: genId(), role: "user", content: text, timestamp: ts() };
    const assistantId = genId();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "", timestamp: ts() }]);
    setInput("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
    setIsThinking(true);

    try {
      // ── Fast path: direct price lookup ──
      const priceCoins = detectPriceQuery(text);
      if (priceCoins) {
        const allToolCalls: ToolCall[] = [];
        const results: string[] = [];

        for (const coinId of priceCoins) {
          const tc: ToolCall = { name: "get_crypto_price", args: { coin_id: coinId }, status: "calling" };
          allToolCalls.push(tc);
          setMessages((m) => {
            const u = [...m];
            u[u.length - 1] = { ...u[u.length - 1], content: "Fetching live data...", toolCalls: [...allToolCalls] };
            return u;
          });

          try {
            const result = await directToolCall("get_crypto_price", { coin_id: coinId }) as Record<string, string>;
            tc.status = "done";
            tc.result = `${result.price} (${result.change_24h})`;
            results.push(`**${coinId.charAt(0).toUpperCase() + coinId.slice(1)}**: \`${result.price}\` (${result.change_24h} 24h) · MCap ${result.market_cap} · Vol ${result.volume_24h}`);
          } catch (err) {
            tc.status = "error";
            tc.result = err instanceof Error ? err.message : "Failed";
            results.push(`${coinId}: error — ${tc.result}`);
          }

          setMessages((m) => {
            const u = [...m];
            u[u.length - 1] = { ...u[u.length - 1], toolCalls: [...allToolCalls] };
            return u;
          });
        }

        setMessages((m) => {
          const u = [...m];
          u[u.length - 1] = { ...u[u.length - 1], content: results.join("\n\n"), toolCalls: allToolCalls };
          return u;
        });
        setIsThinking(false);
        inputRef.current?.focus();
        return;
      }

      // ── Direct tool routing (no LLM needed) ──
      const directRoutes = detectDirectTool(text);
      if (directRoutes) {
        const allToolCalls: ToolCall[] = [];
        const resultParts: string[] = [];

        for (const route of directRoutes) {
          const tc: ToolCall = { name: route.tool, args: route.params, status: "calling" };
          allToolCalls.push(tc);
          setMessages((m) => {
            const u = [...m];
            u[u.length - 1] = { ...u[u.length - 1], content: `Fetching ${route.label}...`, toolCalls: [...allToolCalls] };
            return u;
          });

          try {
            let result: unknown;
            try { result = await api.call(route.tool, route.params); }
            catch { result = await directToolCall(route.tool, route.params); }
            tc.status = "done";
            const formatted = formatToolResult(route.tool, result);
            tc.result = formatted.slice(0, 500);
            resultParts.push(`**${route.label}**\n\n${formatted}`);
          } catch (err) {
            tc.status = "error";
            tc.result = err instanceof Error ? err.message : "Failed";
            resultParts.push(`**${route.label}**: ${tc.result}`);
          }

          setMessages((m) => {
            const u = [...m];
            u[u.length - 1] = { ...u[u.length - 1], toolCalls: [...allToolCalls] };
            return u;
          });
        }

        setMessages((m) => {
          const u = [...m];
          u[u.length - 1] = { ...u[u.length - 1], content: resultParts.join("\n\n"), toolCalls: allToolCalls };
          return u;
        });
        setIsThinking(false);
        inputRef.current?.focus();
        return;
      }

      // ── Standard path: LLM + tool calling (SSE streaming) ──
      const frontendProvider = localStorage.getItem("sentinel_provider") || "";
      const aiKey = frontendProvider ? localStorage.getItem(`sentinel_${frontendProvider}_key`) : null;
      const gatewayProvider = GATEWAY_PROVIDER[frontendProvider] || frontendProvider;
      const model = selectedModel || DEFAULT_MODELS[gatewayProvider] || "";

      if (!aiKey) throw new Error("No AI key found. Log in with your API key first.");

      const headers = api.getHeaders();
      headers["X-AI-Key"] = aiKey;

      const history: { role: string; content: string }[] = [
        { role: "system", content: buildSystemPrompt(hasWallets) },
        ...messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];

      const allToolCalls: ToolCall[] = [];
      let finalText = "";
      let finalMeta: SentinelMeta | undefined;

      // Streaming is supported for anthropic, openai, xai — not google (yet)
      const canStream = ["anthropic", "openai", "xai"].includes(gatewayProvider);

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        // First round: stream tokens live. Follow-up rounds (tool results → LLM): non-streaming
        // because we need the full text to parse ```tool blocks
        const useStream = canStream && round === 0;

        const res = await fetch(`${api.getBaseUrl()}/api/v1/llm/chat?stream=${useStream}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ messages: history, ai_key: aiKey, provider: gatewayProvider, model }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          const errMsg = typeof err.detail === "string" ? err.detail
            : typeof err.error === "string" ? err.error
            : err.error?.message || err.message || err.title || JSON.stringify(err).slice(0, 200);
          throw new Error(errMsg);
        }

        let rawText = "";

        if (useStream && res.body) {
          // ── SSE Streaming: read tokens word-by-word ──
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let streamText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              // Handle both "data: {...}" and "data:{...}" (with or without space)
              const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6).trim() : trimmed.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const event = JSON.parse(jsonStr);
                if (event.done) {
                  // Final event with usage metadata
                  if (event.usage) {
                    finalMeta = {
                      total_tokens: event.usage.total_tokens,
                      platform_fee: event.usage.cost,
                      latency_ms: event.usage.latency_ms,
                      provider: gatewayProvider,
                    };
                  }
                } else {
                  // Extract token text — gateway sends {text: "..."}, handle other shapes too
                  const token = event.text ?? event.content ?? event.delta ?? "";
                  if (token) {
                    streamText += token;
                    // Update message in real-time (token by token)
                    const captured = streamText;
                    setMessages((m) => {
                      const u = [...m];
                      u[u.length - 1] = { ...u[u.length - 1], content: captured };
                      return u;
                    });
                  }
                }
              } catch { /* skip malformed SSE events */ }
            }
          }
          rawText = streamText;
        } else {
          // ── Non-streaming fallback (Google, or tool follow-up rounds) ──
          const data = await res.json();
          rawText = extractText(data, gatewayProvider);
          // Gateway injects sentinel_meta into the provider response
          const meta = data.sentinel_meta as Record<string, unknown> | undefined;
          if (meta) {
            finalMeta = {
              total_tokens: meta.total_tokens as number,
              platform_fee: meta.platform_fee as string,
              latency_ms: meta.latency_ms as number,
              provider: (meta.provider as string) || gatewayProvider,
            };
          }
        }

        const tools = parseToolCalls(rawText);

        if (tools.length === 0) {
          finalText = rawText;
          break;
        }

        // Has tool calls — execute them
        const displayText = stripToolBlocks(rawText);
        history.push({ role: "assistant", content: rawText });
        const resultParts: string[] = [];

        for (const tool of tools) {
          const tc: ToolCall = { name: tool.name, args: tool.params, status: "calling" };
          allToolCalls.push(tc);

          setMessages((m) => {
            const u = [...m];
            u[u.length - 1] = { ...u[u.length - 1], content: displayText || "Executing...", toolCalls: [...allToolCalls] };
            return u;
          });

          try {
            let result: unknown;
            try { result = await api.call(tool.name, tool.params); }
            catch { result = await directToolCall(tool.name, tool.params); }
            tc.status = "done";
            const resultStr = typeof result === "string" ? result : JSON.stringify(result);
            tc.result = resultStr.slice(0, 500);
            resultParts.push(`[${tool.name}]\n${resultStr.slice(0, 3000)}`);
          } catch (err) {
            tc.status = "error";
            tc.result = err instanceof Error ? err.message : "Failed";
            resultParts.push(`[${tool.name} ERROR]\n${tc.result}`);
          }

          setMessages((m) => {
            const u = [...m];
            u[u.length - 1] = { ...u[u.length - 1], toolCalls: [...allToolCalls] };
            return u;
          });
        }

        history.push({ role: "user", content: `Tool results:\n\n${resultParts.join("\n\n")}` });
      }

      if (!finalText && allToolCalls.length > 0) {
        finalText = "Done — tool results shown above.";
      }
      if (!finalText && allToolCalls.length === 0) {
        finalText = "No response received from the LLM. Check your API key and try again.";
      }

      setMessages((m) => {
        const u = [...m];
        u[u.length - 1] = {
          ...u[u.length - 1],
          content: finalText,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
          meta: finalMeta,
        };
        return u;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setMessages((m) => {
        const u = [...m];
        const last = u[u.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          u[u.length - 1] = { ...last, content: "", error: msg };
        } else {
          u.push({ id: genId(), role: "assistant", content: "", error: msg, timestamp: ts() });
        }
        return u;
      });
    }

    setIsThinking(false);
    inputRef.current?.focus();
  }, [isThinking, messages, user, hasWallets, selectedModel]);

  const handleSend = () => sendMessage(input);

  const quickActions = hasWallets
    ? [
        { label: "BTC Price", prompt: "What's the current BTC price?" },
        { label: "Positions", prompt: "Show all my open positions across Hyperliquid and Aster" },
        { label: "Trending", prompt: "What are the top trending tokens right now?" },
        { label: "Portfolio", prompt: "Show my account balances and P&L across all venues" },
      ]
    : [
        { label: "BTC Price", prompt: "What's the current BTC price and 24h change?" },
        { label: "Top 10", prompt: "Show me the top 10 coins by market cap" },
        { label: "News Brief", prompt: "Give me a quick news recap for crypto markets" },
        { label: "Macro", prompt: "Show me the current macro dashboard — GDP, CPI, Fed rate, VIX" },
      ];

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: "#08080C" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(17,17,20,0.5)" }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00FF88", boxShadow: "0 0 6px rgba(0,255,136,0.4)" }} />
          <span className="text-[11px] font-semibold" style={{ color: "#E4E4E7" }}>Sentinel</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,255,136,0.08)", color: "#00FF88", border: "1px solid rgba(0,255,136,0.15)" }}>
            {user?.provider?.toUpperCase() || "AI"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Model selector */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="text-[9px] font-mono px-2 py-1 rounded transition-colors hover:bg-white/5 flex items-center gap-1"
              style={{ color: "#71717A" }}
              title="Select model"
            >
              {(() => {
                const provider = GATEWAY_PROVIDER[localStorage.getItem("sentinel_provider") || ""] || localStorage.getItem("sentinel_provider") || "";
                const models = MODELS_PER_PROVIDER[provider] || [];
                const current = models.find(m => m.id === selectedModel);
                return current?.label || selectedModel || DEFAULT_MODELS[provider] || "Auto";
              })()}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showModelDropdown && (
              <div
                className="absolute right-0 top-full mt-1 rounded-lg py-1 z-50 min-w-[160px]"
                style={{ background: "#1A1A1E", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
              >
                {(() => {
                  const provider = GATEWAY_PROVIDER[localStorage.getItem("sentinel_provider") || ""] || localStorage.getItem("sentinel_provider") || "";
                  const models = MODELS_PER_PROVIDER[provider] || [];
                  return models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        localStorage.setItem("sentinel_model", m.id);
                        setShowModelDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-mono transition-colors hover:bg-white/5 flex items-center justify-between"
                      style={{ color: m.id === (selectedModel || DEFAULT_MODELS[provider]) ? "#00FF88" : "#A1A1AA" }}
                    >
                      {m.label}
                      {m.id === (selectedModel || DEFAULT_MODELS[provider]) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
          <button
            onClick={clearChat}
            className="text-[9px] px-2 py-1 rounded transition-colors hover:bg-white/5"
            style={{ color: "#52525B" }}
            title="Clear chat"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`group ${msg.role === "user" ? "flex justify-end" : ""}`}>
              {msg.role === "user" ? (
                /* ── User message ── */
                <div className="max-w-[85%]">
                  <div
                    className="rounded-2xl rounded-br-md px-4 py-3 text-xs leading-relaxed"
                    style={{
                      background: "rgba(139, 92, 246, 0.12)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      color: "#E4E4E7",
                    }}
                  >
                    {msg.content}
                  </div>
                  <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setMessages(m => m.filter(x => x.id !== msg.id))}
                      className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:bg-white/5"
                      style={{ color: "#3F3F46" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Assistant message ── */
                <div className="relative">
                  {/* Sentinel avatar */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{
                      background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.1))",
                      border: "1px solid rgba(0,255,136,0.2)",
                    }}>
                      <span className="text-[10px] font-bold" style={{ color: "#00FF88" }}>S</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Tool call cards */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {msg.toolCalls.map((tc, j) => (
                            <div
                              key={j}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono"
                              style={{
                                background: tc.status === "error"
                                  ? "rgba(255, 68, 68, 0.05)"
                                  : tc.status === "done"
                                  ? "rgba(0, 255, 136, 0.04)"
                                  : "rgba(251, 191, 36, 0.04)",
                                border: `1px solid ${
                                  tc.status === "error" ? "rgba(255,68,68,0.12)"
                                  : tc.status === "done" ? "rgba(0,255,136,0.1)"
                                  : "rgba(251,191,36,0.1)"
                                }`,
                              }}
                            >
                              {tc.status === "calling" ? (
                                <span className="w-2.5 h-2.5 rounded-full border border-current animate-spin" style={{ borderColor: "#FBBF24", borderTopColor: "transparent" }} />
                              ) : tc.status === "done" ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              ) : (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              )}
                              <span style={{ color: "#00E5FF" }}>{tc.name}</span>
                              {tc.status === "done" && tc.result && (
                                <span className="ml-auto truncate max-w-[180px]" style={{ color: "#3F3F46" }}>
                                  {tc.result.slice(0, 80)}
                                </span>
                              )}
                              {tc.status === "error" && tc.result && (
                                <span className="ml-auto" style={{ color: "#FF4444", fontSize: "9px" }}>
                                  {tc.result.slice(0, 50)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Thinking indicator */}
                      {msg.content === "" && !msg.error && isThinking && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#8B5CF6" }} />
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#8B5CF6", animationDelay: "0.15s" }} />
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#8B5CF6", animationDelay: "0.3s" }} />
                          </div>
                          <span className="text-[10px] font-mono" style={{ color: "#3F3F46" }}>thinking...</span>
                        </div>
                      )}

                      {/* Error card */}
                      {msg.error && (
                        <div className="rounded-lg px-3 py-2.5 my-1" style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)" }}>
                          <p className="text-[11px] font-semibold" style={{ color: "#FF4444" }}>Request failed</p>
                          <p className="text-[10px] mt-1 font-mono" style={{ color: "#71717A" }}>{msg.error}</p>
                          <button
                            onClick={() => {
                              // Find the preceding user message and retry
                              const idx = messages.findIndex(m => m.id === msg.id);
                              if (idx > 0 && messages[idx - 1].role === "user") {
                                // Remove the error message and resend
                                setMessages(m => m.filter(x => x.id !== msg.id));
                                sendMessage(messages[idx - 1].content);
                              }
                            }}
                            className="text-[10px] font-semibold mt-2 px-3 py-1 rounded-md transition-colors hover:bg-white/5"
                            style={{ color: "#FF4444", border: "1px solid rgba(255,68,68,0.2)" }}
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {/* Message content with rich markdown */}
                      {msg.content && <RichMarkdown text={msg.content} />}

                      {/* Meta + actions footer */}
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-mono" style={{ color: "#27272A" }}>{msg.timestamp}</span>
                        {msg.meta && (
                          <span className="text-[9px] font-mono" style={{ color: "#27272A" }}>
                            {msg.meta.total_tokens ? `${msg.meta.total_tokens} tok` : ""}
                            {msg.meta.platform_fee ? ` · ${msg.meta.platform_fee}` : ""}
                            {msg.meta.latency_ms ? ` · ${msg.meta.latency_ms}ms` : ""}
                          </span>
                        )}
                        <button
                          onClick={() => copyMessage(msg.id, msg.content)}
                          className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:bg-white/5"
                          style={{ color: copiedId === msg.id ? "#00FF88" : "#3F3F46" }}
                        >
                          {copiedId === msg.id ? "Copied" : "Copy"}
                        </button>
                        {/* Retry: re-send the preceding user message */}
                        {msg.role === "assistant" && !msg.error && (
                          <button
                            onClick={() => {
                              const idx = messages.findIndex(m => m.id === msg.id);
                              if (idx > 0 && messages[idx - 1].role === "user") {
                                const userText = messages[idx - 1].content;
                                setMessages(m => m.filter(x => x.id !== msg.id && x.id !== messages[idx - 1].id));
                                sendMessage(userText);
                              }
                            }}
                            className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:bg-white/5"
                            style={{ color: "#3F3F46" }}
                          >
                            Retry
                          </button>
                        )}
                        {/* Delete message */}
                        <button
                          onClick={() => setMessages(m => m.filter(x => x.id !== msg.id))}
                          className="text-[9px] px-1.5 py-0.5 rounded transition-colors hover:bg-white/5"
                          style={{ color: "#3F3F46" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Inline exchange configuration form */}
      {pendingAdd && (
        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid rgba(0,255,136,0.1)" }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const values: Record<string, string> = {};
              pendingAdd.fields.forEach((f) => {
                values[f.key] = (formData.get(f.key) as string) || "";
              });
              await saveExchangeCredentials(values);
            }}
            className="max-w-md mx-auto space-y-2"
          >
            {pendingAdd.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[10px] font-mono mb-0.5" style={{ color: "#A1A1AA" }}>
                  {field.label}
                </label>
                <input
                  name={field.key}
                  type={field.secret ? "password" : "text"}
                  placeholder={field.placeholder}
                  className="w-full text-xs px-3 py-2 rounded-lg outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#E4E4E7",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  required
                  autoComplete="off"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.1))",
                  border: "1px solid rgba(0,255,136,0.3)",
                  color: "#00FF88",
                }}
              >
                Save to Vault
              </button>
              <button
                type="button"
                onClick={() => setPendingAdd(null)}
                className="text-[11px] px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "#52525B" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {messages.length <= 1 && (
        <div className="px-4 py-2 flex gap-1.5 flex-wrap justify-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => sendMessage(qa.prompt)}
              className="text-[10px] px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#A1A1AA",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,255,136,0.2)";
                e.currentTarget.style.color = "#00FF88";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "#A1A1AA";
              }}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(10,10,14,0.8)" }}>
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Message Sentinel..."
            disabled={isThinking}
            rows={1}
            className="flex-1 resize-none bg-transparent text-xs font-mono focus:outline-none disabled:opacity-50"
            style={{ color: "#E4E4E7", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={isThinking || !input.trim()}
            className="p-2 rounded-lg transition-all disabled:opacity-20 shrink-0"
            style={{
              background: input.trim() ? "#00FF88" : "transparent",
              color: input.trim() ? "#000" : "#3F3F46",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[9px] font-mono mt-1.5" style={{ color: "#1C1C1E" }}>
          Sentinel can make mistakes · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
