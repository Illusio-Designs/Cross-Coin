# CrossCoin Frontend — Technical Documentation

## Overview

Next.js (Pages Router) storefront for the CrossCoin e-commerce platform. Handles product browsing, cart, checkout, payments, user accounts, order tracking, and an admin dashboard.

- **Framework:** Next.js 15 (Pages Router)
- **React:** 19
- **Language:** JSX + TypeScript (mixed, mostly JSX)
- **Styling:** Tailwind CSS + custom CSS modules
- **State:** React Context (Auth, Cart, Wishlist) + React Query (server state)
- **HTTP:** Axios
- **Data Fetching:** @tanstack/react-query v5
- **Payments:** Razorpay Web SDK
- **Analytics:** Facebook Pixel + Google Analytics 4 + Vercel Analytics
- **Deployment:** Custom Node.js server (`server.js`) with compression
- **Entry point:** `pages/_app.jsx`

---

## Architecture

```
app/                   — App Router (new pages go here)
  layout.jsx           — Root layout: HTML, metadata, global CSS
  providers.jsx        — Client providers (Auth, Cart, Wishlist, Toast, CartDrawer)
  not-found.jsx        — App Router 404 page
  (storefront)/        — Route group: public pages with Header + Footer
    layout.jsx         — Storefront layout (providers + shell)
    StorefrontShell.jsx — Client component: Header + main + Footer
    about/page.jsx     — About page (App Router)
    contact/page.jsx   — Contact page (App Router)
pages/                 — Pages Router (existing pages, migrated gradually)
  _app.jsx             — Root layout: providers, header, footer, cart drawer
  _document.jsx        — Custom HTML document
  dashboard/           — Admin panel (stays in Pages Router)
  auth/                — Admin login (stays in Pages Router)
components/
  layout/             — Header, Footer
  cart/               — CartDrawer (checkout lives here)
  products/           — ProductCard, HeroSlider, SlidingCollection, filters
  common/             — Shared UI: Analytics, Breadcrumb, Loader, SafeImage, etc.
  Dashboard/          — Admin dashboard components
  Sidebar/            — Admin sidebar navigation
  ui/                 — Reusable UI primitives
  blog/               — Blog components
  checkout/           — (empty — checkout is inside CartDrawer)
context/
  AuthContext.jsx      — Auth state, login/logout, role checks
  CartContext.jsx      — Cart state, add/remove/update, guest ↔ auth sync
  WishlistContext.jsx  — Wishlist state
lib/
  queryClient.js       — React Query client, default options, query key factory
services/
  publicApi.js         — Barrel re-export (backward compat for all existing imports)
  api/
    config.js          — Shared axios config, API_URL, brand header
    userApi.js         — Auth, profile, account management
    cartApi.js         — Cart + wishlist CRUD
    orderApi.js        — Order creation, tracking, cancellation
    paymentApi.js      — Razorpay, checkout, OTP, shipping fees
    productApi.js      — Products, categories, reviews, SEO, blogs, addresses
    couponApi.js       — Coupon integration service, offer API
  cacheManager.js      — (deleted — replaced by React Query)
  index.js             — Legacy service exports
hooks/                 — useFormInput, usePagination, useNotifications
  queries/             — React Query hooks (useProducts, useDashboard, useAdmin)
utils/                 — fbqTrack, gtagTrack, toast, image helpers, UTM tracker
config/                — API timeouts, badge config
styles/                — CSS files (pages, components, dashboard)
```

### Provider Hierarchy

```
App
  └─ QueryClientProvider (React Query)
       └─ AuthProvider
            └─ CartProvider
                 └─ WishlistProvider
                      └─ BreadcrumbProvider
                           └─ AppContent (Header + Page + Footer + CartDrawer)
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `https://api.crosscoin.in`) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay publishable key |
| `NEXT_PUBLIC_PREPAID_INSTANT_DISCOUNT_INR` | Prepaid discount amount (default `50`) |
| `NEXT_PUBLIC_PREPAID_NUDGE_TEXT` | Prepaid nudge banner text |
| `NEXT_PUBLIC_OTP_VERIFY_SKIP` | Skip OTP in dev (`true`/`false`) |

