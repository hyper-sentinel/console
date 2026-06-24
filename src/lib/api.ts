/**
 * Sentinel API Client — 69 tools, JWT auth, Stripe billing.
 *
 * Production: https://api.hyper-sentinel.com
 * Auth: Bearer JWT -or- X-API-Key header
 * Tools: POST /api/v1/tools/{tool_name}
 * Docs: /docs (Swagger)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.hyper-sentinel.com";

// ── Types ──────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  status: string;
  tool: string;
  data: T;
  result?: T; // backward compat
  meta: {
    gateway: string;
    latency_ms: number;
    tier: string;
  };
}

export interface ApiError {
  error: string;
  message?: string;
  tool?: string;
  status?: number;
  // 402 quota payload
  quotaData?: {
    error: string;
    message: string;
    prompts_used: number;
    prompt_limit: number;
    window_days: number;
    resets_at: string;
    checkout_url: string;
  };
}

export interface AuthResponse {
  user_id: string;
  token: string;
  api_key?: string;  // Returned by /auth/ai-key (sk-sentinel-xxx)
  secret_key?: string;  // Returned by /auth/ai-key for NEW users (sdg-vault-xxx)
  secret_key_hint?: string;  // Returned for RETURNING users
  tier: string;
  email?: string;
  name?: string;
  provider?: string;
  status?: string;  // "created" | "existing"
  note?: string;
}

export interface BillingStatus {
  plan: string;
  payment_status: string;
  monthly_api_calls: number;
  rate_limit_per_min: number;
  your_fees: {
    llm_markup: string;
    maker_fee: string;
    taker_fee: string;
  };
  // Spend (month-to-date) — surfaced by the gateway GetStatus
  platform_fees?: string; // e.g. "$6.92"
  monthly_tokens?: number;
  // Payment method on file (active users only). Card → brand+last4; Link → type only.
  payment_method_type?: string; // "card" | "link" | ...
  card_brand?: string;
  card_last4?: string;
  // Free-tier quota fields
  prompts_used: number;
  prompt_limit: number;
  window_days: number;
  resets_at: string;
  gated: boolean;
}

export interface ApiKeyResponse {
  api_key: string;
  key_prefix: string;
}

// ── Client ─────────────────────────────────────────────────

class SentinelAPI {
  private apiKey: string | null = null;
  private jwtToken: string | null = null;

  constructor() {
    // Restore JWT from localStorage on init
    if (typeof window !== "undefined") {
      this.jwtToken = localStorage.getItem("sentinel_token");
      this.apiKey = localStorage.getItem("sentinel_api_key");
    }
  }

  // ── Auth state ──

  setToken(token: string) {
    this.jwtToken = token;
    if (typeof window !== "undefined") localStorage.setItem("sentinel_token", token);
  }

  getToken() { return this.jwtToken; }

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== "undefined") localStorage.setItem("sentinel_api_key", key);
  }

  getApiKey() { return this.apiKey; }

  getBaseUrl() { return API_BASE; }

  clearAuth() {
    this.jwtToken = null;
    this.apiKey = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("sentinel_token");
      localStorage.removeItem("sentinel_api_key");
    }
  }

  isAuthenticated() {
    return !!(this.jwtToken || this.apiKey);
  }

  // ── HTTP helpers ──

  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.jwtToken) headers["Authorization"] = `Bearer ${this.jwtToken}`;
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;

    // Forward AI provider key for LLM proxy calls
    if (typeof window !== "undefined") {
      const provider = localStorage.getItem("sentinel_provider");
      const aiKey = provider ? localStorage.getItem(`sentinel_${provider}_key`) : null;
      if (aiKey) headers["X-AI-Key"] = aiKey;
    }
    return headers;
  }

  private async fetchJSON<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers as Record<string, string>,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (res.status === 402) {
        const apiErr: ApiError = {
          error: body.error || "quota_exceeded",
          message: body.message || "Quota exceeded",
          status: 402,
          quotaData: body,
        };
        throw Object.assign(new Error(apiErr.message), apiErr);
      }
      throw new Error(body.error || body.message || `API error: ${res.status}`);
    }

    return res.json();
  }

  // ── Generic tool call ──

  /**
   * Execute any tool via POST /api/v1/tools/{tool_name}.
   * Handles both `data` (new format) and `result` (legacy) response fields.
   */
  async call<T = unknown>(toolName: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await this.fetchJSON<ApiResponse<T>>(`/api/v1/tools/${toolName}`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    // Support both new (`data`) and legacy (`result`) response formats
    return (response.data ?? response.result) as T;
  }

  // ═══════════════════════════════════════════════════════════
  //  AUTH — Register, Login, API Keys
  // ═══════════════════════════════════════════════════════════

  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const data = await this.fetchJSON<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.fetchJSON<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  /** Web4 login: validate an AI provider key */
  async loginWithAIKey(provider: string, apiKey: string): Promise<AuthResponse> {
    // Always store the AI key first so all subsequent requests include it
    this.setApiKey(apiKey);
    const data = await this.fetchJSON<AuthResponse>("/auth/ai-key", {
      method: "POST",
      body: JSON.stringify({ provider, ai_key: apiKey }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async createApiKey(name: string): Promise<ApiKeyResponse> {
    return this.fetchJSON<ApiKeyResponse>("/api/v1/auth/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async listApiKeys(): Promise<{ keys: { id: string; name: string; prefix: string; created_at: string; last_used?: string }[] }> {
    return this.fetchJSON("/api/v1/auth/keys");
  }

  async deleteApiKey(keyId: string): Promise<void> {
    return this.fetchJSON(`/api/v1/auth/keys/${keyId}`, { method: "DELETE" });
  }

  async getUsageBreakdown(): Promise<unknown> {
    return this.fetchJSON("/api/v1/usage/breakdown");
  }

  // ═══════════════════════════════════════════════════════════
  //  BILLING — Stripe + USDC
  // ═══════════════════════════════════════════════════════════

  async getBillingStatus(): Promise<BillingStatus> {
    return this.fetchJSON<BillingStatus>("/api/v1/billing/status");
  }

  async getBillingUsage() {
    return this.fetchJSON("/api/v1/billing/usage");
  }

  async getBillingHistory() {
    return this.fetchJSON("/api/v1/billing/history");
  }

  // Pay-as-you-go: plan is ignored by the gateway; kept optional for compatibility.
  async subscribe(_plan: string = ""): Promise<{ url: string; checkout_url?: string }> {
    return this.fetchJSON<{ url: string; checkout_url?: string }>(`/api/v1/billing/subscribe`, {
      method: "POST",
    });
  }

  async createCheckout(_plan: string = ""): Promise<{ url: string; checkout_url?: string }> {
    return this.fetchJSON<{ url: string; checkout_url?: string }>("/api/v1/billing/subscribe", {
      method: "POST",
    });
  }

  async getUSDCBalance() {
    return this.fetchJSON("/api/v1/billing/usdc/balance");
  }

  async registerUSDCWallet(walletAddress: string) {
    return this.fetchJSON("/api/v1/billing/usdc/register-wallet", {
      method: "POST",
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  LLM CHAT — Multi-provider AI
  // ═══════════════════════════════════════════════════════════

  // Frontend provider names → Go gateway provider names
  private static PROVIDER_MAP: Record<string, string> = {
    gemini: "google",
    claude: "anthropic",
    gpt: "openai",
    grok: "xai",
  };

  /** Map frontend provider name (gemini/claude/gpt/grok) to gateway name (google/anthropic/openai/xai) */
  mapProvider(provider: string | null): string {
    if (!provider) return "";
    return SentinelAPI.PROVIDER_MAP[provider] || provider;
  }

  async llmChat(messages: { role: string; content: string }[], options?: {
    provider?: string;
    model?: string;
    temperature?: number;
  }) {
    const frontendProvider = typeof window !== "undefined" ? localStorage.getItem("sentinel_provider") : null;
    const aiKey = typeof window !== "undefined" && frontendProvider
      ? localStorage.getItem(`sentinel_${frontendProvider}_key`)
      : null;
    const gatewayProvider = this.mapProvider(frontendProvider) || (options?.provider ? this.mapProvider(options.provider) : "");
    const turnId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return this.fetchJSON("/api/v1/llm/chat", {
      method: "POST",
      headers: { "X-Sentinel-Turn-Id": turnId },
      body: JSON.stringify({
        messages,
        ai_key: aiKey,
        provider: gatewayProvider,
        turn_id: turnId,
        ...options,
        // Ensure mapped provider isn't overwritten by options.provider
        ...(gatewayProvider ? { provider: gatewayProvider } : {}),
      }),
    });
  }

  async getPortalSession(): Promise<{ portal_url: string }> {
    return this.fetchJSON<{ portal_url: string }>("/api/v1/billing/portal");
  }

  // ═══════════════════════════════════════════════════════════
  //  CRYPTO — CoinGecko (Public, Free)
  // ═══════════════════════════════════════════════════════════

  getCryptoPrice(coinId: string) { return this.call("get_crypto_price", { coin_id: coinId }); }
  getCryptoTopN(n = 10) { return this.call("get_crypto_top_n", { n }); }
  searchCrypto(query: string) { return this.call("search_crypto", { query }); }
  getCryptoBatchPrices(ids: string[]) { return this.call("get_crypto_batch_prices", { coin_ids: ids }); }
  getCryptoChart(coinId: string, days = 30) { return this.call("get_crypto_chart", { coin_id: coinId, days }); }
  getStockPrice(ticker: string) { return this.call("get_stock_price", { ticker }); }

  // ═══════════════════════════════════════════════════════════
  //  FRED — Macro Economics (Public, Free)
  // ═══════════════════════════════════════════════════════════

  getEconomicDashboard() { return this.call("get_economic_dashboard"); }
  getFredSeries(seriesId: string) { return this.call("get_fred_series", { series_id: seriesId }); }
  searchFred(query: string) { return this.call("search_fred", { query }); }

  // ═══════════════════════════════════════════════════════════
  //  INTELLIGENCE — Y2 News & Sentiment (Public, Free)
  // ═══════════════════════════════════════════════════════════

  getNewsSentiment() { return this.call("get_news_sentiment"); }
  getNewsRecap() { return this.call("get_news_recap"); }
  getIntelligenceReports() { return this.call("get_intelligence_reports"); }
  getReportDetail(reportId: string) { return this.call("get_report_detail", { report_id: reportId }); }

  // ═══════════════════════════════════════════════════════════
  //  ELFA — Social Sentiment (Public, Free)
  // ═══════════════════════════════════════════════════════════

  getTrendingTokens() { return this.call("get_trending_tokens"); }
  getTopMentions() { return this.call("get_top_mentions"); }
  searchMentions(query: string) { return this.call("search_mentions", { query }); }
  getTrendingNarratives() { return this.call("get_trending_narratives"); }
  getTokenNews(token: string) { return this.call("get_token_news", { token }); }

  // ═══════════════════════════════════════════════════════════
  //  SOCIAL — X/Twitter
  // ═══════════════════════════════════════════════════════════

  searchX(query: string) { return this.call("search_x", { query }); }

  // ═══════════════════════════════════════════════════════════
  //  HYPERLIQUID — Perp Trading (Pro)
  // ═══════════════════════════════════════════════════════════

  getHLConfig() { return this.call("get_hl_config"); }
  getHLAccount() { return this.call("get_hl_account_info"); }
  getHLPositions() { return this.call("get_hl_positions"); }
  getHLOrderbook(coin: string) { return this.call("get_hl_orderbook", { coin }); }
  getHLOpenOrders() { return this.call("get_hl_open_orders"); }
  placeHLOrder(coin: string, side: string, size: number, price?: number, orderType = "limit") {
    return this.call("place_hl_order", { coin, side, size, price, order_type: orderType });
  }
  cancelHLOrder(coin: string, orderId: string) { return this.call("cancel_hl_order", { coin, order_id: orderId }); }
  closeHLPosition(coin: string) { return this.call("close_hl_position", { coin }); }

  // ═══════════════════════════════════════════════════════════
  //  ASTER DEX — Futures Trading (Pro)
  // ═══════════════════════════════════════════════════════════

  asterDiagnose() { return this.call("aster_diagnose"); }
  asterPing() { return this.call("aster_ping"); }
  asterTicker(symbol: string) { return this.call("aster_ticker", { symbol }); }
  asterOrderbook(symbol: string) { return this.call("aster_orderbook", { symbol }); }
  asterKlines(symbol: string, interval = "5m", limit = 200) { return this.call("aster_klines", { symbol, interval, limit }); }
  asterFundingRate(symbol: string) { return this.call("aster_funding_rate", { symbol }); }
  asterExchangeInfo() { return this.call("aster_exchange_info"); }
  asterBalance() { return this.call("aster_balance"); }
  asterPositions() { return this.call("aster_positions"); }
  asterAccountInfo() { return this.call("aster_account_info"); }
  asterPlaceOrder(symbol: string, side: string, quantity: number, price?: number, orderType = "LIMIT") {
    return this.call("aster_place_order", { symbol, side, quantity, price, order_type: orderType });
  }
  asterCancelOrder(symbol: string, orderId: string) { return this.call("aster_cancel_order", { symbol, order_id: orderId }); }
  asterCancelAll(symbol?: string) { return this.call("aster_cancel_all_orders", { symbol }); }
  asterOpenOrders() { return this.call("aster_open_orders"); }
  asterSetLeverage(symbol: string, leverage: number) { return this.call("aster_set_leverage", { symbol, leverage }); }

  // ═══════════════════════════════════════════════════════════
  //  VAULT — Encrypted Config Storage (SecretKey)
  // ═══════════════════════════════════════════════════════════

  async vaultInit(): Promise<{ message: string; vault_id?: string }> {
    return this.fetchJSON("/api/v1/vault/init", { method: "POST" });
  }

  async vaultGetConfig(): Promise<{ encrypted_blob: string; nonce: string; version: number; updated_at: string }> {
    return this.fetchJSON("/api/v1/vault/config");
  }

  async vaultPutConfig(encryptedBlob: string, nonce: string, version: number = 1): Promise<{ message: string }> {
    return this.fetchJSON("/api/v1/vault/config", {
      method: "PUT",
      body: JSON.stringify({ encrypted_blob: encryptedBlob, nonce: nonce, version }),
    });
  }

  async vaultDeleteConfig(): Promise<{ message: string }> {
    return this.fetchJSON("/api/v1/vault/config", { method: "DELETE" });
  }

  // ═══════════════════════════════════════════════════════════
  //  SYSTEM
  // ═══════════════════════════════════════════════════════════

  async health() {
    return this.fetchJSON("/health");
  }

  async listTools() {
    return this.fetchJSON("/api/v1/tools");
  }

  async getMetrics() {
    return this.fetchJSON("/metrics");
  }
}

export const api = new SentinelAPI();
export default SentinelAPI;
