"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import AuthGuard from "@/components/AuthGuard";
import { useAuth, PROVIDER_INFO } from "@/lib/auth";
import { api } from "@/lib/api";
import { Bot, Hexagon, Users, BarChart3, Briefcase, Newspaper, Landmark } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tools?: ToolCall[];
  timestamp: string;
  isStreaming?: boolean;
}

interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: string;
  status: "pending" | "running" | "done" | "error";
}

export default function AgentPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Good morning. I'm Sentinel, your autonomous trading agent. I have 62+ tools at my disposal — market data, trading, sentiment analysis, Telegram, Discord, and more. What would you like to do?",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    },
  ]);
  const [input, setInput] = useState("");
  const [agentMode, setAgentMode] = useState<"solo" | "swarm" | "team">("solo");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const providerName = user?.provider ? PROVIDER_INFO[user.provider]?.name : "AI";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isThinking) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
    
    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput("");
    setIsThinking(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter(m => m.role !== "system")
        .slice(-10) // Last 10 messages for context
        .map(m => ({ role: m.role, content: m.content }));

      // Call the real LLM through the API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.call("chat", {
        message: userInput,
        mode: agentMode,
        history: history,
      }) as any;

      const toolCalls: ToolCall[] = [];
      
      // Extract tool calls from the response if present
      if (response?.tool_calls && Array.isArray(response.tool_calls)) {
        for (const tc of response.tool_calls) {
          toolCalls.push({
            name: tc.name || tc.tool || "unknown",
            args: tc.args || tc.arguments,
            result: tc.result ? String(tc.result) : undefined,
            status: "done",
          });
        }
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response?.response || response?.message || response?.content || 
                 (typeof response === "string" ? response : "I processed your request. Let me know if you need anything else."),
        tools: toolCalls.length > 0 ? toolCalls : undefined,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: unknown) {
      // Fallback to individual tool calls for specific requests
      const aiMsg = await handleDirectToolCall(userInput);
      setMessages(prev => [...prev, aiMsg]);
    }

    setIsThinking(false);
    inputRef.current?.focus();
  }, [input, isThinking, agentMode, messages]);

  // Handle direct tool calls for specific user requests
  const handleDirectToolCall = async (userInput: string): Promise<Message> => {
    const lower = userInput.toLowerCase();
    const tools: ToolCall[] = [];
    let content = "";

    try {
      if (lower.includes("btc") || lower.includes("bitcoin")) {
        tools.push({ name: "get_crypto_price", args: { coin_id: "bitcoin" }, status: "running" });
        const result = await api.getCryptoPrice("bitcoin") as any;
        tools[0].status = "done";
        tools[0].result = JSON.stringify(result);
        const price = result?.current_price || result?.price;
        const change = result?.price_change_pct_24h || result?.change_24h;
        content = `**Bitcoin (BTC)**\n- Price: $${price?.toLocaleString() || "N/A"}\n- 24h Change: ${change ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "N/A"}\n- Market Cap: $${result?.market_cap ? (result.market_cap / 1e9).toFixed(1) + "B" : "N/A"}`;
      } else if (lower.includes("eth") || lower.includes("ethereum")) {
        tools.push({ name: "get_crypto_price", args: { coin_id: "ethereum" }, status: "running" });
        const result = await api.getCryptoPrice("ethereum") as any;
        tools[0].status = "done";
        tools[0].result = JSON.stringify(result);
        const price = result?.current_price || result?.price;
        const change = result?.price_change_pct_24h || result?.change_24h;
        content = `**Ethereum (ETH)**\n- Price: $${price?.toLocaleString() || "N/A"}\n- 24h Change: ${change ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "N/A"}`;
      } else if (lower.includes("sol") || lower.includes("solana")) {
        tools.push({ name: "get_crypto_price", args: { coin_id: "solana" }, status: "running" });
        const result = await api.getCryptoPrice("solana") as any;
        tools[0].status = "done";
        tools[0].result = JSON.stringify(result);
        const price = result?.current_price || result?.price;
        content = `**Solana (SOL)**: $${price?.toLocaleString() || "N/A"}`;
      } else if (lower.includes("position")) {
        tools.push({ name: "get_hl_positions", status: "running" });
        const result = await api.getHLPositions();
        tools[0].status = "done";
        const positions = Array.isArray(result) ? result : [];
        content = positions.length > 0 
          ? `**Open Positions (${positions.length}):**\n` + positions.map((p: Record<string, unknown>) => `- ${p.coin || p.symbol}: ${p.szi || p.size} @ $${p.entryPx || p.entry_price}`).join("\n")
          : "No open positions on Hyperliquid.";
      } else if (lower.includes("news") || lower.includes("sentiment")) {
        tools.push({ name: "get_news_recap", status: "running" });
        const result = await api.call("get_news_recap") as any;
        tools[0].status = "done";
        content = result?.recap || result?.summary || "Here's the latest market intelligence.";
      } else if (lower.includes("macro") || lower.includes("economy")) {
        tools.push({ name: "get_economic_dashboard", status: "running" });
        const result = await api.call("get_economic_dashboard") as any;
        tools[0].status = "done";
        content = typeof result === "object" ? `**Macro Dashboard:**\n${JSON.stringify(result, null, 2)}` : "Macro data retrieved.";
      } else {
        content = "I can help with:\n- **Prices**: \"What's BTC price?\"\n- **Positions**: \"Show my positions\"\n- **News**: \"Get the latest crypto news\"\n- **Macro**: \"Show economic dashboard\"\n- **Trading**: \"Place a market order on BTC\" (Pro)\n\nTry asking me something specific!";
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (tools.length > 0) tools[tools.length - 1].status = "error";
      content = `[Error] Tool execution failed: ${errorMsg}\n\nThe backend might not have this endpoint available, or you may need to authenticate first.`;
    }

    return {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content,
      tools: tools.length > 0 ? tools : undefined,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  };

  // Quick action buttons
  const quickActions = [
    { label: "BTC Price", msg: "What's the current Bitcoin price?", icon: BarChart3 },
    { label: "Positions", msg: "Show my open positions", icon: Briefcase },
    { label: "News", msg: "Get the latest crypto news recap", icon: Newspaper },
    { label: "Macro", msg: "Show the economic dashboard", icon: Landmark },
  ];

  return (
    <AuthGuard>
    <AppLayout>
      <div className="animate-fade-in flex flex-col h-full" style={{ height: "calc(100vh - 56px - 48px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">AI Agent</h1>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              Chat with Sentinel · 62+ tools · Powered by {providerName}
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
            {(["solo", "swarm", "team"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setAgentMode(mode)}
                className="px-4 py-2 rounded-md text-xs font-bold transition"
                style={{
                  background: agentMode === mode ? "var(--accent-green)" : "transparent",
                  color: agentMode === mode ? "#000" : "var(--text-dim)",
                }}
              >
                {mode === "solo" && <><Bot size={14} className="inline mr-1" /> Solo</>}
                {mode === "swarm" && <><Hexagon size={14} className="inline mr-1" /> Swarm</>}
                {mode === "team" && <><Users size={14} className="inline mr-1" /> Team</>}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Mode Description */}
        <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
          {agentMode === "solo" && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--accent-green)" }}>Solo Mode</strong> — Single MarketAgent with all 62+ tools directly. Best for quick queries and simple tasks.
            </p>
          )}
          {agentMode === "swarm" && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--accent-cyan)" }}>Swarm Mode</strong> — 5 Agno agents: Captain routes to Analyst, Trader, Risk Manager, and Ops specialists.
              <span className="tier-badge paid ml-2">PRO</span>
            </p>
          )}
          {agentMode === "team" && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--accent-purple)" }}>Team Mode</strong> — 3 Upsonic agents in coordinate mode with shared memory. Analyst → RiskManager → Trader pipeline.
              <span className="tier-badge paid ml-2">PRO</span>
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          {quickActions.map(qa => (
            <button
              key={qa.label}
              onClick={() => { setInput(qa.msg); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <qa.icon size={12} />
              {qa.label}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`chat-bubble ${msg.role}`}>
                {/* Render content with basic markdown */}
                <div className="whitespace-pre-wrap">
                  {msg.content.split("\n").map((line, i) => {
                    // Bold text
                    const boldProcessed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return <p key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: boldProcessed }} />;
                  })}
                </div>

                {/* Tool Calls */}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="mt-3 p-2 rounded" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-mono mb-1" style={{ color: "var(--accent-cyan)" }}>Tools Used:</p>
                    {msg.tools.map((tool, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono py-0.5">
                        <span style={{ color: tool.status === "done" ? "var(--accent-green)" : tool.status === "error" ? "var(--accent-red)" : "var(--accent-yellow)" }}>
                          {tool.status === "done" ? "✓" : tool.status === "error" ? "✗" : "⟳"}
                        </span>
                        <span style={{ color: "var(--text-dim)" }}>
                          {tool.name}({tool.args ? Object.entries(tool.args).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ") : ""})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] mt-2" style={{ color: "var(--text-dim)" }}>{msg.timestamp}</p>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="chat-bubble assistant">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)" }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.4s" }}></div>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>Sentinel is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder={`Ask Sentinel anything... (powered by ${providerName})`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="input-field flex-1"
            disabled={isThinking}
          />
          <button 
            className="btn-primary !px-8" 
            onClick={sendMessage} 
            disabled={!input.trim() || isThinking}
          >
            {isThinking ? "..." : "Send"}
          </button>
        </div>
      </div>
    </AppLayout>
    </AuthGuard>
  );
}
