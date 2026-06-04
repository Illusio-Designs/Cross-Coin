# Knitwink — Pending Work

Honest gap audit against the **Crosscoin storefront baseline** (which sits at 92/100 production-ready after the hardening sweep). Knitwink uses the same backend (`api.crosscoin.in`) and brand-multiplexes via the `X-Brand-Name` header, so most of the hardening Crosscoin already shipped is portable to Knitwink with minimal effort.

> **Current production readiness: ~58 / 100.** Foundations are solid (App Router, Zustand, RHF + Zod deps installed, brand header wired). The gaps are almost entirely **hardening + SEO + a11y** that Crosscoin already solved.

---

## What Knitwink ALREADY has ✅

| Area | Status |
|---|---|
| Framework | Next.js 16 App Router + React 19 |
| State | Zustand stores (`cartStore`, `uiStore`, `wishlistStore`) |
| Auth | JWT cookie via `js-cookie` |
| Forms | `react-hook-form` + `zod` (deps installed, not yet used) |
| API client | `lib/api/client.js` with brand header on every call |
| Toasts | `react-toastify` |
| ISR | `/api/revalidate` endpoint with secret guard |
| Backend | Reuses `api.crosscoin.in` — every feature Crosscoin ships works for Knitwink as soon as a brand row is added |
| Pages | 19 routes — home, about, account, cart, collections, contact, journal, login, register, search, track-order, wishlist, products, policies |
| SEO scaffold | `components/SeoWrapper.jsx` mirrors Crosscoin's client-side title/meta injection |

---

## What's MISSING vs Crosscoin baseline

### 🔴 HIGH severity (do before public launch / Google Ads)

#### 1. DOMPurify sanitisation on every `dangerouslySetInnerHTML`
Currently **4 unsanitised sites**:
- `app/journal/[slug]/page.jsx:113` — blog post body
- `app/policies/[name]/page.jsx:65` — policy content
- `components/ui/SectionHeader.jsx:15` — title (admin-authored)
- `app/layout.jsx:59` — script tag (verify safe / self-generated)

**Fix**: copy `Crosscoin/src/utils/sanitizeHtml.js` (richHtml + inlineHtml helpers, link hardening hook). ~1 hr to wire across all sites.

#### 2. No global error reporter / `window.__knitwinkErrors` ring buffer
No drain for ErrorBoundary catches, no unhandled-rejection listener, no `/api/client-errors` POST.

**Fix**: port `Crosscoin/src/utils/errorReporter.js` + `Crosscoin/src/utils/sentryAdapter.js`. Add `installErrorReporter()` call to `app/layout.jsx`. ~30 min.

#### 3. No global fetch interceptor → silent failures + no timeout
`lib/api/client.js` has no timeout, no error toast on failure, no CSRF token mirror, no retry policy. Any backend hang leaves the UI spinning forever.

**Fix**: port the categorised-error-toast + 30s timeout + CSRF cookie-mirror logic from `Crosscoin/src/utils/apiInterceptors.js` into `apiFetch()`. ~45 min.

