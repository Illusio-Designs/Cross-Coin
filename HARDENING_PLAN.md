# Cross-Coin Storefronts — Remaining Hardening Plan

Cross-cutting plan for the work left after the four storefront sweeps. This file is **temporary** — it gets removed once every item is done. Track per-repo specifics in each `<Repo>/PENDING.md`.

> Current scores: **Crosscoin 92 (baseline) · Knitwink 99 · Velmique 94 · Velquira 94**

---

## Priority order

The order below is what I'll execute. Each row is one focused unit of work. As an item lands, I'll strike it through (`~~done~~`) and add the commit hash beside it.

### 🟢 P1 — Mechanical wins (no rollback risk)

- [ ] **Velquira `lib/api/*` migration to shared `apiClient`** — 13 files (`auth`, `cart`, `orders`, `products`, `categories`, `addresses`, `blog`, `policies`, `reviews`, `sliders`, `seo`, `contact`, `wishlist`) currently call raw `fetch`. Migrate each to `apiClient.get/post/...` so the 30s timeout / CSRF mirror / categorised toasts actually fire. Backward-compatible; per-file, low-risk.
- [ ] **`useFocusTrap` call-site wiring** — Hook is ported in both Velmique + Velquira. Wire into: CartDrawer, SearchOverlay, any modal/dialog. Returns focus to the trigger on close.
- [ ] **CrossSell + ReviewsSection `initialData` seeding (Velmique + Velquira)** — Server-fetch the bestsellers + reviews in the product page server shell, pass via prop, seed `useQuery({ initialData })`. Saves a round-trip on first paint. Pattern proven on Knitwink.

### 🟡 P2 — Medium-effort refactors

- [ ] **Velquira RHF CartDrawer swap** — Replace legacy hand-rolled address form inside CartDrawer with `useForm({ resolver: zodResolver(addressSchema) })`. Knitwink shipped this; same drop-in here.
- [ ] **Velmique state management split** — `lib/store.jsx` is one Context wrapping cart + wishlist; every mutation re-renders both consumer trees. Split into cart Context + wishlist Context (smaller blast radius) or swap to zustand. Half-day with regression test.
- [ ] **Storybook scaffolds (Velmique + Velquira)** — Run `npx storybook@latest init --skip-install --type nextjs`, copy the 4 stories from `Knitwink/stories/` (Button, Drawer, Modal, ProductCard). Doesn't install deps to keep node_modules small.

### 🔴 P3 — Upgrade PRs (need user go-ahead before touching)

- [ ] **Velmique JWT `localStorage` → `js-cookie`** — `apiClient` already honours both sources. The work is flipping every `lib/api/auth.js` write site to `Cookies.set('auth_token', ..., { secure: true, sameSite: 'lax' })` + adjusting login/logout/refresh flows. Touches every authed call path; needs a full regression test before merging.
- [ ] **Velmique Next 14.2 → 16 + React 19 + `@react-three/fiber@9`** — Three releases bundled because the 3D library forces a single rollback unit. Run codemods, fix async dynamic API call-sites (`cookies()`, `headers()` now async), verify the dormant Hero3D module under React 19. ~half-day plus QA.

### 🟦 P4 — Opt-in / installation tasks (require npm + user env config)

- [ ] **Jest devDeps install on Velmique + Velquira** — Tests are written; `npm i -D jest jest-environment-jsdom babel-jest @babel/core @babel/preset-env @babel/preset-react cross-env @next/bundle-analyzer` enables `npm test` + `npm run analyze`. User runs the install.
- [ ] **Sentry opt-in (all four)** — `npm i @sentry/nextjs` + set `NEXT_PUBLIC_SENTRY_DSN`. Adapter auto-wires with zero code change. User decides which sites get it first.

---

## Execution log

| # | Item | Status | Commit |
|---|---|---|---|
| - | _(populated as work completes)_ | | |

---

## Done — when

This file gets deleted on the commit that closes P1–P3 (P4 items are user-driven installs/configs and live on in the per-repo `PENDING.md`). The final commit will also:

- Update root `README.md` with final per-repo scores
- Update each `<Repo>/PENDING.md` to drop the now-closed items
- Update each `<Repo>/README.md` if any new patterns landed worth surfacing

Out-of-scope until the user asks: actually pushing Sentry DSNs, running `npm install`, modifying CI secrets.
