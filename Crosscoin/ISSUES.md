# Crosscoin Frontend Issues Report

> Scan date: March 15, 2026  
> All issues below cause **Next.js Fast Refresh full reloads** or **build errors**.  
> Each section has a checkbox so you can track what's been fixed.

---

## Issue 1 — Global CSS imported outside `_app.jsx`

Next.js only allows global CSS imports in `pages/_app.jsx`. Importing `.css` files directly in pages or components causes build errors and forces full reloads.

**Fix options (pick one per file):**
- A) Move the import to `_app.jsx` (simplest, keeps existing class names)
- B) Rename to `.module.css` and update all `className="x"` → `className={styles.x}`

---

### Pages (move imports to `_app.jsx`)

| Done | File | CSS files imported |
|------|------|--------------------|
| [x] | `src/pages/home.jsx` | `Footer.css`, `Header.css`, `Testimonials.css`, `TrustBadges.css`, `Home.css` |
| [x] | `src/pages/index.jsx` | `Home.css` |
| [x] | `src/pages/login.jsx` | `Login.css`, `Header.css`, `Footer.css` |
| [x] | `src/pages/profile.jsx` | `Profile.css` |
| [x] | `src/pages/Products.jsx` | `TableControls.css`, `products.css`, `Header.css`, `Footer.css` |
| [x] | `src/pages/ProductDetails.jsx` | `ProductDetails.css`, `Header.css`, `Footer.css` |
| [x] | `src/pages/UnifiedCheckout.jsx` | `UnifiedCheckout.css`, `Header.css`, `Footer.css` |
| [x] | `src/pages/Wishlist.jsx` | `Wishlist.css`, `Header.css`, `Footer.css` |
| [x] | `src/pages/ThankYou.jsx` | `ThankYou.css`, `Header.css`, `Footer.css` |
| [x] | `src/pages/OrderTracking.jsx` | `OrderTracking.css` |
| [x] | `src/pages/SearchResults.jsx` | `SearchResults.css`, `TableControls.css` |
| [x] | `src/pages/policy.jsx` | `Policy.css`, `Header.css`, `Footer.css` |
| [x] | `src/pages/Contact.jsx` | `Contact.css` |
| [x] | `src/pages/auth/adminlogin.jsx` | `adminlogin.css` |
| [x] | `src/pages/dashboard/index.jsx` | `layout.css`, `sidebar.css`, `full-width-fix.css`, `mobile.css` |
| [x] | `src/pages/dashboard/brands.jsx` | `brands.css` |
| [x] | `src/pages/dashboard/brandSettings.jsx` | `brandSettings.css` |
| [x] | `src/pages/dashboard/reviews/reviews.jsx` | `reviews.css` |
| [x] | `src/pages/dashboard/shipping/shippingFees.jsx` | `seo.css` |
| [x] | `src/pages/dashboard/slider/slider.jsx` | `seo.css`, `TableControls.css`, `slider.css` |
| [x] | `src/pages/dashboard/seo/seo.jsx` | `seo.css` |
| [x] | `src/pages/dashboard/products/categories.jsx` | `seo.css` |

---

### Components (move to `_app.jsx` OR convert to CSS Modules)

| Done | File | CSS files imported |
|------|------|--------------------|
| [x] | `src/components/HeroSlider.jsx` | `HeroSlider.css` |
| [x] | `src/components/SlidingCollection.jsx` | `SlidingCollection.css` |
| [x] | `src/components/TrustBadges.jsx` | `TrustBadges.css` |
| [x] | `src/components/UnlockedExclusives.jsx` | `UnlockedExclusives.css` |
| [x] | `src/components/CouponStrip.jsx` | `CouponStrip.css` |
| [x] | `src/components/Skeleton.tsx` | `skeleton.css` |
| [x] | `src/components/ProductListSkeleton.jsx` | `ProductListSkeleton.css` |
| [x] | `src/components/DashboardSkeleton.jsx` | `DashboardSkeleton.css` |
| [x] | `src/components/Sidebar/Sidebar.jsx` | `Sidebar.css` |
| [x] | `src/components/cart/CartDrawer.jsx` | `CartDrawer.css` |
| [x] | `src/components/cart/QuantityOfferBar.jsx` | `QuantityOfferBar.css` |
| [x] | `src/components/Dashboard/Card.jsx` | `Card.css` |
| [x] | `src/components/Dashboard/DashboardHeader.jsx` | `header.css` |
| [x] | `src/components/Dashboard/BrandTags.jsx` | `brandTags.css` |
| [x] | `src/components/Dashboard/BrandAssignment.jsx` | `brandAssignment.css` |
| [x] | `src/components/common/FomoElements.jsx` | `FomoElements.css` |
| [x] | `src/components/common/DonutChart.jsx` | `DonutChart.css` |

