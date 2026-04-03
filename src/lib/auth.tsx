"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "./api";
import {
  setSecretKey as storeSecretKey,
  getSecretKey,
  hasSecretKey,
  encryptVault,
  decryptVault,
  createEmptyVault,
  type VaultConfig,
} from "./vault";

// ── Types ─────────────────────────────────────────────────
export type AIProvider = "claude" | "gpt" | "gemini" | "grok" | "ollama";
export type Tier = "free" | "pro" | "enterprise";

export interface User {
  id: string;
  email?: string;
  name?: string;
  provider?: AIProvider;
  model?: string;
  tier: Tier;
  token: string;
}

export interface PendingKeys {
  apiKey: string;
  secretKey: string | null;
  isNewUser: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingKeys: PendingKeys | null;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  loginWithAIKey: (provider: AIProvider, apiKey: string) => Promise<boolean>;
  logout: () => void;
  dismissKeys: () => void;
}

export const PROVIDER_INFO: Record<AIProvider, { name: string; model: string; keyPrefix: string; url: string }> = {
  claude: { name: "Claude", model: "claude-sonnet-4-20250514", keyPrefix: "sk-ant-", url: "https://console.anthropic.com/settings/keys" },
  gpt: { name: "ChatGPT", model: "gpt-4o", keyPrefix: "sk-", url: "https://platform.openai.com/api-keys" },
  gemini: { name: "Gemini", model: "gemini-2.0-flash", keyPrefix: "AI", url: "https://aistudio.google.com/apikey" },
  grok: { name: "Grok", model: "grok-3-mini-fast", keyPrefix: "xai-", url: "https://console.x.ai/" },
  ollama: { name: "Ollama", model: "local", keyPrefix: "", url: "http://localhost:11434" },
};

// ── Context ────────────────────────────────────────────────
const AuthContext = createContext<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  pendingKeys: null,
  loginWithEmail: async () => false,
  register: async () => false,
  loginWithAIKey: async () => false,
  logout: () => {},
  dismissKeys: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState<PendingKeys | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sentinel_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Restore token to API client
        if (parsed.token) api.setToken(parsed.token);
        // Also restore API key if stored separately
        const storedKey = localStorage.getItem("sentinel_api_key");
        if (storedKey) api.setApiKey(storedKey);
      }
    } catch {
      // Invalid session, ignore
    }
    setIsLoading(false);
  }, []);

  const persistUser = (u: User) => {
    setUser(u);
    localStorage.setItem("sentinel_user", JSON.stringify(u));
  };

  // ── Email/password login ──
  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const resp = await api.login(email, password);
      const newUser: User = {
        id: resp.user_id,
        email,
        tier: (resp.tier as Tier) || "free",
        token: resp.token,
      };
      persistUser(newUser);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  }, []);

  // ── Email/password register ──
  const register = useCallback(async (email: string, password: string, name?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const resp = await api.register(email, password, name);
      const newUser: User = {
        id: resp.user_id,
        email,
        name,
        tier: (resp.tier as Tier) || "free",
        token: resp.token,
      };
      persistUser(newUser);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  }, []);

  // ── Web4 AI key login ──
  const loginWithAIKey = useCallback(async (provider: AIProvider, apiKey: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Store the AI provider key for LLM proxy calls
      localStorage.setItem(`sentinel_${provider}_key`, apiKey);
      localStorage.setItem("sentinel_provider", provider);

      // Try backend validation first
      const resp = await api.loginWithAIKey(provider, apiKey);
      const info = PROVIDER_INFO[provider];

      // Gateway returns api_key (sk-sentinel-xxx), NOT token
      // Use api_key for X-API-Key auth on all subsequent requests
      const sentinelKey = resp.api_key || resp.token;
      if (sentinelKey) {
        api.setApiKey(sentinelKey);
      }

      // Capture keys for KeyRevealModal
      const isNew = resp.status === "created";
      setPendingKeys({
        apiKey: sentinelKey || "",
        secretKey: resp.secret_key || null,
        isNewUser: isNew,
      });

      // Auto-persist SecretKey for vault operations
      if (resp.secret_key) {
        storeSecretKey(resp.secret_key);
      }

      const newUser: User = {
        id: resp.user_id,
        provider,
        model: info.model,
        tier: (resp.tier as Tier) || "free",
        token: sentinelKey || `sentinel_${Date.now().toString(36)}`,
      };
      persistUser(newUser);

      // ── Vault: persist AI key encrypted ──
      if (isNew && resp.secret_key) {
        // New user: encrypt AI key into vault for cross-device persistence
        try {
          await api.vaultInit();
          const vault = createEmptyVault();
          vault.ai_provider = { provider, api_key: apiKey, model: info.model };
          const { encrypted_blob, nonce } = await encryptVault(vault, resp.secret_key);
          await api.vaultPutConfig(encrypted_blob, nonce, 1);
        } catch {
          console.warn("Vault init failed — AI key stored locally only");
        }
      } else if (!isNew && hasSecretKey()) {
        // Returning user: restore full config from vault
        try {
          const sk = getSecretKey();
          if (sk) {
            const vaultData = await api.vaultGetConfig();
            if (vaultData.encrypted_blob) {
              const decrypted = await decryptVault(vaultData.encrypted_blob, vaultData.nonce, sk);
              if (decrypted.ai_provider?.api_key) {
                localStorage.setItem(`sentinel_${decrypted.ai_provider.provider}_key`, decrypted.ai_provider.api_key);
                localStorage.setItem("sentinel_provider", decrypted.ai_provider.provider);
              }
              // Check if any exchanges are configured in vault
              if (decrypted.exchanges) {
                const hasExchange = Object.values(decrypted.exchanges).some(
                  (ex) => ex && typeof ex === "object" && Object.values(ex).some((v) => typeof v === "string" && (v as string).trim()),
                );
                if (hasExchange) localStorage.setItem("sentinel_wallets_configured", "true");
              }
            }
          }
        } catch {
          console.warn("Vault restore failed — using provided AI key");
        }
      }

      setIsLoading(false);
      return true;
    } catch {
      // Fallback: validate key format locally (for development without backend)
      const info = PROVIDER_INFO[provider];
      if (provider === "ollama" || (info.keyPrefix && apiKey.startsWith(info.keyPrefix)) || apiKey.length > 10) {
        const fallbackUser: User = {
          id: `usr_local_${Date.now()}`,
          provider,
          model: info.model,
          tier: "free",
          token: `local_${Date.now().toString(36)}`,
        };
        persistUser(fallbackUser);
        api.setApiKey(apiKey); // Store as API key for tool calls
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    api.clearAuth();
    localStorage.removeItem("sentinel_user");
    setPendingKeys(null);
  }, []);

  const dismissKeys = useCallback(() => {
    setPendingKeys(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      pendingKeys,
      loginWithEmail,
      register,
      loginWithAIKey,
      logout,
      dismissKeys,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
