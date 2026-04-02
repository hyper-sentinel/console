"use client";
import { useState, useCallback } from "react";
import { setSecretKey } from "@/lib/vault";

interface KeyRevealModalProps {
  apiKey: string;
  secretKey: string | null;
  isNewUser: boolean;
  onDismiss: () => void;
}

export default function KeyRevealModal({ apiKey, secretKey, isNewUser, onDismiss }: KeyRevealModalProps) {
  const [copiedApi, setCopiedApi] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const copyToClipboard = useCallback(async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setter(true);
      setTimeout(() => setter(false), 2000);
    }
  }, []);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        background: "linear-gradient(145deg, #1a1f2e, #0d1117)",
        border: "1px solid rgba(0, 229, 255, 0.2)",
        borderRadius: "16px",
        padding: "32px",
        maxWidth: "520px",
        width: "90%",
        boxShadow: "0 0 40px rgba(0, 229, 255, 0.1), 0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #00e5ff, #007a8a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "24px",
          }}>
            K
          </div>
          <h2 style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
          }}>
            {isNewUser ? "Your Sentinel Keys" : "Welcome Back"}
          </h2>
          <p style={{
            margin: "8px 0 0",
            fontSize: "13px",
            color: "#8b949e",
            fontFamily: "'Inter', sans-serif",
          }}>
            {isNewUser
              ? "Save these keys now. The secret key will NOT be shown again."
              : "Your API key is restored. Secret key was shown at registration."}
          </p>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 600,
            color: "#00e5ff",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "6px",
            fontFamily: "'Inter', sans-serif",
          }}>
            API Key — for authenticating API calls
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: "8px",
            padding: "10px 12px",
          }}>
            <code style={{
              flex: 1,
              fontSize: "13px",
              color: "#e6edf3",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              wordBreak: "break-all",
            }}>
              {apiKey}
            </code>
            <button
              onClick={() => copyToClipboard(apiKey, setCopiedApi)}
              style={{
                background: copiedApi ? "#238636" : "#21262d",
                border: "1px solid #30363d",
                borderRadius: "6px",
                padding: "6px 12px",
                color: "#fff",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                whiteSpace: "nowrap",
                transition: "background 0.2s",
              }}
            >
              {copiedApi ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Secret Key (only for new users) */}
        {isNewUser && secretKey && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 600,
              color: "#f0883e",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "6px",
              fontFamily: "'Inter', sans-serif",
            }}>
              Secret Key — for vault recovery (SAVE THIS!)
            </label>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#0d1117",
              border: "1px solid #f0883e40",
              borderRadius: "8px",
              padding: "10px 12px",
            }}>
              <code style={{
                flex: 1,
                fontSize: "13px",
                color: "#f0883e",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                wordBreak: "break-all",
              }}>
                {secretKey}
              </code>
              <button
                onClick={() => copyToClipboard(secretKey, setCopiedSecret)}
                style={{
                  background: copiedSecret ? "#238636" : "#21262d",
                  border: "1px solid #30363d",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: "#fff",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "background 0.2s",
                }}
              >
                {copiedSecret ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Warning box for new users */}
        {isNewUser && (
          <div style={{
            background: "#f0883e10",
            border: "1px solid #f0883e30",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "20px",
          }}>
            <p style={{
              margin: 0,
              fontSize: "12px",
              color: "#f0883e",
              lineHeight: 1.5,
              fontFamily: "'Inter', sans-serif",
            }}>
              Warning: <strong>Store both keys in a secure location.</strong> The API key authenticates
              every call. The secret key encrypts your vault. We cannot recover it.
            </p>
          </div>
        )}

        {/* Acknowledge checkbox for new users */}
        {isNewUser && (
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={() => setAcknowledged(!acknowledged)}
              style={{ accentColor: "#00e5ff" }}
            />
            <span style={{
              fontSize: "13px",
              color: "#8b949e",
              fontFamily: "'Inter', sans-serif",
            }}>
              I have saved my keys
            </span>
          </label>
        )}

        {/* Continue button */}
        <button
          onClick={() => {
            // Auto-save secret key to localStorage for vault operations
            if (secretKey) setSecretKey(secretKey);
            onDismiss();
          }}
          disabled={isNewUser && !acknowledged}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: (isNewUser && !acknowledged)
              ? "#21262d"
              : "linear-gradient(135deg, #00e5ff, #007a8a)",
            color: (isNewUser && !acknowledged) ? "#484f58" : "#000",
            fontSize: "14px",
            fontWeight: 600,
            cursor: (isNewUser && !acknowledged) ? "not-allowed" : "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.2s",
          }}
        >
          Enter Dashboard →
        </button>

        {/* Footer */}
        <p style={{
          textAlign: "center",
          margin: "16px 0 0",
          fontSize: "11px",
          color: "#484f58",
          fontFamily: "'Inter', sans-serif",
        }}>
          Sentinel Labs LLC · 2026
        </p>
      </div>
    </div>
  );
}
