# Velmique — Pending Work

Honest gap audit against the **Crosscoin storefront baseline** (92/100 production-ready after the hardening sweep). Velmique uses the same backend (`api.crosscoin.in`) but runs on an **older Next.js 14.2 stack** with React Context-based state and an immersive 3D product showcase (`@react-three/fiber`).

> **Current production readiness: ~52 / 100.** Solid SEO scaffolding is already in place (per-page SeoWrapper); the gaps are hardening, form abstractions, and a stack-modernisation track that Knitwink / Velquira don't have.

---

## What Velmique ALREADY has ✅

| Area | Status |
|---|---|
| Framework | **Next.js 14.2 App Router** + React 18 |
| State | **React Context** (`lib/store.jsx` — `StoreProvider` for cart + wishlist) |
| Auth | JWT via `localStorage.getItem('token')` (NOT cookies) |
| API client | Per-resource files in `lib/api/` (no shared client; each file has its own `fetch` + brand header) |
| Toasts | `react-toastify` |
| Brand | `NEXT_PUBLIC_BRAND_NAME ?? 'velmique'` — properly env-driven |
| 3D showcase | `@react-three/fiber` + `@react-three/drei` + `three` (product page differentiator) |
| Pages | 23 routes (more than Knitwink / Velquira) — including dedicated `checkout`, `shop`, `order-confirmation`, `cancellation-refund`, `shipping-returns`, `terms`, `privacy-policy` |
| SEO scaffold | `components/SeoWrapper.jsx` (client-side title/meta injection) |

---

## What's MISSING vs Crosscoin baseline

### 🔴 HIGH severity (do before public launch / Google Ads)