> **Tracking IDs (FB Pixel, GA4 Measurement ID, Microsoft Clarity) are no
> longer read from `NEXT_PUBLIC_*` env vars.** They live in the database as
> brand settings (`FB_PIXEL_ID`, `GA_MEASUREMENT_ID`, `CLARITY_ID`) and are
> fetched by the public site at runtime via `GET /api/public/tracking-config`,
> so the admin can change them in the dashboard without a redeploy.

---

## Auth System

`context/AuthContext.jsx`

- JWT stored in `localStorage` under key `token`
- On mount: checks token → calls `GET /api/users/me` → sets user state
- Listens to `storage` event for cross-tab sync and guest-checkout auto-login
- Roles: `admin`, `product_manager`, `order_manager`, `whatsapp_manager`, `consumer`
- `ROLE_VIEWS` map controls which dashboard sections each role can access
- `isStaff` / `isAdmin` / `canAccessView()` helpers exposed via context

### Login Flows

| Flow | Endpoint | Notes |
|---|---|---|
| Consumer login | `POST /api/users/login` | OTP-based phone login |
| Admin login | `POST /api/users/admin-login` | Email + password, staff roles only |
| Guest checkout | `POST /api/orders/guest-checkout` | Auto-creates user, returns `X-Auth-Token` |
| Register | `POST /api/users/register` | Email + password |

---

## Cart System

`context/CartContext.jsx`

### State

- `cartItems` — array of cart items (product, variation, quantity, price, images)
- `cartCount` — total item count
- `isDrawerOpen` — cart drawer visibility
- `buyNowItem` — single item for "Buy Now" flow (bypasses cart)
- `lastAddedItem` — triggers drawer open animation

### Guest vs Authenticated

| State | Storage | Sync |
|---|---|---|
| Guest | `localStorage` key `cartItems` | Local only |
| Authenticated | Backend `GET /api/cart` | API calls |
| Login transition | Merge localStorage → backend | Sequential `addToCart` calls, then clear localStorage |

### API Calls

| Action | Endpoint |
|---|---|
| Get cart | `GET /api/cart` |
| Add item | `POST /api/cart/items` |
| Update qty | `PUT /api/cart/items/:productId` |
| Remove item | `DELETE /api/cart/items/:productId/:variationId` |
| Clear cart | `DELETE /api/cart` |

---

## Checkout Flow

All checkout UI lives in `components/cart/CartDrawer.jsx` — a slide-out drawer that handles the entire purchase flow in a single view.

### Checkout Steps (Single View)

1. Cart items review (edit qty, remove)
2. Shipping address selection / creation
3. Pincode serviceability check (`GET /api/serviceability/:pincode`)
4. Delivery method: Prepaid or COD
5. Coupon application
6. Order summary with price breakdown
7. Payment / Place Order

### Prepaid Flow (Payment-First)

```
User clicks "Pay Now"
  │
  ├─ 1. Load Razorpay SDK (script tag)
  ├─ 2. POST /api/checkout/initiate
  │      → Validates items + stock
  │      → Reserves stock in Redis (10 min)
  │      → Creates Razorpay order
  │      → Returns { razorpay_order, reservation_id }
  │
  ├─ 3. Open Razorpay checkout modal
  │
  ├─── Payment SUCCESS ─────────────────────┐
  │    POST /api/payments/razorpay/verify    │
  │    → Verifies signature                  │
  │    → Creates order + deducts stock       │
  │    → Returns { order }                   │
  │    → Clear cart, show success            │
  │                                          │
  ├─── Payment FAILED ──────────────────────┐
  │    Show retry UI (up to 3 attempts)      │
  │    POST /api/checkout/retry              │
  │    → Gets new Razorpay order             │
  │    → Extends stock reservation           │
  │    → Open Razorpay again                 │
  │                                          │
  ├─── Payment CANCELLED ───────────────────┐
  │    Show retry UI                         │
  │    Stock reservation auto-expires (10m)  │
  │                                          │
  └──────────────────────────────────────────┘
```

