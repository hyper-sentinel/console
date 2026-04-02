# Sentinel Web App — Production Hardening Prompt

Copy everything below this line and paste it into your **webdev workspace**:

---

The web app builds and runs. Now I need 6 critical fixes to make it production-ready against the live Go API gateway.

## ⚠️ API URL — Use the Custom Domain

The production API gateway has a custom domain:

```
https://api.hyper-sentinel.com
```

This maps to our Cloud Run deployment. **Use this as the base URL everywhere.**

**Update `.env.local`:**
```
NEXT_PUBLIC_API_URL=https://api.hyper-sentinel.com
```

**Update `src/lib/api.ts` line 10:**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.hyper-sentinel.com";
```

**Fallback:** If `api.hyper-sentinel.com` isn't resolving yet (DNS propagation), use the direct Cloud Run URL temporarily:
```
https://sentinel-api-281199879392.us-central1.run.app
```

Verify with:
```bash
curl https://api.hyper-sentinel.com/health
# or fallback:
curl https://sentinel-api-281199879392.us-central1.run.app/health
```

## Fix 1: Auth Endpoint Paths (BLOCKING)

The Go gateway auth endpoints are at the ROOT, not under `/api/v1/`:

```
POST /auth/register     ← NOT /api/v1/auth/register
POST /auth/login        ← NOT /api/v1/auth/login
POST /auth/ai-key       ← for Web4 AI key sign-in
```

In `src/lib/api.ts`, fix all three auth methods:

```typescript
// register() — change "/api/v1/auth/register" to "/auth/register"
async register(email: string, password: string, name?: string): Promise<AuthResponse> {
  const data = await this.fetchJSON<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  if (data.token) this.setToken(data.token);
  return data;
}

// login() — change "/api/v1/auth/login" to "/auth/login"
async login(email: string, password: string): Promise<AuthResponse> {
  const data = await this.fetchJSON<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) this.setToken(data.token);
  return data;
}

// loginWithAIKey() — change to "/auth/ai-key"
async loginWithAIKey(provider: string, apiKey: string): Promise<AuthResponse> {
  this.setApiKey(apiKey);
  const data = await this.fetchJSON<AuthResponse>("/auth/ai-key", {
    method: "POST",
    body: JSON.stringify({ provider, ai_key: apiKey }),
  });
  if (data.token) this.setToken(data.token);
  return data;
}
```

API key management endpoints ARE under `/api/v1/` — those are correct:
```
POST   /api/v1/auth/keys      ← create key (needs JWT)
GET    /api/v1/auth/keys      ← list keys
DELETE /api/v1/auth/keys/{id}  ← revoke key
```

## Fix 2: Remove "Launch App" Button → "Sign In"

In `src/app/page.tsx`, the navbar button says "Launch App →". Change it to "Sign In →":

```tsx
// Line ~105 in navbar
<button className="btn-primary text-sm !py-2 !px-5" 
  onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}>
  Sign In →
