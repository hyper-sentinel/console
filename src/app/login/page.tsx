"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, detectProvider, PROVIDER_INFO, type AIProvider } from "@/lib/auth";
import { Shield, Zap, Terminal, ArrowRight } from "lucide-react";

const PROVIDER_COLORS: Partial<Record<AIProvider, string>> = {
  claude: "#D97706",
  gpt: "#10A37F",
  gemini: "#4285F4",
  grok: "#E4E4E7",
  deepseek: "#0EA5E9",
  zhipu: "#8B5CF6",
  mistral: "#FF6B35",
};

export default function LoginPage() {
  const router = useRouter();
  const { loginWithAIKey, isLoading } = useAuth();
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [detected, setDetected] = useState<AIProvider | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-detect provider as user types/pastes
  useEffect(() => {
    const provider = detectProvider(apiKey);
    setDetected(provider);
    if (provider) setError("");
  }, [apiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) { setError("Paste your AI API key"); return; }

    const provider = detected;
    if (!provider) {
      setError("Could not detect provider from key prefix. Check your key.");
      return;
    }

    setError("");
    const success = await loginWithAIKey(provider, apiKey.trim());
    if (success) {
      router.push("/console");
    } else {
      setError("Invalid API key. Check your key and try again.");
    }
  };

  const detectedInfo = detected ? PROVIDER_INFO[detected] : null;
  const detectedColor = detected ? (PROVIDER_COLORS[detected] || "#00FF88") : "#00FF88";

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: "#06060A" }}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #00FF88 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.15), transparent)" }} />
      </div>

      <div className="relative w-full max-w-[460px] mx-4">
        {/* Logo + Tagline */}
        <div className="text-center mb-8">
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

        {/* Terminal-style card */}
        <div className="rounded-xl overflow-hidden" style={{
          background: "rgba(15, 15, 20, 0.9)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,255,136,0.02)",
        }}>
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <Terminal size={12} style={{ color: "#52525B" }} />
            <span className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "#52525B" }}>
              Authenticate
            </span>
            <div className="ml-auto flex gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: "#FF4444", opacity: 0.4 }} />
              <span className="w-2 h-2 rounded-full" style={{ background: "#FBBF24", opacity: 0.4 }} />
              <span className="w-2 h-2 rounded-full" style={{ background: "#00FF88", opacity: 0.4 }} />
            </div>
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-mono" style={{ color: "#00FF88" }}>{">"}</span>
                <span className="text-sm font-mono" style={{ color: "#71717A" }}>Paste your API key:</span>
              </div>
              <input
                ref={inputRef}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-xxx · sk-xxx · AIzaXxx · xai-xxx · glm-xxx"
                className="w-full px-4 py-3 rounded-lg text-sm font-mono focus:outline-none transition-all"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: `1px solid ${detected ? `${detectedColor}40` : "rgba(255,255,255,0.08)"}`,
                  color: "#E4E4E7",
                }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Auto-detection result */}
            {detected && detectedInfo && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg animate-fade-in" style={{
                background: `${detectedColor}08`,
                border: `1px solid ${detectedColor}20`,
              }}>
                <span className="w-2 h-2 rounded-full" style={{ background: detectedColor }} />
                <span className="text-xs font-mono" style={{ color: detectedColor }}>
                  Detected: {detectedInfo.name}
                </span>
                <span className="text-xs font-mono ml-auto" style={{ color: "#52525B" }}>
                  {detectedInfo.model}
                </span>
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
              disabled={isLoading || !apiKey.trim()}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2"
              style={{ background: "#00FF88", color: "#000" }}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={14} />
                  Launch Console
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Supported providers */}
        <div className="mt-6 text-center">
          <p className="text-[10px] uppercase tracking-wider font-mono mb-3" style={{ color: "#3F3F46" }}>
            Supported Providers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(Object.entries(PROVIDER_INFO) as [AIProvider, typeof PROVIDER_INFO[AIProvider]][])
              .filter(([id]) => id !== "ollama")
              .map(([id, info]) => (
                <div key={id} className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: "#52525B" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: PROVIDER_COLORS[id] || "#666" }} />
                  {info.name}
                </div>
              ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-5 text-[10px] font-mono" style={{ color: "#3F3F46" }}>
          <span className="flex items-center gap-1">
            <Shield size={10} /> Zero-knowledge vault
          </span>
          <span>·</span>
          <span>69 tools</span>
          <span>·</span>
          <span>8 LLM providers</span>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] mt-4 font-mono" style={{ color: "#27272A" }}>
          Sentinel Labs LLC · 2026
        </p>
      </div>
    </div>
  );
}