### COD Flow

```
User clicks "Place Order (COD)"
  │
  ├─ 1. OTP verification (WhatsApp)
  │      POST /api/auth/otp/send
  │      POST /api/auth/otp/verify
  │
  ├─ 2. POST /api/orders (authenticated)
  │      or POST /api/orders/guest-checkout (guest)
  │      → Creates order directly
  │      → status: awaiting_confirmation
  │
  ├─ 3. Clear cart, show success
  └─ 4. Facebook Purchase + GA4 events
```

### Payment Retry

- Up to 3 retries allowed
- Calls `POST /api/checkout/retry` with `reservation_id`
- Backend creates a fresh Razorpay order and extends the stock reservation
- If session expired → shows "start a new order" message
- Cancel button fires `POST /api/payments/failed` (fire-and-forget) and resets state

### Guest Checkout

- Guest provides: phone, email, firstName, lastName
- Calls `POST /api/checkout/guest/initiate` (prepaid) or `POST /api/orders/guest-checkout` (COD)
- Backend auto-creates a user account
- Response includes `X-Auth-Token` → stored in localStorage → user is now logged in

---

## API Service Layer

`services/publicApi.js` — barrel re-export file that re-exports from domain-specific modules.

### Module Structure

```
services/
  publicApi.js              — barrel re-export (all existing imports work unchanged)
  api/
    config.js               — shared axios config, API_URL, BRAND_NAME, addBrandHeader
    userApi.js              — auth, profile, account management
    cartApi.js              — cart + wishlist CRUD
    orderApi.js             — order creation, tracking, cancellation, returns
    paymentApi.js           — Razorpay, checkout initiate/retry, OTP, shipping fees
    productApi.js           — products, categories, sliders, reviews, SEO, blogs, addresses
    couponApi.js            — CouponIntegrationService, offerAPIService
```

New code should import directly from the domain file:
```js
import { createOrder } from '../services/api/orderApi';
import { initiateCheckout } from '../services/api/paymentApi';
```

Existing code continues to work via the barrel:
```js
import { createOrder, getCart } from '../services/publicApi';
```

### api/userApi.js — Auth & Profile

| Function | Endpoint | Purpose |
|---|---|---|
| `registerUser()` | `POST /api/users/register` | Create consumer account |
| `loginUser()` | `POST /api/users/login` | OTP phone login |
| `forgotPassword()` | `POST /api/users/forgot-password` | Request password reset |
| `resetPassword()` | `POST /api/users/reset-password` | Reset password |
| `getCurrentUser()` | `GET /api/users/me` | Get current user profile |
| `updateUserProfile()` | `PUT /api/users/update` | Update profile (supports FormData) |
| `updateUserPassword()` | `PUT /api/users/update-password` | Change password |
| `logout()` | `POST /api/users/logout` | Invalidate token |
| `deleteAccount()` | `DELETE /api/users/delete` | Soft delete account |

### api/cartApi.js — Cart & Wishlist

| Function | Endpoint | Purpose |
|---|---|---|
| `getCart()` | `GET /api/cart` | Fetch cart items |
| `addToCart()` | `POST /api/cart/items` | Add item to cart |
| `updateCartItem()` | `PUT /api/cart/items/:productId` | Update quantity |
| `removeFromCart()` | `DELETE /api/cart/items/:productId/:variationId` | Remove item |
| `clearCart()` | `DELETE /api/cart` | Clear entire cart |
| `getWishlist()` | `GET /api/wishlist` | Fetch wishlist |
| `addToWishlist()` | `POST /api/wishlist/:productId` | Add to wishlist |
| `removeFromWishlist()` | `DELETE /api/wishlist/:productId` | Remove from wishlist |
| `clearWishlist()` | `DELETE /api/wishlist` | Clear wishlist |

