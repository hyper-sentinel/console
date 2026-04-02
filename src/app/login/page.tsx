"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, PROVIDER_INFO, AIProvider } from "@/lib/auth";
import { KeyRound, ArrowRight, ExternalLink, Shield, Zap } from "lucide-react";

const providers: { id: AIProvider; name: string; color: string }[] = [
  { id: "claude", name: "Claude", color: "#D97706" },
  { id: "gpt", name: "ChatGPT", color: "#10A37F" },
  { id: "gemini", name: "Gemini", color: "#4285F4" },
  { id: "grok", name: "Grok", color: "#E4E4E7" },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginWithAIKey, isLoading } = useAuth();
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) { setError("Select an AI provider"); return; }
    setError("");
    const success = await loginWithAIKey(selectedProvider, apiKey);
    if (success) {
      localStorage.setItem(`sentinel_${selectedProvider}_key`, apiKey);
      localStorage.setItem("sentinel_provider", selectedProvider);
      router.push("/dashboard");
    }
    else setError("Invalid API key. Check your key and try again.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: "#06060A" }}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #00FF88 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.15), transparent)" }} />
      </div>

      <div className="relative w-full max-w-[420px] mx-4">
        {/* Logo + Tagline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.1))", border: "1px solid rgba(0,255,136,0.2)" }}>
              <Shield size={16} style={{ color: "#00FF88" }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#E4E4E7" }}>
              Sentinel
            </h1>
          </div>
          <p className="text-sm font-mono" style={{ color: "#52525B" }}>
            Your AI key is your identity
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6" style={{
          background: "rgba(15, 15, 20, 0.9)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,255,136,0.02)",
        }}>
          {/* Provider Selection */}
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#71717A" }}>
            Select Provider
          </label>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setSelectedProvider(p.id); setError(""); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: selectedProvider === p.id ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${selectedProvider === p.id ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.05)"}`,
                  color: selectedProvider === p.id ? "#E4E4E7" : "#71717A",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>

          {/* Key Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedProvider && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#71717A" }}>
                  {PROVIDER_INFO[selectedProvider].name} API Key
                </label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#52525B" }} />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`${PROVIDER_INFO[selectedProvider].keyPrefix}...`}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#E4E4E7",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
                <a
                  href={PROVIDER_INFO[selectedProvider].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] mt-2 hover:opacity-80 transition-opacity"
                  style={{ color: "#00FF88" }}
                >
                  Get your API key <ExternalLink size={10} />
                </a>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-3 py-2 rounded-lg text-xs font-mono" style={{
                background: "rgba(239, 68, 68, 0.08)",
                color: "#EF4444",
                border: "1px solid rgba(239, 68, 68, 0.15)",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !selectedProvider || !apiKey}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2"
              style={{ background: "#00FF88", color: "#000" }}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={14} />
                  Launch Terminal
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-6 text-[10px] font-mono" style={{ color: "#3F3F46" }}>
          <span className="flex items-center gap-1">
            <Shield size={10} /> Zero-knowledge vault
          </span>
          <span>·</span>
          <span>62+ tools</span>
          <span>·</span>
          <span>5 LLM providers</span>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] mt-4 font-mono" style={{ color: "#27272A" }}>
          Sentinel Labs LLC · 2026
        </p>
      </div>
    </div>
  );
}