</button>
```

## Fix 3: Store AI Key on Successful Sign-In (CRITICAL)

When a user signs in with their AI key, we need to store it in localStorage so the CopilotPane can include it in LLM chat requests.

In `src/app/page.tsx`, in the auth success handler (~line 201-220), add BEFORE the redirect:

```typescript
// Store AI key for LLM proxy calls
localStorage.setItem(`sentinel_${selectedAI.id}_key`, apiKey);
localStorage.setItem("sentinel_provider", selectedAI.id);
```

This is already in the catch/fallback block but NOT in the try/success block. Add it there too.

Same fix needed in `src/app/login/page.tsx` — after successful `loginWithAIKey()`:
```typescript
localStorage.setItem(`sentinel_${selectedProvider}_key`, apiKey);
localStorage.setItem("sentinel_provider", selectedProvider);
```

## Fix 4: Forward AI Key in LLM Chat Requests (CRITICAL)

The Go gateway proxies LLM requests to the actual provider (Anthropic, OpenAI, etc). It needs the user's AI key to do this.

In `src/lib/api.ts`, update `getHeaders()` to include the AI key:

```typescript
private getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (this.jwtToken) headers["Authorization"] = `Bearer ${this.jwtToken}`;
  if (this.apiKey) headers["X-API-Key"] = this.apiKey;
  
  // Send AI provider key for LLM proxy calls
  if (typeof window !== 'undefined') {
    const provider = localStorage.getItem('sentinel_provider');
    const aiKey = provider ? localStorage.getItem(`sentinel_${provider}_key`) : null;
    if (aiKey) headers["X-AI-Key"] = aiKey;
  }
  
  return headers;
}
```

Also update `llmChat()` to include `ai_key` in the body:

```typescript
async llmChat(messages: { role: string; content: string }[], options?: {
  provider?: string;
  model?: string;
}) {
  const provider = typeof window !== 'undefined' ? localStorage.getItem('sentinel_provider') : null;
  const aiKey = typeof window !== 'undefined' && provider ? 
    localStorage.getItem(`sentinel_${provider}_key`) : null;
  
  return this.fetchJSON("/api/v1/llm/chat", {
    method: "POST",
    body: JSON.stringify({
      messages,
      ai_key: aiKey,
      provider: provider || options?.provider,
      ...options,
    }),
  });
}
```

## Fix 5: SSE Streaming in CopilotPane (IMPORTANT)

The CopilotPane currently waits for the full response before displaying. Add real-time streaming.

In `src/panes/CopilotPane.tsx`, replace the `handleSend` try block with:

```typescript
try {
  const chatHistory = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: input },
  ];

  const provider = localStorage.getItem('sentinel_provider');
  const aiKey = provider ? localStorage.getItem(`sentinel_${provider}_key`) : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sentinel-api-281199879392.us-central1.run.app";

  // Add placeholder assistant message
  const placeholderMsg: Message = {
    role: "assistant",
    content: "",
    timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
  };
  setMessages((m) => [...m, placeholderMsg]);

  const response = await fetch(`${API_BASE}/api/v1/llm/chat?stream=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(api.getToken() ? { "Authorization": `Bearer ${api.getToken()}` } : {}),
      ...(aiKey ? { "X-AI-Key": aiKey } : {}),
    },
    body: JSON.stringify({
      messages: chatHistory,
      ai_key: aiKey,
      provider,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(err.detail || err.error || `API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              setMessages((m) => {
                const updated = [...m];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullText,
                };
                return updated;
              });
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    }
  }

  // If streaming didn't produce text, fallback to non-streaming
  if (!fullText) {
    const resp = await api.llmChat(chatHistory);
    const reply = typeof resp === "string" ? resp :
      (resp as Record<string, unknown>)?.content ??
      (resp as Record<string, unknown>)?.response ??
      JSON.stringify(resp);
    setMessages((m) => {
      const updated = [...m];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: String(reply),
      };
      return updated;
    });
  }
}
```

Note: You'll need to expose `getToken()` as a public method on the API class (it already is).

## Fix 6: Make `getHeaders()` Public

The CopilotPane streaming code needs access to headers. In `src/lib/api.ts`, change:

```typescript
// From:
private getHeaders(): Record<string, string> {
// To:
getHeaders(): Record<string, string> {
```

## Gateway API Reference

**Auth (public):**
```
POST /auth/register        {"email", "password", "name"}
POST /auth/login           {"email", "password"}
POST /auth/ai-key          {"ai_key": "sk-ant-xxx"}
GET  /health               {"status": "ok"}
GET  /docs                 OpenAPI 3.0 spec
```

**Tools (authenticated):**
```
GET  /api/v1/tools                 list all 60+ tools
POST /api/v1/tools/{name}          execute a tool
POST /api/v1/llm/chat              AI chat (metered)
POST /api/v1/llm/chat?stream=true  SSE streaming
GET  /api/v1/llm/usage             usage stats
```

**Billing (authenticated):**
```
GET  /api/v1/billing/status        tier + fees
POST /api/v1/billing/subscribe?plan=pro  Stripe checkout
GET  /api/v1/usage/breakdown       per-tool usage
```

**Errors are RFC 7807:**
```json
{"type":"...","title":"Rate Limit","status":429,"detail":"300 req/min for free tier"}
```

## Verification

```bash
npm run build && npm run dev
```

1. `curl` the health endpoint — confirm API is reachable
2. Landing page: 4 LLM sign-in cards, "Sign In →" button (NOT "Launch App")
3. Click Claude → paste key → redirects to /dashboard
4. Dashboard: Copilot pane → type "price of bitcoin" → get streaming response
5. Dashboard: Chart pane → TradingView chart loads with live BTC data
6. Dashboard: Positions pane → shows HL/Aster/Poly tabs
7. Top bar: green dot + "Online" health indicator

---

*Prompt from sentinel-go workspace · April 1, 2026 · Soli Deo Gloria*
