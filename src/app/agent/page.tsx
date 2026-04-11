"use client";
import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import AppLayout from "@/components/AppLayout";
import AuthGuard from "@/components/AuthGuard";
import { useAuth, PROVIDER_INFO } from "@/lib/auth";
import { api } from "@/lib/api";
import { Bot, Hexagon, Users, BarChart3, Briefcase, Newspaper, Landmark } from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tools?: ToolCall[];
  timestamp: string;
  agentLabel?: string;
  agentColor?: string;
}

interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: string;
  status: "pending" | "running" | "done" | "error";
}

// ── Safe inline markdown renderer ────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "#fff" }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: "rgba(0,229,255,0.08)", color: "#00E5FF" }}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// ── Agent System Prompts (ported from Python team.py + swarm.py) ──

const AGENT_PROMPTS = {
  solo: `You are Sentinel, an autonomous AI trading agent with 62+ tools. Be concise and professional. Use tools to fetch real data — never fabricate prices. Format numbers clearly: $87,421.32 not 87421.32.`,

  analyst: `You are the Analyst on the Sentinel trading team. You research markets and provide data-driven analysis.

CAPABILITIES:
- Real-time crypto prices (CoinGecko — 10,000+ coins)
- Stock data (YFinance — full quant analysis)
- Economic data (FRED — GDP, CPI, rates, VIX)
- Social intelligence (X/Twitter, Elfa AI, Y2 news)
- DexScreener (on-chain analytics)
- Technical analysis (SMA, EMA, RSI, MACD, Bollinger Bands)

RULES:
- Fetch REAL data using tools. Never fabricate prices.
- Be quantitative — cite specific numbers, percentages, changes
- Flag unusual moves (>5% daily on BTC/ETH/SOL)
- Track macro conditions (CPI, rates, VIX) for regime shifts
- You do NOT execute trades. You provide analysis.
- Format numbers clearly: $87,421.32 not 87421.32`,

  risk_manager: `You are the Risk Manager on the Sentinel trading team. You protect capital.

CAPABILITIES:
- Monitor positions across Hyperliquid, Aster DEX, and Polymarket
- Account equity, margin, and leverage analysis
- Cross-venue portfolio risk assessment

RISK RULES:
- Max 2% of equity risked per trade
- Max 10x leverage on any single position
- Flag positions > 20% of equity
- Alert when unrealized drawdown > 10% of equity
- Max 5 trades per day, max $500 per trade, max $1000 daily loss

You APPROVE or REJECT trade proposals. Calculate position sizes. Be conservative. Always provide specific numbers.
You do NOT execute trades — flag concerns for the Trader.`,

  trader: `You are the Trader on the Sentinel trading team. You execute trades precisely.

VENUES:
- Hyperliquid — perp futures (crypto + TradFi: GOLD, TSLA, SP500)
- Aster DEX — altcoin futures with leverage
- Polymarket — prediction markets

RULES:
- ALWAYS confirm with user before executing any trade
- Show exact order details BEFORE executing: venue, direction, size, price
- After execution, report fill price, fees, and order ID
- Check orderbook depth before execution to estimate slippage
- You do NOT analyze markets. Defer analysis to the Analyst.
- You do NOT manage risk. Defer sizing to the Risk Manager.`,

  captain: `You are the Captain of the Sentinel trading swarm — an institutional-grade AI trading team.

YOUR TEAM:
- Analyst — crypto prices, stock data, macro (FRED), news sentiment, social intelligence, technical analysis
- Risk Manager — position monitoring, sizing, guardrails, portfolio risk
- Trader — execution on Hyperliquid, Aster DEX, Polymarket

ROUTING:
When analyzing a request, think about which specialist perspective is most relevant:
1. Price/research/news/sentiment/analysis questions → think as the Analyst
2. Risk/sizing/portfolio/exposure questions → think as the Risk Manager
3. Trade execution/orders → think as the Trader
4. Complex queries → combine multiple perspectives in your response

RULES:
- Be quantitative — cite numbers, percentages, exact values
- NEVER auto-execute trades — always confirm with user first
- Label which specialist perspective you're using in your response
- Use tools to get real data — never fabricate`,
};

