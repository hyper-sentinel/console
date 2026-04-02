"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ── Types ──
interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "calling" | "done" | "error";
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

const MODES = [
  { id: "solo", label: "Solo", icon: "◉", desc: "Single agent" },
  { id: "swarm", label: "Swarm", icon: "⬡", desc: "Multi-agent" },
  { id: "team", label: "Team", icon: "◫", desc: "Coordinate" },
] as const;

const SYSTEM_PROMPT = `You are Sentinel, an autonomous AI trading agent with access to 62+ tools. You operate the Web4 terminal — a unified cockpit for leverage trading on Hyperliquid and Aster DEX, prediction markets on Polymarket, and real-time market intelligence.

Your capabilities:
- TRADING: Place/close/cancel orders on Hyperliquid (perps), Aster DEX (perps), Polymarket (prediction markets)
- MARKET DATA: Live prices, charts, orderbooks, funding rates from all venues
- INTELLIGENCE: News sentiment, trending tokens, social mentions, X/Twitter search
- MACRO: FRED economic data, GDP, CPI, Fed rate, VIX
- SOCIAL: Read/send Telegram & Discord messages, monitor channels
- PORTFOLIO: Positions, balances, P&L across all venues

Be precise. Use exact numbers. When asked about prices, fetch live data. When asked to trade, confirm the details before executing. You are the agent — the user is the pilot.`;

const QUICK_ACTIONS = [
  { label: "BTC Price", prompt: "What's the current BTC price and 24h change?" },
  { label: "My Positions", prompt: "Show all my open positions across Hyperliquid and Aster" },
  { label: "Market Scan", prompt: "What are the top trending tokens right now? Any notable movers?" },
  { label: "News Brief", prompt: "Give me a quick news recap for crypto markets" },
];