#### 4. ErrorBoundary missing
Single render bug in any client component blanks the whole app (App Router's default `error.jsx` only catches inside route segments).

**Fix**: port `Crosscoin/src/components/common/ErrorBoundary.jsx` and wrap the root `<body>` in `app/layout.jsx`. ~20 min.

#### 5. No focus traps on `<Drawer>` / `<Modal>` / `<CartDrawer>`
Keyboard / screen-reader users get stuck. Real risk; accessibility lawsuits in India are rising.

**Fix**: port `Crosscoin/src/hooks/useFocusTrap.js` and wire into `components/ui/Drawer.jsx` + `components/ui/Modal.jsx` + `components/cart/CartDrawer.jsx`. ~30 min.

#### 6. No structured data (JSON-LD)
Product / collection / blog pages ship without Product / CollectionPage / BlogPosting / BreadcrumbList JSON-LD. Crosscoin gets richer search snippets because of this.

**Fix**: in each `app/<route>/page.jsx`, render a `<script type="application/ld+json">` with the same shape Crosscoin uses (see `Crosscoin/src/pages/products/[slug].jsx` and `Crosscoin/src/pages/collections/[slug].jsx`). ~2 hrs.

#### 7. Missing `app/sitemap.ts` + `app/robots.ts`
App Router supports these as first-class files. Without them, Google crawls based on internal links only and you lose discovery on new products.

**Fix**: create both files. `sitemap.ts` should hit the backend's product/category list and stream URLs. ~1 hr.

#### 8. No tracking integration (GA4 / FB Pixel / Clarity)
Crosscoin reads runtime IDs from `/api/public/tracking-config` so the team can rotate keys without redeploying. Knitwink has nothing.

**Fix**: port `Crosscoin/src/components/common/Analytics.jsx` + `Crosscoin/src/utils/fbqTrack.js` + `gtagTrack.js`. ~1 hr.

---

### 🟡 MEDIUM (do before scaling traffic)

#### 9. RHF + Zod installed but never used
`@hookform/resolvers` and `zod` are in `package.json` but no form uses them. Login / register / address / checkout forms still hand-roll validation.

**Fix**: port `Crosscoin/src/utils/addressSchema.js` and adopt it in the address form. Use `Crosscoin/src/components/common/AddressFormRHF.jsx` as a drop-in. ~1 hr per form.

#### 10. No address quality / COD eligibility check
Backend exposes `POST /api/orders/check-address-quality` — Knitwink doesn't call it. Customers with bad addresses get bounced at order-create time instead of at address-entry time.

**Fix**: wire the call into the address form's `onBlur` of the pincode + phone fields. ~30 min.

#### 11. No `generateMetadata()` on product / collection / journal pages
Currently SEO is set via `SeoWrapper` (client-side `useEffect`). Search engines see the default page title until JS hydrates. For App Router the right place is `export async function generateMetadata({ params })` in each `page.jsx` — that runs on the server.

**Fix**: each dynamic route file gets a `generateMetadata` that fetches `/api/seo?page_name=...` and returns a Next-shaped Metadata object. ~3 hrs across all pages.

#### 12. No React Query / TanStack Query
Client-side fetches happen via raw `apiFetch` in `useEffect`. No caching, no retry, no optimistic updates, no background refetch.

**Fix**: install `@tanstack/react-query` + wrap `<QueryClientProvider>` in `app/layout.jsx`. Migrate one component at a time (start with `wishlist`, `cart`). ~half a day.

#### 13. No skip-to-main link / `.sr-only` utility
Failing axe-core's "page has a skip link" check. Failing focus management on dynamic routes.

**Fix**: add `<a href="#main">Skip to main content</a>` in `app/layout.jsx` and a `.sr-only` utility in `globals.css`. Add `id="main"` to the main wrapper. ~10 min.

#### 14. Default Next.js scaffold README
Current `README.md` is the unchanged `create-next-app` boilerplate. No info on env vars, structure, deployment, scoring.

**Fix**: write a proper README mirroring `Crosscoin/README.md`'s structure (tech stack table, folder layout, key conventions, scoring). ~1 hr.

---

### 🟢 LOW (long-tail polish)

#### 15. No design-system primitives
Each page rolls its own header / panel / stat tile / filter bar. Crosscoin has 6 reusable primitives at `components/Dashboard/primitives/`. Not as critical for a public storefront but pays dividends on the account / admin side.

#### 16. No tests
Zero test files. Crosscoin has 41 (38 smoke + 3 integration). At minimum, add smoke tests for the cart store + address schema.

#### 17. No OpenAPI consumption
Backend exposes `/api/docs` (Swagger UI). Frontend code could auto-type API responses from the spec. Optional but nice.

#### 18. No memo / useCallback on heavy compute
Product / collection list pages haven't been profiled. If perf becomes an issue, audit and add `useMemo` like Crosscoin's `Products.jsx`.

---

## Suggested execution order

| Order | Item | Time | Why first |
|---|---|---|---|
| 1 | DOMPurify sweep + ErrorBoundary + fetch interceptor + focus traps + error reporter | ~3 hrs | Single hardening batch — knocks out 5 HIGH items |
| 2 | `app/sitemap.ts` + `app/robots.ts` + structured data + `generateMetadata` | ~6 hrs | SEO foundation — required before paid ads |
| 3 | Tracking integration (GA4 + FB Pixel) | ~1 hr | Required for ad attribution |
| 4 | Address quality + RHF address form | ~1.5 hrs | Conversion lift + reduces RTO |
| 5 | Skip-to-main + sr-only + README rewrite | ~1.5 hrs | Quick a11y + docs wins |
| 6 | React Query migration | ~half day | Improves perceived performance |
| 7 | Tests + design system | ongoing | Long-term quality |

**Total: ~2-3 dev days** to reach 85+ readiness.

---

## What to copy from Crosscoin (verbatim or near-verbatim)

| Crosscoin file | Drop-in target in Knitwink |
|---|---|
| `Crosscoin/src/utils/sanitizeHtml.js` | `lib/sanitizeHtml.js` |
| `Crosscoin/src/utils/errorReporter.js` | `lib/errorReporter.js` |
| `Crosscoin/src/utils/sentryAdapter.js` | `lib/sentryAdapter.js` |
| `Crosscoin/src/utils/apiInterceptors.js` (logic) | merge into `lib/api/client.js` |
| `Crosscoin/src/utils/addressSchema.js` | `lib/addressSchema.js` |
| `Crosscoin/src/components/common/ErrorBoundary.jsx` | `components/ui/ErrorBoundary.jsx` |
| `Crosscoin/src/components/common/AddressFormRHF.jsx` | `components/account/AddressForm.jsx` |
| `Crosscoin/src/hooks/useFocusTrap.js` | `hooks/useFocusTrap.js` |
| `Crosscoin/src/components/common/Analytics.jsx` | `components/layout/Analytics.jsx` |

---

## Backend env vars to confirm Knitwink uses

Same as Crosscoin (the backend is shared). New env vars to set on the Knitwink deployment:

```bash
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_FRONTEND_URL=https://knitwink.com
NEXT_PUBLIC_SITE_NAME=Knitwink

# Sentry (optional — install @sentry/nextjs to activate)
NEXT_PUBLIC_SENTRY_DSN=

# Revalidate webhook secret (already wired in app/api/revalidate)
REVALIDATE_SECRET=<random-hex>
```

---

## Notes

- **Brand is already set to `knitwink`** in `lib/api/*.js` brand headers.
- **`NEXT_PUBLIC_API_URL`** defaults to `https://api.crosscoin.in` in code — confirm this is intentional or move to a Knitwink-specific subdomain.
- The page count (19 routes) matches Crosscoin's storefront surface, so feature parity work is straightforward.

**Last audited**: this commit. Re-audit after each major Crosscoin hardening pass.
