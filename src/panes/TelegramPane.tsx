"use client";
import { useState, useEffect } from "react";

interface TGMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  channel: string;
}

const MOCK_CHANNELS = [
  { id: "alpha_calls", name: "Alpha Calls" },
  { id: "macro_room", name: "Macro Room" },
  { id: "degen_chat", name: "Degen Chat" },
  { id: "whale_alerts", name: "Whale Alerts" },
];

const MOCK_MESSAGES: TGMessage[] = [
  { id: "1", sender: "CryptoWhale", text: "BTC breaking out of the wedge, watching 88k closely. If we hold above, 92k target.", time: "23:41", channel: "alpha_calls" },
  { id: "2", sender: "AlphaHunter", text: "New Solana memecoin $BONK2 just launched. 500k mc, LP locked. Degen play.", time: "23:38", channel: "degen_chat" },
  { id: "3", sender: "MacroTrader", text: "Fed meeting next week. CPI came in at 3.1% — expecting hawkish hold.", time: "23:35", channel: "macro_room" },
  { id: "4", sender: "OnchainAlert", text: "🐋 Whale moved 5,000 ETH ($16M) to Binance. Potential sell pressure incoming.", time: "23:32", channel: "whale_alerts" },
  { id: "5", sender: "CryptoWhale", text: "ETH/BTC ratio at multi-year lows. Accumulation zone for ETH maxis.", time: "23:30", channel: "alpha_calls" },
  { id: "6", sender: "TechAlpha", text: "SOL TVL just hit new ATH at $12.8B. Ecosystem is cooking.", time: "23:28", channel: "alpha_calls" },
  { id: "7", sender: "DegenKing", text: "DOGE looking ready for another pump. Elon tweeted a dog emoji 🐶", time: "23:25", channel: "degen_chat" },
  { id: "8", sender: "MacroTrader", text: "VIX at 14.2, extremely low. Risk-on environment for crypto.", time: "23:22", channel: "macro_room" },
];

export default function TelegramPane() {
  const [channel, setChannel] = useState("alpha_calls");
  const [messages, setMessages] = useState<TGMessage[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMessages(MOCK_MESSAGES.filter((m) => m.channel === channel));
  }, [channel]);

  const filtered = search
    ? messages.filter((m) => m.text.toLowerCase().includes(search.toLowerCase()) || m.sender.toLowerCase().includes(search.toLowerCase()))
    : messages;

  return (
    <div className="flex flex-col h-full">
      {/* Channel selector */}
      <div className="flex gap-1 px-3 py-1.5 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {MOCK_CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch.id)}
            className="text-[10px] px-2 py-1 rounded whitespace-nowrap"
            style={{
              background: channel === ch.id ? "rgba(0,136,255,0.1)" : "transparent",
              color: channel === ch.id ? "var(--accent-cyan)" : "var(--text-dim)",
              border: channel === ch.id ? "1px solid rgba(0,136,255,0.3)" : "1px solid transparent",
            }}
          >
            {ch.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-1 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search messages..."
          className="w-full text-[10px] px-2 py-1 rounded"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
        {filtered.map((msg) => (
          <div key={msg.id} className="group">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-semibold" style={{ color: "var(--accent-cyan)" }}>{msg.sender}</span>
              <span className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>{msg.time}</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{msg.text}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-[10px] py-8" style={{ color: "var(--text-dim)" }}>
            No messages found
          </div>
        )}
      </div>

      {/* Input (Pro) */}
      <div className="flex gap-1 px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send message (Pro)..."
          className="flex-1 text-[10px] px-2 py-1.5 rounded"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button
          className="text-[10px] px-3 rounded font-semibold"
          style={{ background: "var(--accent-cyan)", color: "#000" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