### api/orderApi.js — Orders

| Function | Endpoint | Purpose |
|---|---|---|
| `createOrder()` | `POST /api/orders` | COD order (authenticated) |
| `createGuestOrder()` | `POST /api/orders/guest-checkout` | COD order (guest, auto-creates user) |
| `getUserOrders()` | `GET /api/orders/my-orders` | Order history with pagination |
| `trackOrderByOrderNumber()` | `GET /api/orders/track/:number` | Track by order number |
| `trackOrderByAWB()` | `GET /api/orders/track/awb` | Track by AWB |
| `cancelOrder()` | `PUT /api/orders/:id/cancel` | Cancel order |
| `initiateReturn()` | `POST /api/orders/:id/return` | Initiate return |

### api/paymentApi.js — Payments & Checkout

| Function | Endpoint | Purpose |
|---|---|---|
| `initiateCheckout()` | `POST /api/checkout/initiate` | Reserve stock + create Razorpay order (prepaid) |
| `initiateGuestCheckout()` | `POST /api/checkout/guest/initiate` | Guest prepaid checkout |
| `retryCheckout()` | `POST /api/checkout/retry` | Retry failed payment (reuse reservation) |
| `createRazorpayOrder()` | `POST /api/payments/razorpay/order` | Legacy Razorpay order creation |
| `updateOrderPayment()` | `POST /api/payments/razorpay/verify` | Verify payment + create order |
| `sendCheckoutPhoneOtp()` | `POST /api/auth/otp/send` | COD OTP send |
| `verifyCheckoutPhoneOtp()` | `POST /api/auth/otp/verify` | COD OTP verify |
| `getShippingFees()` | `GET /api/shipping-fees` | Shipping fee config |
| `checkPincodeServiceability()` | `GET /api/serviceability/:pincode` | Delivery check |

### api/productApi.js — Products, Content & Addresses

| Function | Endpoint | Purpose |
|---|---|---|
| `getAllPublicProducts()` | `GET /api/products/catalog` | Product listing (cached) |
| `getPublicProductBySlug()` | `GET /api/products/by-slug/:slug` | Single product |
| `searchProducts()` | `GET /api/products/search` | Search with filters |
| `getPublicCategories()` | `GET /api/categories/listing` | Category list (cached) |
| `getPublicCategoryByName()` | `GET /api/categories/by-name/:name` | Single category |
| `getPublicSliders()` | `GET /api/sliders/listing` | Hero banners (cached) |
| `getPublicCoupons()` | `GET /api/coupons/listing` | Active coupons |
| `validateCoupon()` | `POST /api/coupons/validate` | Validate coupon code |
| `getPublicProductReviews()` | `GET /api/reviews/product/:id` | Product reviews |
| `createPublicReview()` | `POST /api/reviews/submit` | Submit review (multipart) |
| `getAllPublicReviews()` | `GET /api/reviews/all` | All reviews |
| `getSeoByPageName()` | `GET /api/seo` | SEO metadata (cached) |
| `getPublicPolicyByName()` | `GET /api/policies/name/:name` | Policy page content |
| `getPublicLookbooks()` | `GET /api/lookbooks` | Lookbook list |
| `getPublicLookbookBySlug()` | `GET /api/lookbooks/:slug` | Single lookbook |
| `getPublicReels()` | `GET /api/reels` | Video reels |
| `incrementReelView()` | `POST /api/reels/:id/view` | Track reel view |
| `getInstagramFeed()` | `GET /api/instagram/feed` | Instagram feed |
| `getPublicBlogs()` | `GET /api/blogs/listing` | Blog listing |
| `getPublicBlogBySlug()` | `GET /api/blogs/by-slug/:slug` | Single blog post |
| `getPublicBlogTags()` | `GET /api/blogs/tags` | Blog tags |
| `getUserShippingAddresses()` | `GET /api/shipping-addresses` | User addresses (cached) |
| `createShippingAddress()` | `POST /api/shipping-addresses` | Create address |
| `updateShippingAddress()` | `PUT /api/shipping-addresses/:id` | Update address |
| `deleteShippingAddress()` | `DELETE /api/shipping-addresses/:id` | Delete address |
| `setDefaultShippingAddress()` | `PUT /api/shipping-addresses/:id/default` | Set default |
| `createGuestShippingAddress()` | `POST /api/shipping-addresses/guest` | Guest address |
| `getGuestShippingAddresses()` | `GET /api/shipping-addresses/guest` | Guest addresses |

