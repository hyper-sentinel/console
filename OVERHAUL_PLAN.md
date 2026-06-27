# Web Console + Terminal Overhaul — Agent Execution Plan

> **For the Antigravity agent working in `~/Antigravity/webdev/`.** Read this fully, then execute the
> phases in order. Companion context (read first if available):
> `~/Antigravity/Python/Knowledgebase/_CONTEXT/00_GROUND_TRUTH.md` + `ARCHITECTURE.md`.
> Created 2026-06-27 from a live audit of this repo.

---

## 0. Ground rules
- **Branch:** work ONLY on `web-console-overhaul` (already created). Never touch `master`.
- **Commit** in small logical chunks (`feat:`/`fix:`/`refactor:`/`chore:`). Push to
  `origin web-console-overhaul`.
- **Do NOT deploy.** Vercel CLI deploys must be run by the user from their own terminal (automated-env
  deploys hang). Your job ends at green build + push.
- **Verify against the LIVE gateway** (`api.hyper-sentinel.com`), not "it renders." Free-tier counter must
  be tested with a **fresh free LLM key** — the founder's main key is `active` and won't show a counter.
- After each phase: `npm run build` MUST pass (TypeScript clean) before moving on.

## 1. Goal & scope
Overhaul the **logged-in product** (console + terminal). Three goals:
1. **Visual/design redesign** — polish + consistency across console and terminal.
2. **Console functionality** — finish half-built flows, remove dead/ghost code.
3. **Wire to the LIVE gateway** — real data everywhere, no mocks.

**OUT of scope:** the public landing/marketing page (`src/app/landing-preview/`) — do not touch.

---

## 2. Architecture facts (from audit — reuse, don't reinvent)
- **API client:** `src/lib/api.ts` — centralized. `getHeaders()` (~L134-146) sets `Authorization: Bearer`
  (JWT) / `X-API-Key` (sk-sentinel) / `X-AI-Key` (provider key). Keep this; route ALL gateway calls through it.
- **Gateway contract:** `BillingStatus` interface (api.ts ~L57-80). Endpoints already wrapped:
  `GET /api/v1/billing/status|usage|history`, `GET /api/v1/usage/breakdown`,
  `POST /api/v1/billing/subscribe`, `GET /api/v1/billing/portal`, `POST /api/v1/llm/chat`.
  **Trust the `gated` boolean from the gateway — never re-derive gating from the prompt count.**
- **Design system:** Tailwind v4 + CSS variables in `src/app/globals.css` (~721 lines, single source of
  truth). Dark theme; accent green `#00ff88` / cyan. Component classes: `.btn-*`, `.glass-panel`,
  `.pane-*`, `.stat-card`, `.status-dot`, glow/anim utilities. No shadcn/Radix — custom primitives.
  **Redesign = evolve `globals.css` tokens/classes globally**, then fix one-off inline `style={{}}` colors.
- **Counter/paywall (half-done — KEEP + finish):** `src/panes/CopilotPane.tsx` reads
  `X-Sentinel-Prompts-Used/Limit` response headers + seeds from `getBillingStatus()`;
  `src/components/PaymentAlert.tsx` routes 402 → Stripe checkout/portal.

## 3. Routes & components (map)
- **Console (logged-in):** `/console` (dashboard), `/console/{api-keys,billing,usage,settings,playground,tools}`.
- **Terminal:** `/dashboard` (draggable pane grid + presets + command palette).
- **Auth:** `/login`, `/signup`. **Public:** `/landing-preview` (SKIP).
- **Shared components:** `BillingView` (used by `/billing` + `/console/billing`), `UsageBarChart`,
  `StatCard`, `PaymentAlert`, `CommandPalette`, `PaneGrid`/`PaneShell`, `KeyRevealModal`, `AuthGuard`.
- **Functional panes (live):** Copilot, Account, Orders, Positions, Orderbook, Markets, Chart, Intel, Macro.