#### 1. JWT in `localStorage` (not cookies) — XSS exposure
`lib/api/auth.js` reads `localStorage.getItem('token')`. Any XSS — and Velmique has **3 unsanitised `dangerouslySetInnerHTML` sites** (see #2) — exfiltrates the token. **Knitwink and Velquira use `js-cookie`** which is at least slightly harder to drain.

**Fix**: migrate to `js-cookie` with `secure; samesite=lax` and the existing backend cookie auth pattern. ~2 hrs (touches every API call site).

#### 2. DOMPurify sanitisation on every `dangerouslySetInnerHTML`
Currently **3 unsanitised sites**:
- `app/blog/[slug]/page.jsx:148` — blog post body
- `components/policy/PolicyView.jsx:65` — policy content
- `app/layout.jsx:84` — script tag (verify safe / self-generated)

**Fix**: copy `Crosscoin/src/utils/sanitizeHtml.js` (no React 19 dependency — works on React 18). ~1 hr.

#### 3. No global error reporter / ring buffer
No drain for ErrorBoundary catches, no unhandled-rejection listener, no `/api/client-errors` POST.

**Fix**: port `Crosscoin/src/utils/errorReporter.js` + `sentryAdapter.js`. ~30 min.

#### 4. No global fetch interceptor → silent failures + no timeout
**Worse than Knitwink/Velquira** because each `lib/api/*.js` file has its own raw `fetch` call. There's no single chokepoint to add a timeout / retry / error toast.

**Fix**: introduce a shared `lib/api/client.js` (steal from Knitwink) that all per-resource files delegate to. Then add the categorised-error-toast + 30s timeout + CSRF-mirror logic in one place. ~3 hrs (refactor 11 files).

#### 5. ErrorBoundary missing
Single render bug blanks the whole app.

**Fix**: port `Crosscoin/src/components/common/ErrorBoundary.jsx`, wrap the root `<body>`. ~20 min.

#### 6. No focus traps on modals / drawers
**Fix**: port `Crosscoin/src/hooks/useFocusTrap.js`. ~30 min.

#### 7. No structured data (JSON-LD)
**Fix**: per-route JSON-LD scripts. ~2 hrs.

#### 8. Missing `app/sitemap.ts` + `app/robots.ts`
**Fix**: create both files. ~1 hr.

#### 9. No tracking integration (GA4 / FB Pixel / Clarity)
**Fix**: port `Crosscoin/src/components/common/Analytics.jsx`. ~1 hr.

---

### 🟡 MEDIUM (do before scaling traffic)

#### 10. No `react-hook-form` + `zod` dependencies
Knitwink and Velquira have them pre-installed; Velmique doesn't. Address / login / checkout forms hand-roll validation.

**Fix**:
```bash
npm install react-hook-form @hookform/resolvers zod
```
Then port `Crosscoin/src/utils/addressSchema.js` and `Crosscoin/src/components/common/AddressFormRHF.jsx`. ~1 hr setup + 1 hr per form.

#### 11. No state management library
`lib/store.jsx` is a React Context with `useState` arrays for cart + wishlist. **Re-renders the entire tree on every change.** This will hurt the 3D product page perf as the canvas re-renders unnecessarily.

**Fix**: install `zustand` (matches Knitwink/Velquira). Or stay on Context but split into multiple providers (cart, wishlist, ui) so cart changes don't re-render wishlist consumers. ~half a day.

#### 12. No address quality / COD eligibility check
Same as Knitwink/Velquira. Backend endpoint exists; not consumed.

**Fix**: wire into address form. ~30 min.

#### 13. No `generateMetadata()` on dynamic pages
Same App-Router issue — SEO injection happens client-side via `useEffect` instead of server-side.

**Fix**: each dynamic route file gets a `generateMetadata`. ~3 hrs.

#### 14. No React Query
Same gap. Raw `fetch` + `useEffect` everywhere.

**Fix**: install `@tanstack/react-query`. ~half a day.

#### 15. No skip-to-main link / `.sr-only` utility
**Fix**: ~10 min.

#### 16. No proper README
Default scaffold (or missing).

**Fix**: write a proper README. ~1 hr.

---

### 🟠 STACK MODERNISATION (Velmique-specific)

#### 17. Next.js 14.2 → 16.x
Knitwink and Velquira are on **Next 16.2 + React 19**. Velmique is on **Next 14.2 + React 18**. The 14→16 jump is two major versions and brings:
- Async dynamic APIs (`cookies()`, `headers()` now async)
- React 19 hook changes (`useActionState`, `useFormStatus`)
- Caching directive overhaul (`cacheLife`, `cacheTag`)
- Faster Turbopack default in dev

**Risk**: 3D libs (`@react-three/fiber@8`) may need a bump to v9 to work with React 19. Test the 3D product page carefully.

**Fix**: `npm install next@latest react@latest react-dom@latest` + run through migration codemods. Test the 3D showcase end-to-end. ~half a day.

---

### 🟢 LOW (long-tail polish)

#### 18. No design-system primitives
#### 19. No tests
#### 20. No OpenAPI consumption
#### 21. No memo / useCallback audit — especially important given the 3D canvas
#### 22. No `next/dynamic` for the 3D bundle — currently ships the entire Three.js bundle on every page load instead of code-splitting

---

## Suggested execution order

| Order | Item | Time |
|---|---|---|
| 1 | **Move token from localStorage to cookies** | ~2 hrs (HIGH security) |
| 2 | DOMPurify + ErrorBoundary + focus traps + error reporter | ~3 hrs |
| 3 | **Refactor to shared `lib/api/client.js`** | ~3 hrs (unblocks #4) |
| 4 | Fetch interceptor (timeout, error toast, CSRF) on the shared client | ~1 hr |
| 5 | sitemap + robots + JSON-LD + `generateMetadata` | ~6 hrs |
| 6 | Tracking (GA4 + FB Pixel) | ~1 hr |
| 7 | Code-split the 3D bundle via `next/dynamic` | ~1 hr (perf win) |
| 8 | Install RHF + Zod + zustand; port address form | ~3 hrs |
| 9 | Address quality + skip-to-main + README | ~1.5 hrs |
| 10 | React Query migration | ~half day |
| 11 | **Next.js 14 → 16 upgrade** | ~half day + 3D regression testing |
| 12 | Tests + design system | ongoing |

**Total: ~4-5 dev days** to reach 85+ readiness (longer than Knitwink/Velquira because of the auth + stack migration + 3D code-splitting work).

---

## What to copy from Crosscoin

Same drop-in table as Knitwink/Velquira — see `Knitwink/PENDING.md` for the full mapping. Key additions for Velmique:

| Crosscoin file | Drop-in target in Velmique |
|---|---|
| `Crosscoin/src/services/api/config.js` (axios pattern) | merge with new `lib/api/client.js` |
| `Crosscoin/src/context/CartContext.jsx` (re-render splitting) | reference for Context optimisation if you stay off zustand |

---

## Backend env vars

```bash
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_FRONTEND_URL=https://velmique.com
NEXT_PUBLIC_BRAND_NAME=velmique         # already wired via auth.js

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Velmique-specific quirks

- **23 routes** vs 19 in Knitwink / Velquira — more checkout / legal pages already in place.
- **3D product showcase** is a unique differentiator. Don't lose it during the upgrade; code-split it to keep first-paint fast on non-3D routes.
- **Brand is properly env-driven** (`NEXT_PUBLIC_BRAND_NAME`) — better than Knitwink/Velquira where the brand is hard-coded in `lib/api/*.js`.

**Last audited**: this commit. Re-audit after each major Crosscoin hardening pass.
