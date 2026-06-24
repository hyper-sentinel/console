"use client";
import { useState } from "react";

export default function DexTradingPane() {
  const [contractAddress, setContractAddress] = useState("");

  const detectChain = (addr: string) => {
    if (addr.startsWith("0x")) return "ETH";
    if (addr.length >= 32 && !addr.startsWith("0x")) return "SOL";
    return "Unknown";
  };

  return (
    <div className="flex flex-col h-full" style={{ fontSize: "11px" }}>
      <div className="px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>DEX Swap</span>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        <label className="text-[9px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>Contract Address</label>
        <div className="flex gap-1">
          <input
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Paste CA... (0x... or Solana address)"
            className="flex-1 text-[10px] px-2 py-1.5 rounded font-mono"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button className="text-[10px] px-3 rounded font-semibold" style={{ background: "var(--accent-cyan)", color: "#000" }}>
            Search
          </button>
        </div>
        {contractAddress && (
          <div className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>Chain: {detectChain(contractAddress)}</div>
        )}
        {!contractAddress && (
          <div className="flex-1 flex items-center justify-center text-center py-8">
            <div>
              <div className="text-2xl mb-2" style={{ color: "var(--text-dim)", opacity: 0.4 }}>—</div>
              <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>Paste a contract address to start trading</p>
              <p className="text-[9px] mt-1" style={{ color: "var(--text-dim)" }}>Supports Ethereum (0x...) and Solana addresses</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
