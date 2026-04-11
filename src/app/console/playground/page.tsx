"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

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

    const assistantMsg: Message = { role: "assistant", content: "", timestamp: new Date() };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("sentinel_provider") || "" : "";
      const aiKey = typeof window !== "undefined" ? (provider ? localStorage.getItem(`sentinel_${provider}_key`) : localStorage.getItem("sentinel_ai_key")) || "" : "";
      const res = await fetch(`${api.getBaseUrl()}/api/v1/llm/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...api.getHeaders(),
          ...(aiKey ? { "X-AI-Key": aiKey } : {}),
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          provider,
          ai_key: aiKey,
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content || parsed.content || parsed.text || "";
                fullContent += token;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                  return updated;
                });
              } catch { /* skip malformed */ }
            }
          }
        }
      } else {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || data.content || data.response || JSON.stringify(data);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content };
          return updated;
        });
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
              Ask about crypto prices, place trades, get market intel, or use any of 62+ tools. Your AI key is forwarded to your chosen provider.
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
