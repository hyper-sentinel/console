# Deploy: console.hyper-sentinel.com

> The Sentinel Developer Console — where users sign up, generate API keys, and manage their account.
> This is the web portal equivalent of Anthropic Console, Google AI Studio, xAI Console.

---

## What This Is

The Sentinel web app serves as the **developer console** for the Sentinel API platform:

```
User Journey:
1. Visit console.hyper-sentinel.com
2. Sign up with AI provider key (Claude/GPT/Gemini/Grok)
3. Generate sk-sentinel-xxx API key from dashboard
4. pip install hyper-sentinel → use API key in SDK
```

This is the missing piece. The SDK is live on PyPI, the Go gateway is live on Cloud Run, but there's no web portal for key generation. Users currently have to get keys via CLI — that's not how any API platform works.

---

## Architecture

```
console.hyper-sentinel.com  (this web app — Next.js)
        │
        ├── Auth: POST /auth/ai-key → Go Gateway
        ├── Key Gen: POST /api/v1/billing/api-key → Go Gateway
        ├── LLM Chat: POST /api/v1/llm/chat → Go Gateway → Provider
        ├── Tools: POST /api/v1/tools/{name} → Go Gateway → Python Backend
        └── Billing: GET /api/v1/billing/status → Go Gateway → Stripe
                │
          api.hyper-sentinel.com  (Go gateway — already deployed)
                │
          sentinel-backend (Python — already deployed)
```

---

## Pre-Deploy Checklist

### 1. Environment Variables
The `.env.local` must have:
```bash
NEXT_PUBLIC_API_URL=https://api.hyper-sentinel.com
```

### 2. Verify API Gateway is Live
```bash
curl https://api.hyper-sentinel.com/health
# Expected: {"status":"ok","version":"1.0.0","tools_available":67}
```

### 3. Build Check
```bash
cd ~/Antigravity/webdev
npm run build
# Must exit 0 with no errors
```

---

## Deployment Options

### Option A: Netlify (Recommended — already have account)

```bash
# Install Netlify CLI if not present
npm i -g netlify-cli

# Build
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=out

# Or link to git for auto-deploy:
netlify init
```

**netlify.toml** (create in webdev root):
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_PUBLIC_API_URL = "https://api.hyper-sentinel.com"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Custom Domain Setup:**
1. In Netlify dashboard → Domain settings → Add custom domain
2. Add `console.hyper-sentinel.com`
3. In your DNS (Cloudflare/registrar), add CNAME:
   ```
   console.hyper-sentinel.com → your-site.netlify.app
   ```

### Option B: Vercel

```bash
npx vercel --prod
```

Add env var `NEXT_PUBLIC_API_URL=https://api.hyper-sentinel.com` in Vercel dashboard.

Custom domain: Settings → Domains → Add `console.hyper-sentinel.com`

### Option C: Cloud Run (keep everything in GCP)

```bash
cd ~/Antigravity/webdev

# Build container
gcloud run deploy sentinel-console \
  --source . \
  --region us-central1 \
  --project hyper-sentinel \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --set-env-vars NEXT_PUBLIC_API_URL=https://api.hyper-sentinel.com
```

Then map `console.hyper-sentinel.com` in Cloud Run → Custom Domains.

---

## DNS Records Needed

Wherever your DNS is managed (likely Cloudflare), add:

```
TYPE    NAME       VALUE
CNAME   console    <your-deployment-url>
```

You already have:
- `api.hyper-sentinel.com` → Cloud Run (Go gateway) ✅
- `hyper-sentinel.com` → old Netlify waitlist ⚠️ (needs updating)

Add:
- `console.hyper-sentinel.com` → new web app deployment

---

## Key Features That Are Live

| Feature | Route | Status |
|---------|-------|--------|
| AI Key Sign-Up | Landing page (`/`) | ✅ Claude/GPT/Gemini/Grok |
| Email/Password Auth | `/login`, `/signup` | ✅ Forms wired to Go gateway |
| API Key Generation | Dashboard → Account & Billing → Keys tab | ✅ Creates `sk-sentinel-xxx` |
| AI Chat (Copilot) | Dashboard → Sentinel Copilot pane | ✅ SSE streaming |
| Trading (Order Entry) | Dashboard → Order Entry pane | ✅ HL/Aster/Polymarket |
| Intelligence (Y2) | Dashboard → Intelligence pane | ✅ Sentiment, news, X search |
| Stripe Billing | Dashboard → Account & Billing pane | ✅ Pro $100/mo, Enterprise $1K/mo |
| 17 Dashboard Panes | Dashboard grid | ✅ All functional |

---

## The Revenue Loop

```
console.hyper-sentinel.com
  └── User signs up
      └── Generates sk-sentinel-xxx API key
          └── pip install hyper-sentinel
              └── from hyper_sentinel import Sentinel
                  └── client = Sentinel(api_key="sk-sentinel-xxx")
                      └── client.chat("price of BTC?")
                          └── Go gateway meters the call
                              └── Stripe records usage
                                  └── 💰 Revenue
```

Every SDK call generates revenue. The console is the on-ramp.

---

## Post-Deploy Verification

```bash
# 1. Health check
curl https://console.hyper-sentinel.com

# 2. Sign in flow — manual test
#    - Open console.hyper-sentinel.com
#    - Click "Claude" or "Gemini"
#    - Enter a real AI key
#    - Verify dashboard loads
#    - Go to Account & Billing → Keys tab
#    - Generate a new API key
#    - Copy the sk-sentinel-xxx key

# 3. SDK test with generated key
pip install hyper-sentinel
python3 -c "
from hyper_sentinel import Sentinel
client = Sentinel(api_key='sk-sentinel-xxx-from-console')
print(client.tools())
"
```

---

*console.hyper-sentinel.com — the developer console for the Sentinel API*
*Soli Deo Gloria*