---

## Issue 2 — Mixed default + named exports in component/context files

Fast Refresh requires that a file exporting React components **only** exports React components. Mixing a default component export with named non-component exports (or vice versa) forces a full reload.

| Done | File | Problem | Fix |
|------|------|---------|-----|
| [x] | `src/context/AuthContext.jsx` | Exports `{ AuthProvider, useAuth }` (named) AND `export default AuthContext` (default) | Remove `export default AuthContext`. All consumers already use named imports. |

---

## Issue 3 — Module-level singletons / side effects in utility files

These files create class instances or run code at module level. This is fine for pure utility files (they don't export React components so Fast Refresh doesn't apply), but it can cause issues with SSR and hot reload in some cases.

| Done | File | Issue | Notes |
|------|------|-------|-------|
| [x] | `src/services/index.js` | `axios.create()` called at module level | Low risk — non-component file |
| [x] | `src/services/publicApi.js` | `axios.create()` for `offerAPI` at module level + `new CouponIntegrationService()` at bottom | Low risk — non-component file |
| [x] | `src/services/performance-monitor.js` | `new PerformanceMonitor()` singleton exported as default | Fixed: added SSR guard to `startPeriodicFlush()` |
| [x] | `src/services/cacheManager.js` | `new CacheManager()` singleton exported as default | Low risk — non-component file |
| [x] | `src/utils/apiCache.js` | `new ApiCache()` singleton exported as default | Low risk — non-component file |
| [x] | `src/utils/imagePreloader.js` | `new ImagePreloader(3)` singleton + mixed default/named export | Fixed: removed `export { ImagePreloader }` named export |
| [x] | `src/utils/requestDeduplication.js` | `new Map()` at module level + mixed default/named export | Fixed: removed `export default` object |

---

## Priority Order

1. **Issue 1 (CSS imports)** — causes build errors, fix first
2. **Issue 2 (mixed exports in AuthContext)** — directly breaks Fast Refresh
3. **Issue 3 (singletons)** — low risk, fix only if issues persist

---

## Quick Fix for Issue 1

The fastest approach: add all CSS imports to `_app.jsx` instead of touching each file.

```js
// In src/pages/_app.jsx — add these imports
import "../styles/pages/Home.css";
import "../styles/pages/Login.css";
import "../styles/pages/Profile.css";
import "../styles/pages/products.css";
import "../styles/pages/ProductDetails.css";
import "../styles/pages/UnifiedCheckout.css";
import "../styles/pages/Wishlist.css";
import "../styles/pages/ThankYou.css";
import "../styles/pages/OrderTracking.css";
import "../styles/pages/SearchResults.css";
import "../styles/pages/Policy.css";
import "../styles/pages/Contact.css";
import "../styles/pages/auth/adminlogin.css";
import "../styles/components/Header.css";
import "../styles/components/Footer.css";
import "../styles/components/Testimonials.css";
import "../styles/components/TrustBadges.css";
import "../styles/components/HeroSlider.css";
import "../styles/components/SlidingCollection.css";
import "../styles/components/UnlockedExclusives.css";
import "../styles/components/CouponStrip.css";
import "../styles/components/skeleton.css";
import "../styles/common/TableControls.css";
import "../styles/common/FomoElements.css";
import "../styles/common/DonutChart.css";
import "../styles/dashboard/layout.css";
import "../styles/dashboard/sidebar.css";
import "../styles/dashboard/full-width-fix.css";
import "../styles/dashboard/mobile.css";
import "../styles/dashboard/brands.css";
import "../styles/dashboard/brandSettings.css";
import "../styles/dashboard/brandTags.css";
import "../styles/dashboard/brandAssignment.css";
import "../styles/dashboard/reviews.css";
import "../styles/dashboard/seo.css";
import "../styles/dashboard/slider.css";
import "../styles/dashboard/header.css";
import "../styles/dashboard/Card.css";
import "../styles/dashboard/ProductListSkeleton.css";
import "../styles/dashboard/DashboardSkeleton.css";
import "../components/Sidebar/Sidebar.css";
import "../components/cart/CartDrawer.css";
import "../components/cart/QuantityOfferBar.css";
```

Then remove the individual CSS imports from each file listed in Issue 1.

## Quick Fix for Issue 2

```js
// src/context/AuthContext.jsx — remove this line at the bottom:
export default AuthContext;  // ← DELETE THIS LINE
```

All imports of `AuthContext` across the codebase already use named imports (`import { useAuth } from ...`), so nothing else needs to change.
