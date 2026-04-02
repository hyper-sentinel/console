"use client";
import { useState, useEffect } from "react";

interface DiscordMessage {
  id: string;
  author: string;
  avatar: string;
  content: string;
  time: string;
  channel: string;
}

const MOCK_GUILDS = [
  { id: "sentinel", name: "Sentinel Trading", icon: "S" },
  { id: "hl", name: "Hyperliquid", icon: "H" },
  { id: "aster", name: "Aster DEX", icon: "A" },
];

const MOCK_CHANNELS_MAP: Record<string, { id: string; name: string }[]> = {
  sentinel: [
    { id: "general", name: "# general" },
    { id: "alpha", name: "# alpha-calls" },
    { id: "bot-alerts", name: "# bot-alerts" },
  ],
  hl: [
    { id: "trading", name: "# trading" },
    { id: "announcements", name: "# announcements" },
  ],
  aster: [
    { id: "defi", name: "# defi-chat" },
    { id: "updates", name: "# updates" },
  ],
};

const MOCK_MESSAGES: DiscordMessage[] = [
  { id: "1", author: "SentinelBot", avatar: "S", content: "Alert: BTC/USDT 4H Golden Cross detected. SMA(20) crossed above SMA(50).", time: "11:41 PM", channel: "bot-alerts" },
  { id: "2", author: "CryptoMax", avatar: "C", content: "Just entered a long on SOL at $178. Target $195, SL at $172. 5x leverage.", time: "11:38 PM", channel: "alpha" },
  { id: "3", author: "DeFiDegen", avatar: "D", content: "New yield farm on Aster paying 45% APY on ETH/USDC. Seems legit, LP locked for 6 months.", time: "11:35 PM", channel: "general" },
  { id: "4", author: "WhaleWatch", avatar: "W", content: "Large HL position opened: 500 BTC LONG at $87,200. Builder: 0x1a2b...", time: "11:30 PM", channel: "bot-alerts" },
  { id: "5", author: "SentinelBot", avatar: "S", content: "RSI(14) on ETH/USDT dropped below 30. Oversold signal on 1H chart.", time: "11:28 PM", channel: "bot-alerts" },
];

export default function DiscordPane() {
  const [guild, setGuild] = useState("sentinel");
  const [channel, setChannel] = useState("general");
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [input, setInput] = useState("");

  const channels = MOCK_CHANNELS_MAP[guild] || [];

  useEffect(() => {
    setMessages(MOCK_MESSAGES.filter((m) => m.channel === channel));
    if (!channels.find((c) => c.id === channel)) {
      setChannel(channels[0]?.id || "general");
    }
  }, [channel, guild, channels]);

  return (
    <div className="flex h-full">
      {/* Channel sidebar */}
      <div className="w-[120px] shrink-0 border-r flex flex-col" style={{ borderColor: "var(--border)", background: "rgba(15,15,15,0.5)" }}>
        {/* Guild selector */}
        <div className="flex gap-1 p-1.5 border-b" style={{ borderColor: "var(--border)" }}>
          {MOCK_GUILDS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGuild(g.id)}
              className="text-base p-1 rounded"
              title={g.name}
              style={{
                background: guild === g.id ? "var(--bg-hover)" : "transparent",
                border: guild === g.id ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              {g.icon}
            </button>
          ))}
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-auto py-1">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className="w-full text-left px-2 py-1 text-[10px] transition-colors"
              style={{
                color: channel === ch.id ? "var(--text-primary)" : "var(--text-dim)",
                background: channel === ch.id ? "var(--bg-hover)" : "transparent",
                fontWeight: channel === ch.id ? 600 : 400,
              }}
            >
              {ch.name}
            </button>
          ))}
        </div>

        {/* Voice status */}
        <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-1">
            <span className="status-dot online"></span>
            <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>Voice: 3 online</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto px-3 py-2 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <div className="text-lg shrink-0 mt-0.5">{msg.avatar}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold" style={{ color: "var(--accent-purple)" }}>{msg.author}</span>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>{msg.time}</span>
                </div>
                <p className="text-[11px] leading-relaxed break-words" style={{ color: "var(--text-secondary)" }}>{msg.content}</p>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-[10px] py-8" style={{ color: "var(--text-dim)" }}>No messages in this channel</div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-1 px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channel}...`}
            className="flex-1 text-[10px] px-2 py-1.5 rounded"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button className="text-[10px] px-3 rounded font-semibold" style={{ background: "var(--accent-purple)", color: "#fff" }}>Send</button>
        </div>
      </div>
    </div>
  );
}