### api/couponApi.js — Coupon Integration

| Export | Purpose |
|---|---|
| `CouponIntegrationService` | Class: quantity-based coupon logic, tier matching, offer display |
| `couponIntegrationService` | Singleton instance |
| `offerAPIService` | Upsell recommendations, free shipping threshold, prepaid incentives, admin offer CRUD |

### Request Headers

All requests include `X-Brand-Name: crosscoin`. Authenticated requests add `Authorization: Bearer {token}`.

### Timeout Config

`config/apiConfig.js` defines per-endpoint timeouts:

| Type | Timeout | Endpoints |
|---|---|---|
| Quick | 10s | Search, products, categories |
| Default | 15s | Most API calls |
| Long-running | 30s | Checkout, payments, FShip sync |
| File ops | 60s | Uploads, downloads, labels |

---

## Pages

### Public Pages

| Page | Route | Component | Description |
|---|---|---|---|
| Home | `/` | `index.jsx` → `home.jsx` | Hero slider, collections, reviews, Instagram |
| Products | `/Products` | `Products.jsx` | Product listing with filters |
| Product Detail | `/ProductDetails?slug=x` | `ProductDetails.jsx` | Single product with variations |
| Collections | `/Collections` | `Collections.jsx` | Category-based collections |
| Search | `/SearchResults?q=x` | `SearchResults.jsx` | Search results |
| Order Tracking | `/OrderTracking` | `OrderTracking.jsx` | Track by order number or AWB |
| Thank You | `/ThankYou?order_number=x` | `ThankYou.jsx` | Post-purchase confirmation |
| Blog | `/blog` | `blog.jsx` | Blog listing |
| Blog Detail | `/blog-details?slug=x` | `blog-details.jsx` | Single blog post |
| About | `/About` | `About.jsx` | About page |
| Contact | `/Contact` | `Contact.jsx` | Contact page |
| Policy | `/policy?name=x` | `policy.jsx` | Privacy, terms, shipping, refund |
| Wishlist | `/Wishlist` | `Wishlist.jsx` | User wishlist |
| Profile | `/profile` | `profile.jsx` | User profile + order history |
| Login | `/login` | `login.jsx` | Consumer login |
| Register | `/register` | `register.jsx` | Consumer registration |
| Sitemap | `/sitemap` | `sitemap.jsx` | HTML sitemap |
| 404 | `/*` | `404.jsx` | Not found |

### Admin Dashboard

| Page | Route | Description |
|---|---|---|
| Dashboard Home | `/dashboard` | Stats, charts, recent orders |
| Orders | `/dashboard/orders` | Order management, FShip sync, labels |
| Payments | `/dashboard/payments` | Payment records, refunds |
| Products | `/dashboard/products` | CRUD, variations, images, SEO |
| Consumers | `/dashboard/consumers` | User management |
| Coupons | `/dashboard/coupon` | Coupon CRUD |
| Reviews | `/dashboard/reviews` | Review moderation |
| Shipping | `/dashboard/shipping` | Shipping fee config |
| Slider | `/dashboard/slider` | Hero banner management |
| SEO | `/dashboard/seo` | SEO metadata management |
| Blogs | `/dashboard/blogs` | Blog CRUD |
| Brands | `/dashboard/brands` | Brand management |
| Brand Settings | `/dashboard/brandSettings` | Per-brand config |
| Policies | `/dashboard/policies` | Policy page editor |
| Analytics | `/dashboard/analytics` | UTM + conversion analytics |
| Social | `/dashboard/social` | Lookbooks, Reels, Instagram |
| WhatsApp | `/dashboard/whatsapp` | WhatsApp CRM |
| Staff Users | `/dashboard/staff-users` | Staff account management |
| Media | `/dashboard/media` | Media gallery |