## 4. REAL vs MOCK — the cleanup punch-list
| Surface | State | Action |
|---|---|---|
| Copilot, PaymentAlert, BillingView, UsageBarChart, console dashboard, Account/Orders/Positions/Chart | ✅ live gateway | polish only |
| `src/panes/DiscordPane.tsx` | ❌ 100% mock | **DELETE** + remove from `src/lib/pane-registry.ts` |
| `src/panes/TelegramPane.tsx` | ❌ 100% mock | **DELETE** + remove from registry |
| `src/panes/PolymarketPane.tsx` | ⚠️ hits public Polymarket API | **DELETE** + remove from registry (Polymarket is dead per ground truth) |
| USDC (`getUSDCBalance`/`registerUSDCWallet` in `api.ts`; `useUSDCBalance` in `hooks.ts`) | dead | remove |
| `src/app/settings/page.tsx` Discord/Telegram/Polymarket integration shells | ghost UI | remove |
| CopilotPane help/status text referencing Polymarket/Telegram/Discord | stale | scrub |
| `WalletPane`/`DexTradingPane`/`TradeFeedPane` | unclear/stub | confirm; wire to gateway or delete |

---

## 5. Execution phases (IN ORDER)

### Phase 1 — Cleanup (shrinks the surface; do first)
- Delete `DiscordPane.tsx`, `TelegramPane.tsx`, `PolymarketPane.tsx` + their `pane-registry.ts` entries.
- Remove USDC fns/hooks from `api.ts` + `hooks.ts`.
- Strip Discord/Telegram/Polymarket/USDC/swarm/strategy ghost refs from `settings/page.tsx` + Copilot help text.
- `npm run build` green. Commit `chore: remove dead mock panes + ghost integrations`.

### Phase 2 — Gateway wiring / finish functionality
- Finish the prompt counter (it's correct — verify it updates live from headers + matches `billing/status`).
- Confirm EVERY remaining pane + page uses live `api.*` calls (no mock/placeholder data).
- Confirm billing/usage pages render real gateway data; verify the 402 → Stripe checkout/portal flow.
- Commit `feat: wire all console surfaces to live gateway`.

### Phase 3 — Console redesign
- Evolve `globals.css` tokens/components for a tighter, more polished look. Unify inline `style={{}}`
  colors → classes. Polish `/console/*` pages, sidebar, top bar, cards, `BillingView`, `PaymentAlert`.
- Keep the dark theme + accent identity unless the user directs otherwise.
- Commit in chunks `feat(ui): …`.

### Phase 4 — Terminal overhaul
- `src/app/dashboard/page.tsx` + `PaneGrid`/`PaneShell` + `CommandPalette` + the surviving functional
  panes. Polish the pane grid, layout presets, drag/collapse, command palette.
- Commit `feat(terminal): …`.

---

## 6. Guardrails
- Don't advertise dead features — Polymarket / Telegram / Discord / USDC / swarm / strategies are REMOVED.
- Console + terminal are **desktop-only** by design (mobile gate exists). Keep unless told otherwise.
- Reuse existing classes/components/`api.ts` — don't introduce a new styling system or HTTP layer.

## 7. Verification / Definition of Done
- `npm run build` passes (TypeScript clean) after every phase.
- Log in → console dashboard, `/console/billing`, `/console/usage` all show **real gateway data**.
- Prompt counter decrements live for a **fresh free key**; 402 → Stripe checkout opens.
- No mock panes remain; no ghost-feature references in UI or help text.
- All work committed on `web-console-overhaul` and pushed. **User deploys** (don't deploy from here).

## 8. Key files (quick index)
- Redesign: `src/app/globals.css`, `src/components/{PaymentAlert,BillingView,StatCard}.tsx`, `src/app/console/*`
- Wiring: `src/lib/api.ts`, `src/lib/hooks.ts`, `src/panes/CopilotPane.tsx`
- Terminal: `src/app/dashboard/page.tsx`, `src/lib/pane-registry.ts`, `src/components/{PaneGrid,PaneShell,CommandPalette}.tsx`, `src/panes/*`
- Delete: `src/panes/{DiscordPane,TelegramPane,PolymarketPane}.tsx`
