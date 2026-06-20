"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: string;
  status: "running" | "done" | "error";
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  tools?: ToolCall[];
}

// ── Tool parsing ─────────────────────────────────────────────

interface ParsedTool { name: string; params: Record<string, unknown> }

function parseToolCalls(text: string): ParsedTool[] {
  const calls: ParsedTool[] = [];
  const regex = /```tool\s*([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    try {
      const p = JSON.parse(m[1].trim());
      if (p.name) calls.push({ name: p.name, params: p.params || {} });
    } catch { /* skip */ }
  }
  return calls;
}

function stripToolBlocks(text: string): string {
  return text.replace(/```tool\s*[\s\S]*?```\n?/g, "").trim();
}

async function directToolCall(name: string, params: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_crypto_price": {
      const id = String(params.coin_id || "bitcoin").toLowerCase();
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`);
      const data = await res.json();
      const coin = data[id];
      if (!coin) throw new Error(`Coin "${id}" not found`);
      return { coin_id: id, price: `$${coin.usd.toLocaleString()}`, change_24h: `${coin.usd_24h_change?.toFixed(2)}%`, market_cap: `$${(coin.usd_market_cap / 1e9).toFixed(2)}B`, volume_24h: `$${(coin.usd_24h_vol / 1e9).toFixed(2)}B` };
    }
    default:
      throw new Error(`Tool "${name}" requires the backend.`);
  }
}

const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = `You are Sentinel, an AI trading assistant with 69 tools. Be concise and professional.

TOOL CALLING FORMAT — when you need live data or want to execute an action, output EXACTLY:

\`\`\`tool
{"name": "tool_name", "params": {"key": "value"}}
\`\`\`

After each tool call you will receive the result, then respond to the user.

KEY TOOLS:
  get_crypto_price — params: {coin_id: "bitcoin"} — live price, 24h change, volume, mcap
  get_crypto_top_n — params: {n: 10} — top coins by market cap
  search_crypto — params: {query: "..."} — search coins
  get_stock_price — params: {symbol: "AAPL"} — stock price
  get_economic_dashboard — no params — GDP, CPI, Fed rate, VIX
  get_news_recap — no params — AI news summary
  get_trending_tokens — no params — trending tokens
  get_hl_positions — no params — open perp positions
  get_hl_account_info — no params — equity, margin
  get_polymarket_markets — params: {limit: 10} — prediction markets

Use tools to fetch real data — never fabricate prices or positions.`;