Dashboard access is role-gated via `AuthContext.canAccessView()`.

---

## Components

### Layout

| Component | File | Purpose |
|---|---|---|
| Header | `layout/Header.jsx` | Navigation, search, cart icon, auth links |
| Footer | `layout/Footer.jsx` | Footer links, social, newsletter |
| Breadcrumb | `common/Breadcrumb.jsx` | Auto-generated breadcrumbs |

### Cart & Checkout

| Component | File | Purpose |
|---|---|---|
| CartDrawer | `cart/CartDrawer.jsx` | Full checkout flow in a slide-out drawer |

CartDrawer is the single most complex component (~1100 lines). It handles:
- Cart item display with qty controls
- Address selection/creation
- Pincode serviceability check
- COD vs Prepaid selection
- Coupon application
- Price breakdown (subtotal, discount, shipping, total)
- Razorpay payment integration
- OTP verification for COD
- Payment retry (up to 3 attempts)
- Order success / failure states
- Guest checkout info collection

### Products

| Component | File | Purpose |
|---|---|---|
| ProductCard | `products/ProductCard.jsx` | Product grid card with image, price, add-to-cart |
| HeroSlider | `products/HeroSlider.jsx` | Homepage hero banner carousel |
| SlidingCollection | `products/SlidingCollection.jsx` | Horizontal product scroll |
| ProductFilterDrawer | `products/ProductFilterDrawer.jsx` | Filter sidebar (category, price, size) |
| SizeChartModal | `products/SizeChartModal.jsx` | Size guide popup |
| FomoBar | `products/FomoBar.jsx` | "X people viewing" urgency bar |
| AttributeSelector | `products/AttributeSelector.jsx` | Size/color picker |

### Common

| Component | File | Purpose |
|---|---|---|
| SafeImage | `common/SafeImage.jsx` | Image with fallback + lazy loading |
| Loader | `common/Loader.jsx` | Full-page loading spinner |
| Analytics | `common/Analytics.jsx` | Facebook Pixel + GA4 script injection |
| UTMTracker | `common/UTMTracker.jsx` | UTM parameter capture to localStorage |
| WhatsAppChat | `common/WhatsAppChat.jsx` | Floating WhatsApp button |
| PhonePopupModal | `common/PhonePopupModal.jsx` | Lead capture popup |
| Testimonials | `common/Testimonials.jsx` | Review carousel |
| TrustBadges | `common/TrustBadges.jsx` | Trust icons strip |
| CouponStrip | `common/CouponStrip.jsx` | Announcement bar |
| InstagramGallery | `common/InstagramGallery.jsx` | Instagram feed grid |
| LookbookShowcase | `common/LookbookShowcase.jsx` | Shoppable lookbook |
| ReelsShowcase | `common/ReelsShowcase.jsx` | Video reels section |
| FomoElements | `common/FomoElements.jsx` | Social proof notifications |

---

## Analytics

### Facebook Pixel

`utils/fbqTrack.js` — client-side pixel events via `window.fbq()`.

Events fired:
- `PageView` — on every page load (via Analytics component)
- `ViewContent` — product detail page
- `AddToCart` — add to cart
- `InitiateCheckout` — checkout started (server-side via backend)
- `AddPaymentInfo` — payment method selected (server-side)
- `Purchase` — order completed (server-side + client-side dedup via `eventID`)

### Google Analytics 4

`utils/gtagTrack.js` — client-side events via `window.gtag()`.

Skips tracking on `/dashboard` and `/auth` routes.

