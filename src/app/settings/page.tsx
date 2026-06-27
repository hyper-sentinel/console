"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import AuthGuard from "@/components/AuthGuard";
import { useAuth, PROVIDER_INFO } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  Brain, Link2, Database, CreditCard, Key,
  Lock, ShieldCheck, Zap, Star, Wallet,
  Satellite, Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  VaultConfig,
  encryptVault,
  decryptVault,
  getSecretKey,
  setSecretKey,
  hasSecretKey,
  createEmptyVault,
} from "@/lib/vault";

// ── Exchange field mappings ──────────────────────────────────

interface ExchangeDefinition {
  id: keyof VaultConfig["exchanges"];
  name: string;
  icon: LucideIcon;
  fields: { label: string; key: string; type: "text" | "password" }[];
  desc: string;
}

const EXCHANGE_CONNECTIONS: ExchangeDefinition[] = [
  {
    id: "hl", name: "Hyperliquid", icon: Zap, desc: "Perp + spot trading",
    fields: [
      { label: "Wallet Address", key: "wallet_address", type: "text" },
      { label: "Private Key", key: "private_key", type: "password" },
    ],
  },
  {
    id: "aster", name: "Aster DEX", icon: Star, desc: "Futures + spot trading",
    fields: [
      { label: "API Key", key: "api_key", type: "text" },
      { label: "API Secret", key: "api_secret", type: "password" },
    ],
  },
  {
    id: "onchain", name: "On-Chain Wallet", icon: Wallet, desc: "Direct on-chain execution",
    fields: [
      { label: "Private Key (EVM/Solana)", key: "private_key", type: "password" },
    ],
  },
];

interface DataSourceDef {
  id: keyof VaultConfig["data_sources"];
  name: string;
  status: "active" | "inactive";
  desc: string;
  keyRequired: boolean;
  fields: { label: string; key: string }[];
}

const DATA_SOURCES: DataSourceDef[] = [
  { id: "fred" as keyof VaultConfig["data_sources"], name: "DexScreener", status: "active", desc: "Live pair discovery", keyRequired: false, fields: [] },
  { id: "fred" as keyof VaultConfig["data_sources"], name: "CoinGecko", status: "active", desc: "Crypto prices (free)", keyRequired: false, fields: [] },
  { id: "fred", name: "FRED", status: "active", desc: "Macro data (free key)", keyRequired: true, fields: [{ label: "API Key", key: "api_key" }] },
  { id: "y2", name: "Y2 Intelligence", status: "active", desc: "News & sentiment", keyRequired: true, fields: [{ label: "API Key", key: "api_key" }] },
  { id: "elfa", name: "Elfa AI", status: "active", desc: "Social analytics", keyRequired: true, fields: [{ label: "API Key", key: "api_key" }] },
  { id: "x", name: "X / Twitter", status: "inactive", desc: "Social search", keyRequired: true, fields: [{ label: "API Key", key: "api_key" }, { label: "API Secret", key: "api_secret" }] },
];

interface APIKeyInfo {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used?: string;
}