const GATEWAY_PROVIDER: Record<string, string> = {
  gemini: "google", claude: "anthropic", gpt: "openai", openai: "openai", grok: "xai",
};
const DEFAULT_MODELS: Record<string, string> = {
  google: "gemini-2.0-flash", anthropic: "claude-sonnet-4-20250514", openai: "gpt-4o", xai: "grok-2",
};

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState(() => typeof window !== "undefined" ? localStorage.getItem("sentinel_provider") || "claude" : "claude");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

    try {
      const frontendProvider = typeof window !== "undefined" ? localStorage.getItem("sentinel_provider") || "" : "";
      const aiKey = typeof window !== "undefined" ? (frontendProvider ? localStorage.getItem(`sentinel_${frontendProvider}_key`) : localStorage.getItem("sentinel_ai_key")) || "" : "";
      const gatewayProvider = GATEWAY_PROVIDER[frontendProvider] || frontendProvider;
      const model = DEFAULT_MODELS[gatewayProvider] || "";

      if (!aiKey) throw new Error("No AI key configured. Set your AI key in Settings.");

      const headers = api.getHeaders();
      headers["X-AI-Key"] = aiKey;

      const internalHistory: { role: string; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...[...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
      ];

      const canStream = ["anthropic", "openai", "xai"].includes(gatewayProvider);
      const allToolCalls: ToolCall[] = [];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const useStream = canStream && round === 0;

        const res = await fetch(`${api.getBaseUrl()}/api/v1/llm/chat?stream=${useStream}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ messages: internalHistory, ai_key: aiKey, provider: gatewayProvider, model }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let rawText = "";

        if (useStream && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6).trim() : trimmed.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const event = JSON.parse(jsonStr);
                const token = event.text ?? event.content ?? event.delta ?? "";
                if (token && !event.done) {
                  rawText += token;
                  const captured = rawText;
                  setMessages((prev) => {
                    const u = [...prev];
                    u[u.length - 1] = { ...u[u.length - 1], content: captured };
                    return u;
                  });
                }
              } catch { /* skip */ }
            }
          }
        } else {
          const data = await res.json();
          if (gatewayProvider === "google") rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          else if (gatewayProvider === "anthropic") rawText = data?.content?.[0]?.text || "";
          else rawText = data?.choices?.[0]?.message?.content || "";
          if (!rawText) rawText = data?.text || data?.content || data?.message || "";
          if (rawText) {
            const captured = rawText;
            setMessages((prev) => {
              const u = [...prev];
              u[u.length - 1] = { ...u[u.length - 1], content: captured };
              return u;
            });
          }
        }

        // Parse tool calls
        const tools = parseToolCalls(rawText);
        if (tools.length === 0) {
          // Final response — update with clean text and any accumulated tools
          const finalContent = rawText || "No response received.";
          setMessages((prev) => {
            const u = [...prev];
            u[u.length - 1] = { ...u[u.length - 1], content: finalContent, tools: allToolCalls.length > 0 ? allToolCalls : undefined };
            return u;
          });
          break;
        }

        // Execute tools
        const displayText = stripToolBlocks(rawText);
        internalHistory.push({ role: "assistant", content: rawText });
        const resultParts: string[] = [];

        for (const tool of tools) {
          const tc: ToolCall = { name: tool.name, args: tool.params, status: "running" };
          allToolCalls.push(tc);
          setMessages((prev) => {
            const u = [...prev];
            u[u.length - 1] = { ...u[u.length - 1], content: displayText || "Executing tools...", tools: [...allToolCalls] };
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

          setMessages((prev) => {
            const u = [...prev];
            u[u.length - 1] = { ...u[u.length - 1], tools: [...allToolCalls] };
            return u;
          });
        }

        internalHistory.push({ role: "user", content: `Tool results:\n\n${resultParts.join("\n\n")}` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Error: ${msg}`, role: "system" };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  const providerLabel: Record<string, string> = {
    claude: "Claude",
    gpt: "GPT-4o",
    openai: "GPT-4o",
    gemini: "Gemini",
    grok: "Grok",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-8 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div>
          <h1 className="text-lg font-semibold text-white">Playground</h1>
          <p className="text-xs" style={{ color: "#71717A" }}>Test Sentinel tools and LLM chat interactively via your API</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00FF88" }} />
            <span className="text-[10px] font-mono" style={{ color: "#71717A" }}>{providerLabel[provider] || provider}</span>
          </div>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg outline-none cursor-pointer"
            style={{ background: "#1A1A1E", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="claude">Claude</option>
            <option value="openai">GPT-4</option>
            <option value="gemini">Gemini</option>
            <option value="grok">Grok</option>
          </select>
          <button
            onClick={() => setMessages([])}
            className="text-xs px-3 py-2 rounded-lg transition hover:text-white"
            style={{ background: "rgba(255,255,255,0.04)", color: "#71717A" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-8 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center stagger-1">
            {/* Radial glow behind icon */}
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{
                left: "50%", top: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
              }} />
              <span className="text-5xl relative z-10" style={{ opacity: 0.3 }}>—</span>
            </div>
            <p className="text-base font-medium" style={{ color: "#52525B" }}>Start testing with Sentinel</p>
            <p className="text-xs max-w-md" style={{ color: "#3F3F46" }}>
              Ask about crypto prices, place trades, get market intel, or use any of 69 tools. Your AI key is forwarded to your chosen provider.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {["What's the price of BTC?", "Show me trending tokens", "Get the macro dashboard"].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-2 rounded-lg transition hover:scale-[1.02]"
                  style={{ background: "rgba(139, 92, 246, 0.06)", color: "#A78BFA", border: "1px solid rgba(139, 92, 246, 0.12)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === "user" ? "rgba(139, 92, 246, 0.12)" : msg.role === "system" ? "rgba(255, 68, 68, 0.06)" : "#1A1A1E",
                color: msg.role === "system" ? "#FF4444" : "#E4E4E7",
                border: `1px solid ${msg.role === "user" ? "rgba(139, 92, 246, 0.2)" : msg.role === "system" ? "rgba(255, 68, 68, 0.15)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {msg.role === "assistant" && (
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#52525B" }}>
                  {providerLabel[provider] || "AI"}
                </div>
              )}
              <pre className="whitespace-pre-wrap font-[inherit]">
                {msg.content || (streaming && i === messages.length - 1 ? "" : "")}
              </pre>
              {msg.tools && msg.tools.length > 0 && (
                <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] font-mono mb-1" style={{ color: "#00E5FF" }}>Tools Used:</p>
                  {msg.tools.map((tool, ti) => (
                    <div key={ti} className="flex items-center gap-2 text-[10px] font-mono py-0.5">
                      <span style={{ color: tool.status === "done" ? "#00FF88" : tool.status === "error" ? "#FF4444" : "#FBBF24" }}>
                        {tool.status === "done" ? "[ok]" : tool.status === "error" ? "[err]" : "[...]"}
                      </span>
                      <span style={{ color: "#71717A" }}>{tool.name}</span>
                      {tool.result && <span className="truncate max-w-[200px]" style={{ color: "#52525B" }}>{tool.result.slice(0, 80)}</span>}
                    </div>
                  ))}
                </div>
              )}
              {streaming && i === messages.length - 1 && <span className="streaming-cursor" />}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 px-8 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask Sentinel anything..."
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
            style={{ background: "#1A1A1E", color: "#E4E4E7", border: "1px solid rgba(255,255,255,0.08)" }}
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", color: "white" }}
          >
            {streaming ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