### UTM Tracking

`components/common/UTMTracker.jsx` — captures UTM params from URL on page load, stores in localStorage as `utm_session_id`. Sent with order creation for attribution.

---

## Caching & Server State (React Query)

All server-state caching is handled by `@tanstack/react-query`. The custom `cacheManager`, `apiCache`, and `requestDeduplication` utilities have been removed.

### Configuration

`lib/queryClient.js` — singleton `QueryClient` with defaults:

| Setting | Value | Purpose |
|---|---|---|
| `staleTime` | 5 min | Data considered fresh for 5 minutes |
| `gcTime` | 30 min | Unused cache entries garbage-collected after 30 min |
| `retry` | 1 | One automatic retry on failure |
| `refetchOnWindowFocus` | false | No refetch when tab regains focus |

### Query Key Factory

Centralised in `lib/queryClient.js` → `queryKeys` object. Ensures consistent keys and easy invalidation.

### React Query Hooks

Located in `hooks/queries/`:

| Hook | File | staleTime | Purpose |
|---|---|---|---|
| `useCategories()` | `useProducts.js` | 1 hour | Public category list |
| `usePublicProducts(params)` | `useProducts.js` | 30 min | Product catalog |
| `useCategoryProducts(name)` | `useProducts.js` | 30 min | Products by category |
| `useSliders()` | `useProducts.js` | 10 min | Hero banners |
| `useSeo(pageName)` | `useProducts.js` | 1 hour | SEO metadata |
| `useDashboardStats()` | `useDashboard.js` | 5 min | Admin dashboard stats |
| `useShippingFees()` | `useAdmin.js` | 30 min | Shipping fee list |
| `useAdminCategories()` | `useAdmin.js` | 5 min | Admin category list |
| `useAdminCoupons()` | `useAdmin.js` | 30 min | Admin coupon list |

Mutation hooks (`useCreateShippingFee`, `useDeleteCoupon`, etc.) auto-invalidate related queries on success.

### How It Replaces the Old System

| Old pattern | New pattern |
|---|---|
| `getCachedData(key, ttl)` / `setCachedData(key, data)` | `useQuery({ queryKey, queryFn, staleTime })` |
| `cacheManager.getByType('products')` / `.setByType(...)` | `useQuery` with appropriate `staleTime` |
| `deduplicateRequest(key, fn)` | React Query deduplicates identical queries automatically |
| `clearCache('coupons_all')` after mutation | `queryClient.invalidateQueries({ queryKey })` in `onSuccess` |
| Manual `localStorage` TTL tracking | In-memory cache managed by React Query |

---

## Image Handling

Multiple utilities for image optimization:

| Utility | Purpose |
|---|---|
| `imageHandler.js` | Image URL resolution + fallbacks |
| `imageOptimization.js` | Responsive image sizing |
| `imagePreloader.js` | Preload critical images |
| `imageUtils.js` | General image helpers |
| `productImageSelector.js` | Select correct image for variation/color |

Images served from ImageKit CDN (`ik.imagekit.io`). Next.js Image component used with remote patterns configured.

---

## Styling

- Tailwind CSS for utility classes
- Custom CSS files per component/page in `styles/`
- Dashboard has its own CSS namespace (`styles/dashboard/`)
- Responsive breakpoints in `styles/common/responsive.css`
- Mobile utilities in `styles/common/mobile-utilities.css`
- Critical CSS inlined in `styles/common/critical.css`

---

## Performance

- Next.js automatic code splitting per page
- Image optimization via Next.js Image + ImageKit CDN
- Static asset caching: 1 year for images, immutable for `_next/static`
- Compression enabled via custom `server.js`
- `removeConsole` in production builds
- Vercel Speed Insights + Analytics integrated
- React Query handles request deduplication, background refetching, and stale-while-revalidate
- Request deduplication in CartContext (prevents duplicate API calls)
- Bundle analyzer available via `npm run analyze`

---

## Security