const TIER_INFO = {
  standard: { name: "Pay-as-you-go", price: "20% markup", llm: "20%", maker: "0.01%", taker: "0.01%", rate: "1,000 req/min", color: "var(--accent-purple)" },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("ai");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [keys, setKeys] = useState<APIKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [newKeyFull, setNewKeyFull] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Vault state
  const [vaultConfig, setVaultConfig] = useState<VaultConfig>(createEmptyVault());
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultSaving, setVaultSaving] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<string | null>(null);
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [showSecretKeyPrompt, setShowSecretKeyPrompt] = useState(false);
  const [exchangeFields, setExchangeFields] = useState<Record<string, Record<string, string>>>({});

  const providerName = user?.provider ? PROVIDER_INFO[user.provider]?.name : "Not Connected";
  const providerPrefix = user?.provider ? PROVIDER_INFO[user.provider]?.keyPrefix : "";
  const tierInfo = TIER_INFO.standard;

  // ── Load vault on mount or section change ──────────────

  const loadVault = useCallback(async () => {
    const sk = getSecretKey();
    if (!sk) {
      setShowSecretKeyPrompt(true);
      return;
    }

    setVaultLoading(true);
    try {
      const data = await api.vaultGetConfig();
      if (data.encrypted_blob) {
        const decrypted = await decryptVault(data.encrypted_blob, data.nonce, sk);
        setVaultConfig(decrypted);

        // Populate exchange fields from vault
        const fields: Record<string, Record<string, string>> = {};
        for (const ex of EXCHANGE_CONNECTIONS) {
          const saved = decrypted.exchanges[ex.id] as Record<string, string> | undefined;
          if (saved) {
            fields[ex.id] = { ...saved };
          }
        }
        setExchangeFields(fields);
      }
    } catch {
      // Vault doesn't exist yet or can't decrypt — start fresh
      setVaultConfig(createEmptyVault());
    }
    setVaultLoading(false);
  }, []);

  useEffect(() => {
    if (activeSection === "exchanges" || activeSection === "data") {
      loadVault();
    }
  }, [activeSection, loadVault]);

  // ── Save exchange to vault ─────────────────────────────

  const saveExchange = async (exId: string) => {
    const sk = getSecretKey();
    if (!sk) {
      setShowSecretKeyPrompt(true);
      return;
    }

    const fields = exchangeFields[exId] || {};
    const hasValues = Object.values(fields).some((v) => v.trim());
    if (!hasValues) return;

    setVaultSaving(exId);
    try {
      // Merge into vault config
      const updated: VaultConfig = {
        ...vaultConfig,
        exchanges: {
          ...vaultConfig.exchanges,
          [exId]: fields,
        },
      };

      // Encrypt and save
      const { encrypted_blob, nonce } = await encryptVault(updated, sk);
      await api.vaultPutConfig(encrypted_blob, nonce, 1);

      setVaultConfig(updated);
      setVaultStatus(`✓ ${exId.toUpperCase()} saved to vault`);
      setConfiguring(null);
      setTimeout(() => setVaultStatus(null), 3000);

      // Signal to Copilot that wallets are now configured
      const hasAnyExchange = Object.entries(updated.exchanges).some(([, ex]) =>
        ex && Object.values(ex).some((v) => typeof v === "string" && v.trim()),
      );
      if (hasAnyExchange) {
        localStorage.setItem("sentinel_wallets_configured", "true");
      }
    } catch (err) {
      console.error("Vault save failed:", err);
      setVaultStatus(`✗ Failed to save ${exId.toUpperCase()}`);
      setTimeout(() => setVaultStatus(null), 3000);
    }
    setVaultSaving(null);
  };

  // ── Secret key submission ──────────────────────────────

  const submitSecretKey = () => {
    if (!secretKeyInput.trim()) return;
    setSecretKey(secretKeyInput.trim());
    setSecretKeyInput("");
    setShowSecretKeyPrompt(false);
    loadVault();
  };

  // ── Check if exchange has saved credentials ────────────

  const isExchangeConnected = (exId: string): boolean => {
    const saved = vaultConfig.exchanges[exId as keyof VaultConfig["exchanges"]] as Record<string, string> | undefined;
    return !!saved && Object.values(saved).some((v) => v?.trim());
  };

  // ── API Keys ───────────────────────────────────────────

  const fetchKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const data = await api.listApiKeys();
      setKeys(data.keys || []);
    } catch {
      setKeys([]);
    }
    setLoadingKeys(false);
  }, []);

  useEffect(() => {
    if (activeSection === "api") {
      fetchKeys();
    }
  }, [activeSection, fetchKeys]);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const data = await api.createApiKey(newKeyName || "Web Console Key");
      setNewKeyFull(data.api_key);
      setShowNameInput(false);
      setNewKeyName("");
      fetchKeys();
    } catch (e) {
      console.error("Key generation failed:", e);
    }
    setGenerating(false);
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await api.deleteApiKey(keyId);
      fetchKeys();
    } catch (e) {
      console.error("Revoke failed:", e);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch { /* fallback */ }
  };

  // ── Field change handler ───────────────────────────────

  const updateField = (exId: string, fieldKey: string, value: string) => {
    setExchangeFields((prev) => ({
      ...prev,
      [exId]: {
        ...(prev[exId] || {}),
        [fieldKey]: value,
      },
    }));
  };

  return (
    <AuthGuard>
    <AppLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>AI provider · Exchange keys · Data sources · Subscription</p>
          </div>
        </div>

        {/* Settings Navigation */}
        <div className="tab-bar mb-6">
          {[
            { id: "ai", label: "AI Provider" },
            { id: "exchanges", label: "Exchanges" },
            { id: "data", label: "Data Sources" },
            { id: "subscription", label: "Subscription" },
            { id: "api", label: "API Keys" },
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-item ${activeSection === tab.id ? "active" : ""}`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secret Key Prompt Modal */}
        {showSecretKeyPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.08)" }}>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><Lock size={18} /> Enter Secret Key</h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
                Your Secret Key (<code className="text-xs" style={{ color: "var(--accent-cyan)" }}>sdg-vault-xxx</code>) was shown once at signup.
                It&apos;s used to encrypt your exchange credentials. The server never sees your plaintext keys.
              </p>
              <input
                type="password"
                placeholder="sdg-vault-..."
                value={secretKeyInput}
                onChange={(e) => setSecretKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSecretKey()}
                className="input-field mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition"
                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-dim)" }}
                  onClick={() => setShowSecretKeyPrompt(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={submitSecretKey}
                  disabled={!secretKeyInput.trim()}
                >
                  Unlock Vault
                </button>
              </div>
              {hasSecretKey() && (
                <p className="text-[10px] mt-3 text-center" style={{ color: "var(--accent-green)" }}>
                  ✓ You already have a secret key stored. This form overwrites it.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Vault Status Toast */}
        {vaultStatus && (
          <div
            className="fixed top-16 right-8 z-50 px-4 py-2.5 rounded-lg text-sm font-semibold animate-slide-down"
            style={{
              background: vaultStatus.startsWith("✓") ? "rgba(0,255,136,0.12)" : "rgba(255,68,68,0.12)",
              color: vaultStatus.startsWith("✓") ? "var(--accent-green)" : "var(--accent-red)",
              border: `1px solid ${vaultStatus.startsWith("✓") ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`,
            }}
          >
            {vaultStatus}
          </div>
        )}

        {/* AI Provider Section */}
        {activeSection === "ai" && (
          <div className="max-w-2xl space-y-4">
            <div className="dash-panel">
              <div className="dash-panel-header">
                <h3 className="text-sm font-bold flex items-center gap-2"><Brain size={15} /> AI Provider</h3>
                <span className="tier-badge paid">CONNECTED</span>
              </div>
              <div className="dash-panel-body space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: "var(--bg-primary)", border: user?.provider ? "1px solid rgba(0,255,136,0.2)" : "1px solid var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: user?.provider === "claude" ? "rgba(167,139,250,0.15)" : user?.provider === "gpt" ? "rgba(0,255,136,0.1)" : user?.provider === "gemini" ? "rgba(59,130,246,0.15)" : "rgba(251,191,36,0.15)" }}>
                      <Brain size={16} style={{ color: user?.provider === "claude" ? "#A78BFA" : user?.provider === "gpt" ? "#00FF88" : user?.provider === "gemini" ? "#3B82F6" : "#FBBF24" }} />
                    </div>
                    <div>
                      <p className="font-bold">{providerName}</p>
                      <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>{providerPrefix}***...{user?.provider ? "connected" : "none"}</p>
                    </div>
                  </div>
                  <span className="status-dot online"></span>
                </div>

                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  Your AI key is stored locally in your browser. It&apos;s used to power the agent chat and autonomous monitors. Change provider anytime.
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "Claude", color: "#A78BFA", active: user?.provider === "claude" },
                    { name: "GPT", color: "#00FF88", active: user?.provider === "gpt" },
                    { name: "Gemini", color: "#3B82F6", active: user?.provider === "gemini" },
                    { name: "Grok", color: "#FBBF24", active: user?.provider === "grok" },
                  ].map(p => (
                    <button
                      key={p.name}
                      className="p-3 rounded-lg text-center text-sm transition"
                      style={{
                        background: p.active ? "rgba(0,255,136,0.08)" : "var(--bg-primary)",
                        border: `1px solid ${p.active ? "var(--accent-green)" : "var(--border)"}`,
                        color: p.active ? "var(--accent-green)" : "var(--text-dim)",
                      }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full mx-auto mb-2" style={{ background: p.color }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exchange Connections — WIRED TO VAULT */}
        {activeSection === "exchanges" && (
          <div className="max-w-2xl space-y-4">
            {/* Vault status indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
              background: hasSecretKey() ? "rgba(0,255,136,0.05)" : "rgba(255,191,36,0.05)",
              border: `1px solid ${hasSecretKey() ? "rgba(0,255,136,0.15)" : "rgba(255,191,36,0.15)"}`,
            }}>
              <span className={`status-dot ${hasSecretKey() ? "online" : "offline"}`}></span>
              <span className="text-xs font-medium" style={{ color: hasSecretKey() ? "var(--accent-green)" : "var(--accent-yellow)" }}>
                {hasSecretKey() ? "Vault unlocked — credentials encrypted client-side" : "Secret key required to access vault"}
              </span>
              {!hasSecretKey() && (
                <button className="text-xs font-bold ml-auto" style={{ color: "var(--accent-cyan)" }} onClick={() => setShowSecretKeyPrompt(true)}>
                  Enter Key
                </button>
              )}
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">
                <h3 className="text-sm font-bold flex items-center gap-2"><Link2 size={15} /> Web3 Exchange Connections</h3>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {vaultLoading ? "Loading vault..." : "Configure your trading endpoints"}
                </span>
              </div>
              <div className="dash-panel-body space-y-3">
                {EXCHANGE_CONNECTIONS.map(ex => {
                  const connected = isExchangeConnected(ex.id);
                  return (
                    <div key={ex.id}>
                      <div
                        className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition"
                        style={{
                          background: "var(--bg-primary)",
                          border: `1px solid ${connected ? "rgba(0,255,136,0.2)" : "var(--border)"}`,
                        }}
                        onClick={() => setConfiguring(configuring === ex.id ? null : ex.id)}
                      >
                        <div className="flex items-center gap-3">
                          <ex.icon size={18} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                          <div>
                            <p className="font-medium text-sm">{ex.name}</p>
                            <p className="text-xs" style={{ color: "var(--text-dim)" }}>{ex.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`status-dot ${connected ? "online" : "offline"}`}></span>
                          <span className="text-xs" style={{ color: connected ? "var(--accent-green)" : "var(--text-dim)" }}>
                            {connected ? "Connected" : "Not configured"}
                          </span>
                        </div>
                      </div>

                      {configuring === ex.id && (
                        <div className="mt-2 p-4 rounded-lg animate-slide-down" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                          <div className="space-y-3">
                            {ex.fields.map(field => (
                              <div key={field.key}>
                                <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>{field.label}</label>
                                <input
                                  type={field.type}
                                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                                  className="input-field"
                                  value={exchangeFields[ex.id]?.[field.key] || ""}
                                  onChange={(e) => updateField(ex.id, field.key, e.target.value)}
                                />
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <button
                                className="btn-primary text-sm !py-2"
                                onClick={() => saveExchange(ex.id)}
                                disabled={vaultSaving === ex.id}
                              >
                                {vaultSaving === ex.id ? "Encrypting..." : "Save & Connect"}
                              </button>
                              <button className="btn-secondary text-sm !py-2" onClick={() => setConfiguring(null)}>Cancel</button>
                            </div>
                            <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                              <Lock size={11} className="inline mr-1" /> Keys are AES-256-GCM encrypted with your Secret Key before being sent to the server. Sentinel never sees plaintext.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Data Sources */}
        {activeSection === "data" && (
          <div className="max-w-2xl">
            <div className="dash-panel">
              <div className="dash-panel-header">
                <h3 className="text-sm font-bold flex items-center gap-2"><Satellite size={15} /> Data Sources</h3>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>{DATA_SOURCES.filter(d => d.status === "active").length} active</span>
              </div>
              <div className="dash-panel-body">
                <div className="space-y-2">
                  {DATA_SOURCES.map(src => (
                    <div
                      key={src.name}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`status-dot ${src.status === "active" ? "online" : "offline"}`}></span>
                        <div>
                          <p className="text-sm font-medium">{src.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-dim)" }}>{src.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!src.keyRequired && (
                          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,255,136,0.1)", color: "var(--accent-green)" }}>Free</span>
                        )}
                        <button className="text-xs font-medium" style={{ color: src.status === "active" ? "var(--accent-green)" : "var(--accent-cyan)" }}>
                          {src.status === "active" ? "Configure" : "Add Key"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription — correct 40/20/10 fee schedule */}
        {activeSection === "subscription" && (
          <div className="max-w-2xl space-y-4">
            <div className="dash-panel">
              <div className="dash-panel-header">
                <h3 className="text-sm font-bold flex items-center gap-2"><CreditCard size={15} /> Subscription</h3>
                <span className="tier-badge paid" style={{ textTransform: "uppercase" }}>{tierInfo.name}</span>
              </div>
              <div className="dash-panel-body space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                  <div>
                    <p className="font-bold text-lg" style={{ color: tierInfo.color }}>{tierInfo.name} Plan</p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{tierInfo.price}</p>
                  </div>
                  <button className="btn-secondary text-sm">Manage via Stripe</button>
                </div>

                {/* Fee Schedule */}
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color: "var(--text-dim)" }}>YOUR FEE SCHEDULE</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                      <div>
                        <p className="text-sm font-medium">LLM Markup</p>
                        <p className="text-xs" style={{ color: "var(--text-dim)" }}>Applied on all AI token usage</p>
                      </div>
                      <span className="text-sm font-mono font-bold" style={{ color: tierInfo.color }}>{tierInfo.llm}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                      <div>
                        <p className="text-sm font-medium">Trade Fees (Maker / Taker)</p>
                        <p className="text-xs" style={{ color: "var(--text-dim)" }}>Applied on all trade executions</p>
                      </div>
                      <span className="text-sm font-mono font-bold" style={{ color: tierInfo.color }}>{tierInfo.maker} / {tierInfo.taker}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                      <div>
                        <p className="text-sm font-medium">Rate Limit</p>
                        <p className="text-xs" style={{ color: "var(--text-dim)" }}>Maximum API requests per minute</p>
                      </div>
                      <span className="text-sm font-mono font-bold" style={{ color: tierInfo.color }}>{tierInfo.rate}</span>
                    </div>
                  </div>
                </div>

                {/* Upgrade Table */}
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color: "var(--text-dim)" }}>PRICING</p>
                  <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <th className="text-left p-2 font-medium" style={{ color: "var(--text-dim)" }}>Plan</th>
                          <th className="text-right p-2 font-medium" style={{ color: "var(--text-dim)" }}>LLM</th>
                          <th className="text-right p-2 font-medium" style={{ color: "var(--text-dim)" }}>Maker</th>
                          <th className="text-right p-2 font-medium" style={{ color: "var(--text-dim)" }}>Taker</th>
                          <th className="text-right p-2 font-medium" style={{ color: "var(--text-dim)" }}>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(TIER_INFO).map(([key, t]) => (
                          <tr key={key} style={{ borderTop: "1px solid var(--border)" }}>
                            <td className="p-2 font-medium" style={{ color: t.color }}>{t.name}</td>
                            <td className="p-2 text-right font-mono">{t.llm}</td>
                            <td className="p-2 text-right font-mono">{t.maker}</td>
                            <td className="p-2 text-right font-mono">{t.taker}</td>
                            <td className="p-2 text-right font-mono">{t.rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Keys — LIVE from backend */}
        {activeSection === "api" && (
          <div className="max-w-2xl space-y-4">
            <div className="dash-panel">
              <div className="dash-panel-header">
                <h3 className="text-sm font-bold flex items-center gap-2"><Key size={15} /> Sentinel API Keys</h3>
                <button
                  className="btn-primary text-xs !py-1.5 !px-4"
                  onClick={() => setShowNameInput(true)}
                  disabled={generating}
                >
                  + Generate Key
                </button>
              </div>
              <div className="dash-panel-body space-y-3">
                <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>
                  API keys for accessing the Sentinel REST API. Each key is shown once at creation — save it immediately.
                </p>

                {/* New key name input */}
                {showNameInput && (
                  <div className="p-4 rounded-lg animate-slide-down" style={{ background: "var(--bg-primary)", border: "1px solid var(--accent-cyan)" }}>
                    <label className="text-xs font-mono mb-1 block" style={{ color: "var(--text-dim)" }}>Key Name (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Production, Dev, CI/CD..."
                      className="input-field mb-3"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button className="btn-primary text-sm !py-2" onClick={generateKey} disabled={generating}>
                        {generating ? "Generating..." : "Create Key"}
                      </button>
                      <button className="btn-secondary text-sm !py-2" onClick={() => { setShowNameInput(false); setNewKeyName(""); }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Show newly created key */}
                {newKeyFull && (
                  <div className="p-4 rounded-lg" style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.3)" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "var(--accent-cyan)" }}>
                      NEW KEY — Copy it now. It will NOT be shown again.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono flex-1 break-all" style={{ color: "var(--accent-cyan)" }}>{newKeyFull}</code>
                      <button
                        className="text-xs px-3 py-1.5 rounded"
                        style={{
                          background: copiedKey ? "rgba(0,255,136,0.2)" : "rgba(0,229,255,0.1)",
                          color: copiedKey ? "var(--accent-green)" : "var(--accent-cyan)",
                          border: "1px solid var(--border)",
                        }}
                        onClick={() => copyToClipboard(newKeyFull)}
                      >
                        {copiedKey ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <button
                      className="text-xs mt-2"
                      style={{ color: "var(--text-dim)" }}
                      onClick={() => setNewKeyFull(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Key list */}
                {loadingKeys ? (
                  <div className="text-center py-4">
                    <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>Loading keys...</p>
                  </div>
                ) : keys.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm mb-1" style={{ color: "var(--text-dim)" }}>No API keys yet</p>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                      Your first key was generated at sign-up. Generate additional keys above.
                    </p>
                  </div>
                ) : (
                  keys.map(k => (
                    <div key={k.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                      <div>
                        <p className="text-sm font-medium">{k.name || "Unnamed Key"}</p>
                        <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>sk-sentinel-{k.prefix}...***</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>
                          Created {new Date(k.created_at).toLocaleDateString()}
                          {k.last_used ? ` · Last used ${k.last_used}` : ""}
                        </p>
                      </div>
                      <button
                        className="text-xs font-medium px-3 py-1.5 rounded transition"
                        style={{ color: "var(--accent-red)", border: "1px solid rgba(255,82,82,0.2)" }}
                        onClick={() => revokeKey(k.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  ))
                )}

                <p className="text-xs text-center" style={{ color: "var(--text-dim)" }}>{keys.length} key{keys.length !== 1 ? "s" : ""} active</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
    </AuthGuard>
  );
}
