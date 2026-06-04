# Velquira — Pending Work

Honest gap audit against the **Crosscoin storefront baseline** (92/100 production-ready after the hardening sweep). Velquira shares the same backend (`api.crosscoin.in`) and uses the **same App-Router template as Knitwink** — most of this list mirrors `Knitwink/PENDING.md` line-for-line, with one extra **critical bug** noted below.

> **Current production readiness: ~55 / 100.** Same foundations as Knitwink (App Router, Zustand, RHF + Zod deps), same gaps + one broken import that must be fixed first.

---

## 🔥 Critical bug to fix FIRST (before anything else)

### Broken `js-cookie` import in `lib/api/client.js`
```js
import Cookies from '@/node_modules/@types/js-cookie';
```

That's importing from the **TypeScript types package**, not the actual runtime module. The `Cookies` object will be `undefined`, `Cookies.get('auth_token')` will throw, and **every authenticated API call fails silently**.

**Fix** (15-second edit):
```js
import Cookies from 'js-cookie';
```

This bug will block any login/account/cart/wishlist functionality. Patch it before pushing anything else.

---

## What Velquira ALREADY has ✅

Same scaffold as Knitwink:

| Area | Status |
|---|---|
| Framework | Next.js 16 App Router + React 19 |
| State | Zustand stores (cart / ui / wishlist) |
| Auth | JWT cookie via `js-cookie` (once the import is fixed) |
| Forms | `react-hook-form` + `zod` installed, not yet used |
| API client | `lib/api/client.js` with brand header on every call |
| Toasts | `react-toastify` |
| ISR | `/api/revalidate` endpoint |
| Backend | Reuses `api.crosscoin.in` |
| Pages | 19 routes — home, about, account, cart, collections, contact, journal, login, register, search, track-order, wishlist, products, policies |
| SEO scaffold | `components/SeoWrapper.jsx` (client-side title/meta injection) |

---

## What's MISSING vs Crosscoin baseline

### 🔴 HIGH severity (do before public launch / Google Ads)

#### 1. ~~Broken Cookies import~~ — see top of file

#### 2. DOMPurify sanitisation on every `dangerouslySetInnerHTML`
Currently **4 unsanitised sites**:
- `app/journal/[slug]/page.jsx:199` — blog post body
- `app/policies/[name]/page.jsx:107` — policy content
- `components/ui/SectionHeader.jsx:16` — title (admin-authored)
- `app/layout.jsx:58` — script tag (verify safe / self-generated)

**Fix**: copy `Crosscoin/src/utils/sanitizeHtml.js`. ~1 hr.

#### 3. No global error reporter / ring buffer
No drain for ErrorBoundary catches, no unhandled-rejection listener, no `/api/client-errors` POST.

**Fix**: port `Crosscoin/src/utils/errorReporter.js` + `sentryAdapter.js`. ~30 min.

#### 4. No global fetch interceptor → silent failures + no timeout
`lib/api/client.js` has no timeout, no error toast, no CSRF mirror, no retry. Backend hang = forever spinner.

**Fix**: port the categorised-error-toast + 30s timeout + CSRF cookie-mirror logic from `Crosscoin/src/utils/apiInterceptors.js`. ~45 min.

#### 5. ErrorBoundary missing
Single client-component render bug blanks the whole app.

**Fix**: port `Crosscoin/src/components/common/ErrorBoundary.jsx`, wrap the root `<body>` in `app/layout.jsx`. ~20 min.

#### 6. No focus traps on `<Drawer>` / `<Modal>` / `<CartDrawer>`
Same keyboard / screen-reader trap as Knitwink.

**Fix**: port `Crosscoin/src/hooks/useFocusTrap.js`. ~30 min.

#### 7. No structured data (JSON-LD)
Product / collection / journal pages ship without Product / CollectionPage / BlogPosting / BreadcrumbList JSON-LD.

**Fix**: per-route `<script type="application/ld+json">`. ~2 hrs.

#### 8. Missing `app/sitemap.ts` + `app/robots.ts`
No discovery channel beyond internal links.

**Fix**: create both files. ~1 hr.

#### 9. No tracking integration (GA4 / FB Pixel / Clarity)
No ad attribution.

**Fix**: port `Crosscoin/src/components/common/Analytics.jsx` + `fbqTrack` + `gtagTrack`. ~1 hr.

---

### 🟡 MEDIUM (do before scaling traffic)

#### 10. RHF + Zod installed but never used
**Fix**: port `Crosscoin/src/utils/addressSchema.js` and adopt `Crosscoin/src/components/common/AddressFormRHF.jsx`. ~1 hr per form.

#### 11. No address quality / COD eligibility check
Backend exposes `POST /api/orders/check-address-quality` — Velquira doesn't call it.

**Fix**: wire into pincode + phone `onBlur`. ~30 min.

#### 12. No `generateMetadata()` on dynamic pages
Same App-Router issue as Knitwink — SEO injection happens client-side via `useEffect`.

**Fix**: each dynamic route file gets a `generateMetadata`. ~3 hrs total.

#### 13. No React Query
Same gap as Knitwink — raw `useEffect` + `apiFetch` everywhere.

**Fix**: install `@tanstack/react-query`, migrate incrementally. ~half a day.

#### 14. No skip-to-main link / `.sr-only` utility
**Fix**: ~10 min.

#### 15. Default README
`README.md` is the unchanged scaffold.

**Fix**: write a proper README. ~1 hr.

---

### 🟢 LOW (long-tail polish)

#### 16. No design-system primitives
#### 17. No tests
#### 18. No OpenAPI consumption
#### 19. No memo / useCallback on heavy compute pages

---

## Suggested execution order

| Order | Item | Time |
|---|---|---|
| 0 | **Fix `js-cookie` import** | 1 min |
| 1 | DOMPurify + ErrorBoundary + fetch interceptor + focus traps + error reporter | ~3 hrs |
| 2 | sitemap + robots + JSON-LD + `generateMetadata` | ~6 hrs |
| 3 | Tracking (GA4 + FB Pixel) | ~1 hr |
| 4 | Address quality + RHF form | ~1.5 hrs |
| 5 | Skip-to-main + sr-only + README | ~1.5 hrs |
| 6 | React Query migration | ~half day |
| 7 | Tests + design system | ongoing |

**Total: ~2-3 dev days** to reach 85+ readiness (same budget as Knitwink because the gaps are identical).

---

## Velquira-specific quirks

- Runs on **port 3001** (`next dev -p 3001`) — keep this in mind when running both Knitwink and Velquira locally.
- Brand is set to `velquira` in `lib/api/*.js` brand headers (verify).
- Other than the Cookies-import bug, this is a **fork of the Knitwink template** — patches written for Knitwink will mostly apply verbatim.

---

## What to copy from Crosscoin

Same drop-in table as Knitwink — see `Knitwink/PENDING.md` for the full mapping.

---

**Last audited**: this commit. Re-audit after each major Crosscoin hardening pass.