export default function CopilotPane() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Sentinel online. 62 tools loaded. What would you like to analyze?",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("solo");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const chatHistory = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...messages
          .filter((m) => m.role !== "system")
          .slice(-20) // Keep last 20 messages for context window
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: text },
      ];

      const provider = localStorage.getItem("sentinel_provider");
      const aiKey = provider ? localStorage.getItem(`sentinel_${provider}_key`) : null;

      // Add placeholder for streaming
      const placeholderMsg: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        toolCalls: [],
      };
      setMessages((m) => [...m, placeholderMsg]);

      // Build headers using the API client (includes X-API-Key + Bearer)
      const headers = api.getHeaders();
      if (aiKey) headers["X-AI-Key"] = aiKey;

      // Gemini doesn't support SSE streaming on the Go gateway
      const supportsStreaming = provider !== "gemini";
      const streamParam = supportsStreaming ? "true" : "false";

      const response = await fetch(`${api.getBaseUrl()}/api/v1/llm/chat?stream=${streamParam}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: chatHistory,
          ai_key: aiKey,
          provider,
          mode,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.detail || err.error || err.message || `API error: ${response.status}`);
      }

      let fullText = "";
      const toolCalls: ToolCall[] = [];

      if (!supportsStreaming) {
        // Non-streaming: parse JSON response directly (Gemini)
        const data = await response.json();
        fullText = data.content || data.message || data.response || data.text || 
                   (typeof data === "string" ? data : JSON.stringify(data));
        
        // Handle tool calls in non-streaming response
        if (data.tool_calls && Array.isArray(data.tool_calls)) {
          for (const tc of data.tool_calls) {
            toolCalls.push({
              name: tc.name || tc.tool,
              args: tc.args || tc.params || {},
              status: "done",
              result: tc.result ? (typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result).slice(0, 200)) : undefined,
            });
          }
        }

        setMessages((m) => {
          const updated = [...m];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          };
          return updated;
        });
      } else {
        // Streaming: read SSE chunks
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") continue;

              try {
                const data = JSON.parse(raw);

                // Handle text chunks
                if (data.text) {
                  fullText += data.text;
                  setMessages((m) => {
                    const updated = [...m];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: fullText,
                    };
                    return updated;
                  });
                }

                // Handle tool call events
                if (data.tool_call) {
                  const tc: ToolCall = {
                    name: data.tool_call.name || data.tool_call.tool,
                    args: data.tool_call.args || data.tool_call.params || {},
                    status: "calling",
                  };
                  toolCalls.push(tc);
                  setMessages((m) => {
                    const updated = [...m];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      toolCalls: [...toolCalls],
                    };
                    return updated;
                  });
                }

                if (data.tool_result) {
                  const lastTc = toolCalls[toolCalls.length - 1];
                  if (lastTc) {
                    lastTc.status = "done";
                    lastTc.result = typeof data.tool_result === "string"
                      ? data.tool_result
                      : JSON.stringify(data.tool_result).slice(0, 200);
                    setMessages((m) => {
                      const updated = [...m];
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        toolCalls: [...toolCalls],
                      };
                      return updated;
                    });
                  }
                }
              } catch { /* skip malformed SSE */ }
            }
          }
        }

        // Fallback if streaming produced no text
        if (!fullText) {
          const resp = await api.llmChat(chatHistory);
          const reply =
            typeof resp === "string"
              ? resp
              : ((resp as Record<string, unknown>)?.content ??
                  (resp as Record<string, unknown>)?.message ??
                  (resp as Record<string, unknown>)?.response ??
                  JSON.stringify(resp));
          setMessages((m) => {
            const updated = [...m];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: String(reply),
            };
            return updated;
          });
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connection failed";
      setMessages((m) => {
        const updated = [...m];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.content === "") {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: `Connection error: ${errorMsg}\n\nMake sure the Go gateway is running and your AI key is valid.`,
          };
        } else {
          updated.push({
            role: "assistant",
            content: `Connection error: ${errorMsg}`,
            timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          });
        }
        return updated;
      });
    }
    setIsThinking(false);
    inputRef.current?.focus();
  }, [isThinking, messages, mode]);

  const handleSend = () => sendMessage(input);

  return (
    <div className="flex flex-col h-full">
      {/* Mode selector */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-colors"
            style={{
              background: mode === m.id ? "rgba(139,92,246,0.12)" : "transparent",
              color: mode === m.id ? "#A78BFA" : "var(--text-dim)",
              border: mode === m.id ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
            }}
          >
            <span style={{ fontSize: "11px" }}>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
        <span
          className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded"
          style={{
            color: "#71717A",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {user?.provider?.toUpperCase() || "AI"}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-2 space-y-2 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[88%] rounded-lg px-3 py-2 text-xs"
              style={{
                background: msg.role === "user"
                  ? "rgba(139, 92, 246, 0.1)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  msg.role === "user"
                    ? "rgba(139,92,246,0.2)"
                    : "rgba(255,255,255,0.05)"
                }`,
                color: "#E4E4E7",
              }}
            >
              {/* Tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolCalls.map((tc, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono"
                      style={{
                        background: "rgba(0, 229, 255, 0.06)",
                        border: "1px solid rgba(0, 229, 255, 0.12)",
                      }}
                    >
                      <span style={{
                        color: tc.status === "calling" ? "var(--accent-yellow)"
                          : tc.status === "done" ? "var(--accent-green)"
                          : "var(--accent-red)",
                      }}>
                        {tc.status === "calling" ? "⟳" : tc.status === "done" ? "✓" : "✗"}
                      </span>
                      <span style={{ color: "var(--accent-cyan)" }}>{tc.name}</span>
                      {tc.args && Object.keys(tc.args).length > 0 && (
                        <span style={{ color: "var(--text-dim)" }}>
                          ({Object.entries(tc.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ").slice(0, 60)})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.content === "" && isThinking && (
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#8B5CF6" }} />
                    <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#8B5CF6", animationDelay: "0.15s" }} />
                    <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#8B5CF6", animationDelay: "0.3s" }} />
                  </div>
                  <span className="text-[10px]" style={{ color: "#52525B" }}>thinking...</span>
                </div>
              )}
              <p className="text-[8px] mt-1 font-mono" style={{ color: "#3F3F46" }}>{msg.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions (show when no messages beyond the initial) */}
      {messages.length <= 1 && (
        <div className="px-3 py-2 border-t flex gap-1.5 flex-wrap" style={{ borderColor: "var(--border)" }}>
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => sendMessage(qa.prompt)}
              className="text-[10px] px-2.5 py-1.5 rounded-md font-medium transition-colors"
              style={{
                background: "rgba(139, 92, 246, 0.06)",
                border: "1px solid rgba(139, 92, 246, 0.15)",
                color: "#A78BFA",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.12)";
                e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.06)";
                e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.15)";
              }}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2.5 border-t shrink-0" style={{ borderColor: "var(--border)", background: "rgba(17,17,17,0.6)" }}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Sentinel anything..."
            disabled={isThinking}
            className="flex-1 px-3 py-2.5 rounded-lg text-xs font-mono focus:outline-none transition-all disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: "#E4E4E7",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.4)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.2)")}
          />
          <button
            onClick={handleSend}
            disabled={isThinking || !input.trim()}
            className="px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
            style={{ background: "#8B5CF6", color: "#FFF" }}
          >
            {isThinking ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
