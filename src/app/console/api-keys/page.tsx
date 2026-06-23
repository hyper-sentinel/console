"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used?: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await api.listApiKeys();
      setKeys(data?.keys || []);
    } catch {
      // API may not support listing yet — show empty
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await api.createApiKey(newKeyName.trim());
      setCreatedKey(result.api_key || "");
      setNewKeyName("");
      loadKeys();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create key";
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    setDeletingId(keyId);
    try {
      await api.deleteApiKey(keyId);
      loadKeys();
    } catch {
      setError("Failed to revoke key. Try again.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Inline error toast */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-mono flex items-center justify-between" style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          color: "#FCA5A5",
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:text-white transition" style={{ color: "#71717A" }}>✕</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-8 stagger-1">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">API Keys</h1>
          <p className="text-sm" style={{ color: "#71717A" }}>Manage your Sentinel API keys for programmatic access</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreatedKey(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            color: "white",
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.25)",
          }}
        >
          <span>+</span> Create API Key
        </button>
      </div>

      {/* Create Key Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: "#1A1A1E", borderColor: "rgba(255,255,255,0.08)" }}>
            {createdKey ? (
              <>
                <h3 className="text-lg font-semibold text-white mb-2">API Key Created</h3>
                <p className="text-xs mb-4" style={{ color: "#71717A" }}>
                  Copy your key now. You won&apos;t be able to see it again.
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 rounded-lg px-4 py-3 text-sm font-mono break-all" style={{ background: "#0A0A0B", color: "#00FF88", border: "1px solid rgba(0,255,136,0.15)" }}>
                    {createdKey}
                  </div>
                  <button
                    onClick={copyKey}
                    className="shrink-0 px-4 py-3 rounded-lg text-sm font-semibold transition"
                    style={{
                      background: copied ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.06)",
                      color: copied ? "#00FF88" : "#E4E4E7",
                    }}
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>

                <div className="rounded-lg p-4 mb-6 text-xs font-mono leading-relaxed" style={{ background: "#0A0A0B", color: "#A1A1AA" }}>
                  <p style={{ color: "#52525B" }}># Use in Python</p>
                  <p><span style={{ color: "#8B5CF6" }}>from</span> hyper_sentinel <span style={{ color: "#8B5CF6" }}>import</span> Sentinel</p>
                  <p>client = Sentinel(api_key=<span style={{ color: "#FBBF24" }}>&quot;{createdKey.slice(0, 20)}...&quot;</span>)</p>
                </div>

                <button
                  onClick={() => { setShowCreate(false); setCreatedKey(null); }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition"
                  style={{ background: "rgba(139, 92, 246, 0.12)", color: "#A78BFA" }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-2">Create a new API key</h3>
                <p className="text-xs mb-6" style={{ color: "#71717A" }}>
                  Give your key a name to identify it later.
                </p>
                <label className="text-xs font-semibold block mb-2" style={{ color: "#A1A1AA" }}>Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Production, Development, Bot"
                  className="w-full px-4 py-3 rounded-lg text-sm mb-6 outline-none focus:ring-2 focus:ring-purple-500/30"
                  style={{ background: "#0A0A0B", color: "#E4E4E7", border: "1px solid rgba(255,255,255,0.08)" }}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#71717A" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newKeyName.trim()}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", color: "white" }}
                  >
                    {creating ? "Creating..." : "Create Key"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-xl p-4 mb-6 flex items-start gap-3 stagger-2" style={{ background: "rgba(139, 92, 246, 0.06)", border: "1px solid rgba(139, 92, 246, 0.12)" }}>
        <span className="text-lg">💡</span>
        <div>
          <p className="text-xs font-semibold text-white mb-1">Keep your API keys secure</p>
          <p className="text-xs" style={{ color: "#71717A" }}>
            Do not share your keys publicly. Use environment variables in your apps. You can revoke and create new keys at any time.
          </p>
        </div>
      </div>

      {/* Keys Table */}
      <div className="rounded-xl border overflow-hidden stagger-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#141416" }}>
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525B" }}>Name</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525B" }}>Key</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525B" }}>Created</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525B" }}>Last Used</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525B" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>{[1,2,3].map((i) => (
                <tr key={i} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <td className="px-5 py-4"><div className="skeleton" style={{ height: 14, width: "60%" }} /></td>
                  <td className="px-5 py-4"><div className="skeleton" style={{ height: 14, width: "40%" }} /></td>
                  <td className="px-5 py-4"><div className="skeleton" style={{ height: 14, width: "50%" }} /></td>
                  <td className="px-5 py-4"><div className="skeleton" style={{ height: 14, width: "30%" }} /></td>
                  <td className="px-5 py-4 text-right"><div className="skeleton" style={{ height: 14, width: 50, marginLeft: "auto" }} /></td>
                </tr>
              ))}</>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl opacity-30">🔑</span>
                    <p className="text-sm" style={{ color: "#52525B" }}>No API keys yet</p>
                    <button
                      onClick={() => { setShowCreate(true); setCreatedKey(null); }}
                      className="text-sm font-semibold px-4 py-2 rounded-lg transition"
                      style={{ color: "#A78BFA", background: "rgba(139, 92, 246, 0.08)" }}
                    >
                      + Create your first key
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="border-t transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-5 py-4 text-sm font-medium text-white">{key.name}</td>
                  <td className="px-5 py-4 text-sm font-mono" style={{ color: "#A1A1AA" }}>
                    {key.prefix}...
                  </td>
                  <td className="px-5 py-4 text-xs" style={{ color: "#71717A" }}>
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-xs" style={{ color: "#71717A" }}>
                    {key.last_used ? new Date(key.last_used).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(key.id)}
                      disabled={deletingId === key.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
                      style={{ color: "#FF4444", background: "rgba(255,68,68,0.06)" }}
                    >
                      {deletingId === key.id ? "Revoking..." : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Usage Hint */}
      <div className="mt-8 rounded-xl p-6 border stagger-4" style={{ background: "#141416", borderColor: "rgba(255,255,255,0.04)" }}>
        <h3 className="text-sm font-semibold text-white mb-3">Using your API key</h3>
        <div className="rounded-lg p-4 font-mono text-xs leading-relaxed" style={{ background: "#0A0A0B", color: "#A1A1AA" }}>
          <p style={{ color: "#52525B" }}># Python SDK</p>
          <p><span style={{ color: "#00FF88" }}>pip install</span> hyper-sentinel</p>
          <br />
          <p><span style={{ color: "#8B5CF6" }}>from</span> hyper_sentinel <span style={{ color: "#8B5CF6" }}>import</span> Sentinel</p>
          <p>client = Sentinel(api_key=<span style={{ color: "#FBBF24" }}>&quot;sk-sentinel-xxx&quot;</span>)</p>
          <br />
          <p style={{ color: "#52525B" }}># Or via curl</p>
          <p>curl -H <span style={{ color: "#FBBF24" }}>&quot;Authorization: Bearer sk-sentinel-xxx&quot;</span> \</p>
          <p>&nbsp;&nbsp;https://api.hyper-sentinel.com/api/v1/tools/call \</p>
          <p>&nbsp;&nbsp;-d <span style={{ color: "#FBBF24" }}>&apos;{`{"tool": "get_crypto_price", "params": {"coin_id": "bitcoin"}}`}&apos;</span></p>
        </div>
      </div>
    </div>
  );
}
