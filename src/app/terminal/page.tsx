"use client";
import { useState, useEffect } from "react";

// Simulated live pair data — will connect to DexScreener API
const MOCK_PAIRS = [
  { name: "CHILLHOUSE", chain: "SOL", price: "$0.0033", mcap: "$3.3M", change: "+142%", time: "2m", ca: "GkyP...pump", color: "#00ff88" },
  { name: "ENERGY", chain: "SOL", price: "$0.0012", mcap: "$1.2M", change: "+89%", time: "5m", ca: "0xra...yze3", color: "#00ff88" },
  { name: "BISON", chain: "SOL", price: "$0.0045", mcap: "$4.5M", change: "-9%", time: "12m", ca: "real...325", color: "#ff4444" },
  { name: "CRIM", chain: "SOL", price: "$0.0525", mcap: "$525K", change: "+4.27%", time: "9m", ca: "Kb6R...Mtbw", color: "#00ff88" },
];

const NAV_ITEMS = [
  { icon: "", label: "Markets", id: "markets" },
  { icon: "", label: "Trending", id: "trending" },
  { icon: "", label: "Portfolio", id: "portfolio" },
  { icon: "", label: "Trading", id: "trading" },
  { icon: "", label: "Polymarket", id: "polymarket" },
  { icon: "", label: "Trenches", id: "trenches" },
  { icon: "", label: "AI Agent", id: "agent" },
  { icon: "", label: "Chat", id: "chat" },
];

const BOTTOM_TABS = [
  "Trades", "Positions", "Orders", "Holders", "Top Traders", "Dev Tokens"
];

