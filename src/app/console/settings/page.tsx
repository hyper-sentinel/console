"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [billing, setBilling] = useState<Record<string, unknown> | null>(null);
  const [aiKey, setAiKey] = useState("");
  const [provider, setProvider] = useState("claude");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getBillingStatus().then((d) => setBilling(d as unknown as Record<string, unknown>)).catch(() => {});
    const stored = localStorage.getItem("sentinel_ai_key") || "";
    const storedProvider = localStorage.getItem("sentinel_provider") || "claude";
    setAiKey(stored);
    setProvider(storedProvider);
  }, []);

  const saveProviderKey = () => {
    localStorage.setItem("sentinel_ai_key", aiKey);
    localStorage.setItem("sentinel_provider", provider);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const maskKey = (key: string) => {
    if (!key) return "";
    if (key.length < 12) return "•".repeat(key.length);
    return key.slice(0, 8) + "•".repeat(key.length - 12) + key.slice(-4);
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8 stagger-1">
        <h1 className="text-2xl font-semibold text-white mb-1">Settings</h1>
        <p className="text-sm" style={{ color: "#71717A" }}>Manage your account and connected services</p>
      </div>

      {/* Account Info */}
      <section className="mb-8 stagger-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#52525B" }}>Account</h2>
        <div className="rounded-xl border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-xs font-semibold" style={{ color: "#71717A" }}>Email</p>
              <p className="text-sm text-white">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#71717A" }}>User ID</p>
              <p className="text-sm font-mono" style={{ color: "#A1A1AA" }}>{user?.id || "—"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#71717A" }}>Tier</p>
              <p className="text-sm">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                  background: billing?.tier === "enterprise" ? "rgba(251,191,36,0.12)" : billing?.tier === "pro" ? "rgba(139,92,246,0.12)" : "rgba(0,255,136,0.08)",
                  color: billing?.tier === "enterprise" ? "#FBBF24" : billing?.tier === "pro" ? "#A78BFA" : "#00FF88",
                }}>
                  {(billing?.tier as string)?.toUpperCase() || "FREE"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-xs font-semibold" style={{ color: "#71717A" }}>Auth Provider</p>
              <p className="text-sm text-white capitalize">{provider}</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Provider Key — Zero Trust Config Vault */}
      <section className="mb-8 stagger-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525B" }}>Connected AI Provider</h2>
        <p className="text-xs mb-4" style={{ color: "#3F3F46" }}>
          Your AI provider key is stored locally and forwarded securely to the gateway. It is never stored on our servers.
        </p>
        <div className="rounded-xl p-5 border space-y-4" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "#A1A1AA" }}>Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={{ background: "#0A0A0B", color: "#E4E4E7", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <option value="claude">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="gemini">Google (Gemini)</option>
              <option value="grok">xAI (Grok)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "#A1A1AA" }}>API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={showKey ? aiKey : maskKey(aiKey)}
                onChange={(e) => { setAiKey(e.target.value); setShowKey(true); }}
                onFocus={() => setShowKey(true)}
                placeholder="sk-ant-... / sk-... / AIzaSy..."
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-purple-500/30"
                style={{ background: "#0A0A0B", color: "#E4E4E7", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2.5 rounded-lg text-xs transition"
                style={{ background: "rgba(255,255,255,0.04)", color: "#71717A" }}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveProviderKey}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: saved ? "rgba(0,255,136,0.12)" : "linear-gradient(135deg, #8B5CF6, #7C3AED)", color: saved ? "#00FF88" : "white" }}
            >
              {saved ? "Saved ✓" : "Save Key"}
            </button>
            <span className="text-[10px]" style={{ color: "#3F3F46" }}>Stored in browser only — zero trust</span>
          </div>
        </div>
      </section>

      {/* Secret Recovery Key (future) */}
      <section className="mb-8 stagger-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525B" }}>Secret Recovery Key</h2>
        <p className="text-xs mb-4" style={{ color: "#3F3F46" }}>
          Your encrypted config vault passphrase. Use this to recover your account and API keys on any device.
        </p>
        <div className="rounded-xl p-5 border" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-3 text-xs" style={{ color: "#52525B" }}>
            <span className="text-lg">🔐</span>
            <div>
              <p className="font-semibold text-white text-sm">Coming Soon</p>
              <p>Encrypted secret key for zero-trust config recovery — your keys, your vault.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="stagger-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#52525B" }}>Session</h2>
        <div className="rounded-xl p-5 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,68,68,0.12)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Sign out</p>
              <p className="text-xs" style={{ color: "#71717A" }}>End your current session</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: "rgba(255, 68, 68, 0.08)", color: "#FF4444", border: "1px solid rgba(255, 68, 68, 0.15)" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