const AGENT_META: Record<string, { label: string; color: string }> = {
  analyst: { label: "Analyst", color: "#00E5FF" },
  risk_manager: { label: "Risk Manager", color: "#FBBF24" },
  trader: { label: "Trader", color: "#00FF88" },
  captain: { label: "Captain", color: "#8B5CF6" },
};

// ── Gateway helpers ──────────────────────────────────────────

const GATEWAY_PROVIDER: Record<string, string> = {
  gemini: "google", claude: "anthropic", gpt: "openai", grok: "xai",
};
const DEFAULT_MODELS: Record<string, string> = {
  google: "gemini-2.0-flash", anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o", xai: "grok-2",
};

function getProviderConfig() {
  const frontendProvider = typeof window !== "undefined" ? localStorage.getItem("sentinel_provider") || "" : "";
  const aiKey = frontendProvider ? localStorage.getItem(`sentinel_${frontendProvider}_key`) : null;
  const gatewayProvider = GATEWAY_PROVIDER[frontendProvider] || frontendProvider;
  const model = DEFAULT_MODELS[gatewayProvider] || "";
  return { aiKey, gatewayProvider, model };
}

async function llmCall(
  systemPrompt: string,
  userMessage: string,
  history: { role: string; content: string }[],
  onToken: (text: string) => void
): Promise<string> {
  const { aiKey, gatewayProvider, model } = getProviderConfig();
  if (!aiKey) throw new Error("No AI key configured.");

  const headers = api.getHeaders();
  headers["X-AI-Key"] = aiKey;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  const canStream = ["anthropic", "openai", "xai"].includes(gatewayProvider);

  const res = await fetch(`${api.getBaseUrl()}/api/v1/llm/chat?stream=${canStream}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, ai_key: aiKey, provider: gatewayProvider, model }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || err.detail || `HTTP ${res.status}`);
  }

  let content = "";

  if (canStream && res.body) {
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
            content += token;
            onToken(content);
          }
        } catch { /* skip */ }
      }
    }
  } else {
    const data = await res.json();
    if (gatewayProvider === "google") content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    else if (gatewayProvider === "anthropic") content = data?.content?.[0]?.text || "";
    else content = data?.choices?.[0]?.message?.content || "";
    if (!content) content = data?.text || data?.content || data?.message || "";
  }

  return content || "No response received.";
}

// ── Component ────────────────────────────────────────────────

export default function AgentPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Sentinel online. 62+ tools armed. Solo mode active. Switch to Team or Swarm for multi-agent coordination.",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    },
  ]);
  const [input, setInput] = useState("");
  const [agentMode, setAgentMode] = useState<"solo" | "swarm" | "team">("solo");
  const [isThinking, setIsThinking] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const providerName = user?.provider ? PROVIDER_INFO[user.provider]?.name : "AI";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ts = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isThinking) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: input, timestamp: ts() };
    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput("");
    setIsThinking(true);

    const history = messages.filter(m => m.role !== "system").slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      if (agentMode === "team") {
        // Team: sequential pipeline Analyst → Risk Manager → Trader
        const agents = [
          { key: "analyst", prompt: AGENT_PROMPTS.analyst },
          { key: "risk_manager", prompt: AGENT_PROMPTS.risk_manager },
          { key: "trader", prompt: AGENT_PROMPTS.trader },
        ];
        let contextAccumulated = "";

        for (const agent of agents) {
          const meta = AGENT_META[agent.key];
          setActiveAgent(meta.label);
          const id = `${agent.key}-${Date.now()}`;
          setMessages(prev => [...prev, { id, role: "assistant", content: "", timestamp: ts(), agentLabel: meta.label, agentColor: meta.color }]);

          const prompt = contextAccumulated
            ? `Previous analysis:\n${contextAccumulated}\n\nUser request: ${userInput}`
            : userInput;

          const content = await llmCall(agent.prompt, prompt, history, (text) => {
            setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: text }; return u; });
          });

          setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content }; return u; });
          contextAccumulated += `\n\n[${meta.label}]: ${content}`;
        }
      } else if (agentMode === "swarm") {
        // Swarm: Captain with multi-perspective routing
        const meta = AGENT_META.captain;
        setActiveAgent(meta.label);
        const id = `swarm-${Date.now()}`;
        setMessages(prev => [...prev, { id, role: "assistant", content: "", timestamp: ts(), agentLabel: meta.label, agentColor: meta.color }]);

        const content = await llmCall(AGENT_PROMPTS.captain, userInput, history, (text) => {
          setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: text }; return u; });
        });
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content }; return u; });
      } else {
        // Solo: single agent
        const id = `solo-${Date.now()}`;
        setMessages(prev => [...prev, { id, role: "assistant", content: "", timestamp: ts() }]);

        const content = await llmCall(AGENT_PROMPTS.solo, userInput, history, (text) => {
          setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: text }; return u; });
        });
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content }; return u; });
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Request failed";
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: `Error: ${errMsg}`, timestamp: ts() }]);
    }

    setIsThinking(false);
    setActiveAgent(null);
    inputRef.current?.focus();
  }, [input, isThinking, agentMode, messages]);

  const quickActions = [
    { label: "BTC Price", msg: "What's the current Bitcoin price?", icon: BarChart3 },
    { label: "Positions", msg: "Show my open positions across all venues", icon: Briefcase },
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

        {/* Mode Description */}
        <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
          {agentMode === "solo" && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--accent-green)" }}>Solo Mode</strong> — Single agent with all 62+ tools. Best for quick queries.
            </p>
          )}
          {agentMode === "swarm" && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "#8B5CF6" }}>Swarm Mode</strong> — Captain agent routes your request through Analyst, Risk Manager, and Trader perspectives.
            </p>
          )}
          {agentMode === "team" && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--accent-cyan)" }}>Team Mode</strong> — Sequential pipeline: <span style={{ color: "#00E5FF" }}>Analyst</span> analyzes → <span style={{ color: "#FBBF24" }}>Risk Manager</span> assesses → <span style={{ color: "#00FF88" }}>Trader</span> recommends. Each builds on the previous.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          {quickActions.map(qa => (
            <button key={qa.label} onClick={() => setInput(qa.msg)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              <qa.icon size={12} /> {qa.label}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`chat-bubble ${msg.role}`}>
                {msg.agentLabel && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: msg.agentColor || "#00FF88" }} />
                    <span className="text-[10px] font-bold tracking-wide" style={{ color: msg.agentColor || "#00FF88" }}>
                      {msg.agentLabel.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">
                  {msg.content ? msg.content.split("\n").map((line, i) => (
                    <p key={i} className="text-sm">{renderInline(line)}</p>
                  )) : null}
                </div>
                {msg.tools && msg.tools.length > 0 && (
                  <div className="mt-3 p-2 rounded" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-mono mb-1" style={{ color: "var(--accent-cyan)" }}>Tools Used:</p>
                    {msg.tools.map((tool, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono py-0.5">
                        <span style={{ color: tool.status === "done" ? "var(--accent-green)" : tool.status === "error" ? "var(--accent-red)" : "var(--accent-yellow)" }}>
                          {tool.status === "done" ? "[ok]" : tool.status === "error" ? "[err]" : "[...]"}
                        </span>
                        <span style={{ color: "var(--text-dim)" }}>{tool.name}</span>
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
                    <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: activeAgent ? (AGENT_META[Object.keys(AGENT_META).find(k => AGENT_META[k].label === activeAgent) || ""]?.color || "var(--accent-green)") : "var(--accent-green)" }} />
                    <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.4s" }} />
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {activeAgent ? `${activeAgent} is analyzing...` : "Sentinel is thinking..."}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <input ref={inputRef} type="text"
            placeholder={agentMode === "team" ? "Ask the team..." : agentMode === "swarm" ? "Ask the swarm..." : "Ask Sentinel anything..."}
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="input-field flex-1" disabled={isThinking}
          />
          <button className="btn-primary !px-8" onClick={sendMessage} disabled={!input.trim() || isThinking}>
            {isThinking ? "..." : "Send"}
          </button>
        </div>
      </div>
    </AppLayout>
    </AuthGuard>
  );
}