export default function TerminalPage() {
  const [activeNav, setActiveNav] = useState("trading");
  const [activeTab, setActiveTab] = useState("Trades");
  const [chain, setChain] = useState("SOL");
  const [pasteCA, setPasteCA] = useState("");
  const [buyAmount, setBuyAmount] = useState("0.5");

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* ── Top Bar ── */}
      <div className="h-12 flex items-center px-4 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-cyan))" }}>
            <span className="text-black font-bold text-xs">S</span>
          </div>
          <span className="font-bold text-sm tracking-tight">SENTINEL</span>
        </div>

        {/* Chain Selector */}
        <div className="flex items-center gap-1 ml-6">
          {["SOL", "ETH", "HL", "ASTER"].map(c => (
            <button
              key={c}
              onClick={() => setChain(c)}
              className="px-3 py-1 rounded text-xs font-mono font-bold transition"
              style={{
                background: chain === c ? "var(--accent-green)" : "transparent",
                color: chain === c ? "#000" : "var(--text-dim)",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Paste CA */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="🔍 Search by name or paste CA..."
              value={pasteCA}
              onChange={(e) => setPasteCA(e.target.value)}
              className="w-full h-8 px-4 rounded-lg text-xs font-mono outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            {pasteCA && (
              <button
                className="absolute right-2 top-1 px-2 py-1 rounded text-xs font-bold"
                style={{ background: "var(--accent-green)", color: "#000" }}
                onClick={() => alert(`Swapping ${pasteCA} on ${chain}...`)}
              >
                Swap
              </button>
            )}
          </div>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>0x4047...4aA27</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
            <span className="text-xs">👛</span>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Nav */}
        <div className="w-14 flex flex-col items-center py-3 gap-1 border-r" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition text-lg"
              title={item.label}
              style={{
                background: activeNav === item.id ? "var(--bg-panel)" : "transparent",
                borderLeft: activeNav === item.id ? "2px solid var(--accent-green)" : "2px solid transparent",
              }}
            >
              {item.icon}
            </button>
          ))}
        </div>

        {/* Center — Chart + Trade Feed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Token Header */}
          <div className="h-10 flex items-center px-4 gap-4 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
            <span className="font-bold text-sm">CRIM/SOL</span>
            <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-green)" }}>$0.0525</span>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>MCap: $525K</span>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>Liq: $2.19K</span>
            <span className="text-xs" style={{ color: "var(--accent-green)" }}>+4.27%</span>
          </div>

          {/* Chart Area */}
          <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
            <div className="text-center">
              <div className="text-2xl mb-4 font-mono font-bold" style={{ color: "var(--text-dim)", opacity: 0.3 }}>CHART</div>
              <p className="text-sm font-mono" style={{ color: "var(--text-dim)" }}>TradingView Chart</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>Lightweight Charts will render here</p>
              <p className="text-xs mt-1 font-mono" style={{ color: "var(--accent-green)" }}>Phase 2 — integrate @tradingview/lightweight-charts</p>
            </div>
          </div>

          {/* Bottom Tabs — Trades/Positions/Orders */}
          <div className="border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-0 h-9 px-2" style={{ background: "var(--bg-secondary)" }}>
              {BOTTOM_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 h-full text-xs font-medium transition"
                  style={{
                    color: activeTab === tab ? "var(--text-primary)" : "var(--text-dim)",
                    borderBottom: activeTab === tab ? "2px solid var(--accent-green)" : "2px solid transparent",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Trade Feed */}
            <div className="h-40 overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: "var(--text-dim)" }}>
                    <th className="text-left px-4 py-2 font-medium">Age</th>
                    <th className="text-left py-2 font-medium">Side</th>
                    <th className="text-right py-2 font-medium">MCap</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                    <th className="text-right py-2 font-medium">Total USD</th>
                    <th className="text-right py-2 font-medium">Total SOL</th>
                    <th className="text-right px-4 py-2 font-medium">Maker</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { age: "3s", side: "Sell", mcap: "525.1K", amount: "1.12K", usd: "0.59", sol: "0.0067", color: "#ff4444" },
                    { age: "8s", side: "Buy", mcap: "520.5K", amount: "29.31K", usd: "15.28", sol: "0.1735", color: "#00ff88" },
                    { age: "13s", side: "Sell", mcap: "511.7K", amount: "483.8", usd: "0.24", sol: "0.0027", color: "#ff4444" },
                    { age: "18s", side: "Buy", mcap: "509.5K", amount: "18.65K", usd: "9.50", sol: "0.1081", color: "#00ff88" },
                    { age: "23s", side: "Sell", mcap: "503.6K", amount: "1.41K", usd: "0.71", sol: "0.0081", color: "#ff4444" },
                    { age: "28s", side: "Buy", mcap: "504.2K", amount: "1.21K", usd: "0.61", sol: "0.0069", color: "#00ff88" },
                  ].map((t, i) => (
                    <tr key={i} className="hover:opacity-80 transition" style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-1.5 font-mono" style={{ color: "var(--text-dim)" }}>{t.age}</td>
                      <td className="py-1.5 font-bold" style={{ color: t.color }}>{t.side}</td>
                      <td className="text-right py-1.5 font-mono" style={{ color: "var(--text-secondary)" }}>{t.mcap}</td>
                      <td className="text-right py-1.5 font-mono" style={{ color: "var(--text-secondary)" }}>{t.amount}</td>
                      <td className="text-right py-1.5 font-mono" style={{ color: t.color }}>{t.usd}</td>
                      <td className="text-right py-1.5 font-mono" style={{ color: t.color }}>{t.sol}</td>
                      <td className="text-right px-4 py-1.5 font-mono" style={{ color: "var(--text-dim)" }}>4QUa...ups</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Panel — Order + Token Info */}
        <div className="w-72 border-l flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          {/* Order Panel */}
          <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>Solana Wallet</span>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>0.020 ▼</span>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="flex gap-1 mb-3">
              <button className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--accent-green)", color: "#000" }}>Buy</button>
              <button className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--bg-panel)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Sell</button>
              <button className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--bg-panel)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Market</button>
            </div>

            {/* Amount Input */}
            <div className="mb-3">
              <div className="flex items-center gap-1 p-2 rounded-lg" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>Total</span>
                <input
                  type="text"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="flex-1 bg-transparent text-right text-sm font-mono outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>SOL</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-1 mb-3">
              {["0.1", "0.2", "0.5", "1", "☆"].map(amt => (
                <button
                  key={amt}
                  onClick={() => amt !== "☆" && setBuyAmount(amt)}
                  className="flex-1 py-1.5 rounded text-xs font-mono font-bold"
                  style={{ background: "var(--bg-panel)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Execute Button */}
            <button className="w-full py-3 rounded-lg text-sm font-bold" style={{ background: "var(--accent-green)", color: "#000" }}>
              Buy CRIM
            </button>
          </div>

          {/* Token Data */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text-dim)" }}>Token Data & Security</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Top 10 H", value: "0%", ok: true },
                { label: "Dev holding", value: "0%", ok: true },
                { label: "Snipers", value: "0%", ok: true },
                { label: "Insiders", value: "0%", ok: true },
                { label: "Bundles", value: "0%", ok: true },
                { label: "Fresh buys", value: "1", ok: false },
                { label: "Mint Auth", value: "No", ok: true },
                { label: "Freeze Auth", value: "No", ok: true },
              ].map((t, i) => (
                <div key={i} className="text-center p-2 rounded" style={{ background: "var(--bg-panel)", border: `1px solid ${t.ok ? "var(--border)" : "var(--accent-red)"}` }}>
                  <div className="text-xs font-mono font-bold" style={{ color: t.ok ? "var(--accent-green)" : "var(--accent-red)" }}>{t.value}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>{t.label}</div>
                </div>
              ))}
            </div>

            {/* Contract Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded" style={{ background: "var(--bg-panel)" }}>
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>CA:</span>
                <span className="text-[10px] font-mono flex-1 truncate" style={{ color: "var(--text-secondary)" }}>Kb6R3jUV8cKJe9vB5L...uMtbw</span>
                <button className="text-[10px]" style={{ color: "var(--accent-green)" }}>Copy</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="h-6 flex items-center px-4 gap-6 border-t text-[10px]" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <span style={{ color: "var(--accent-green)" }}>● Stable</span>
        <span style={{ color: "var(--text-dim)" }}>100 FPS</span>
        <span style={{ color: "var(--text-dim)" }}>Watchlist</span>
        <span style={{ color: "var(--text-dim)" }}>Wallets</span>
        <span style={{ color: "var(--text-dim)" }}>PnL</span>
        <span style={{ color: "var(--text-dim)" }}>Feed</span>
        <span style={{ color: "var(--text-dim)" }}>Trenches</span>
        <span style={{ color: "var(--text-dim)" }}>Alpha</span>
        <div className="flex-1"></div>
        <span className="font-mono" style={{ color: "var(--accent-green)" }}>SOL $167.92</span>
        <span className="font-mono" style={{ color: "var(--accent-green)" }}>ETH $3,273</span>
        <span className="font-mono" style={{ color: "var(--accent-red)" }}>BTC $2,099</span>
      </div>
    </div>
  );
}