- JWT tokens in localStorage (not cookies — CSRF not applicable)
- `X-Brand-Name` header on all requests (multi-brand support)
- Rate limiting handled server-side (strict on checkout/payment routes)
- DOMPurify for HTML sanitization (blog content)
- No sensitive data in client-side code
- Razorpay key is publishable (safe to expose)
- OTP verification for COD orders (prevents fraud)

---

## Key Patterns

### Idempotency

- `generateIdempotencyKey()` creates unique keys per checkout attempt
- Sent in `idempotency_key` field to prevent duplicate orders on retry/double-click
- Backend returns existing order if key matches

### Guest Session

- `getOrCreateGuestSessionId()` creates a cookie-backed UUID (30-day expiry)
- Used for UTM attribution and guest cart tracking

### Error Handling

- Toast notifications via `react-toastify` (1.5s auto-close, max 3 visible)
- Payment failures show inline retry UI (not just a toast)
- Network errors show user-friendly messages via `apiConfig.handleTimeoutError()`

### Scroll Progress

- Reading progress bar at top of page
- Throttled via `requestAnimationFrame`


---

## App Router Migration Status

Next.js supports both `/pages` and `/app` directories running side by side. Migration is gradual — new pages go in `/app`, existing pages stay in `/pages` until migrated.

### Directory Structure

```
src/
  app/                          — App Router (new)
    layout.jsx                  — Root: <html>, metadata, global CSS (Server Component)
    providers.jsx               — Client providers: Auth, Cart, Wishlist, Toast, CartDrawer
    not-found.jsx               — 404 page
    (storefront)/               — Route group for public pages
      layout.jsx                — Wraps with providers + storefront shell
      StorefrontShell.jsx       — Client: Header + <main> + Footer
      about/page.jsx            — /about
      contact/page.jsx          — /contact
  pages/                        — Pages Router (existing, being migrated)
    _app.jsx                    — Legacy root layout (still active for /pages routes)
    _document.jsx               — Legacy HTML document
    ... all other pages
```

### Migration Phases

| Phase | Pages | Status |
|---|---|---|
| 1. Foundation | Root layout, providers, storefront shell | Done |
| 2. Static pages | About, Contact, 404 | Done |
| 3. Content pages | Blog, Policy, Collections, Sitemap | Pending |
| 4. Product pages | Products listing, ProductDetails, Search | Pending |
| 5. User pages | Profile, Wishlist, Login, Register, OrderTracking, ThankYou | Pending |
| 6. Home page | Home (complex: slider, collections, reviews) | Pending |
| 7. Dashboard | Admin panel (30+ sub-pages) | Last |

### How It Works

- App Router pages at `/app/(storefront)/about/page.jsx` serve `/about`
- Pages Router pages at `/pages/About.jsx` serve `/About`
- Next.js gives priority to App Router when both exist for the same route
- Old Pages Router pages continue to work until explicitly removed
- Both share the same components, services, contexts, and styles

### Key Differences (Pages Router → App Router)

| Feature | Pages Router | App Router |
|---|---|---|
| Layout | `_app.jsx` wraps all pages | `layout.jsx` per route segment |
| Metadata | `<Head>` component | `export const metadata` (Server Component) |
| Data fetching | `getServerSideProps` / `getStaticProps` | `async` Server Components / `fetch()` |
| Loading UI | Manual | `loading.jsx` per route |
| Error handling | `_error.jsx` | `error.jsx` per route |
| 404 | `404.jsx` | `not-found.jsx` |
| Streaming | Not supported | Supported via Suspense |
| Server Components | Not supported | Default (opt-in `'use client'`) |

### Migration Rules

1. New pages always go in `/app`
2. When migrating a page, create it in `/app` then delete from `/pages`
3. Dashboard stays in `/pages` until all public pages are migrated
4. Shared components don't need changes — they work in both routers
5. `SeoWrapper` is replaced by `export const metadata` in App Router pages
6. `useRouter` from `next/router` → `next/navigation` in App Router
