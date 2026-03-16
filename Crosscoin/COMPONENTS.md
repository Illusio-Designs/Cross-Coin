# Crosscoin — Component Reference & Optimization Guide

---

## Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `pages/home.jsx` | Landing page — hero slider, collections, products, reviews |
| Index | `pages/index.jsx` | Entry point / redirect |
| Products | `pages/Products.jsx` | Product listing with filters |
| Product Details | `pages/ProductDetails.jsx` | Single product view with variations |
| Collections | `pages/Collections.jsx` | Category/collection browser |
| Search Results | `pages/SearchResults.jsx` | Search query results |
| Unified Checkout | `pages/UnifiedCheckout.jsx` | Full checkout flow (address + payment) |
| Wishlist | `pages/Wishlist.jsx` | Saved wishlist items |
| Order Tracking | `pages/OrderTracking.jsx` | Track order by number/AWB |
| Thank You | `pages/ThankYou.jsx` | Post-order confirmation |
| Profile | `pages/profile.jsx` | User account & order history |
| About | `pages/About.jsx` | Brand about page |
| Contact | `pages/Contact.jsx` | Contact form |
| Policy | `pages/policy.jsx` | Privacy/return/shipping policies |
| Login | `pages/login.jsx` | User login |
| Register | `pages/register.jsx` | User registration |
| Admin Login | `pages/auth/adminlogin.jsx` | Admin authentication |
| Forgot Password | `pages/auth/forgot-password.jsx` | Password reset |

### Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard Index | `pages/dashboard/index.jsx` | Admin overview |
| Orders | `pages/dashboard/orders/orders.jsx` | Order management |
| Order Status | `pages/dashboard/orders/orderStatus.jsx` | Status update |
| Products | `pages/dashboard/products/products.jsx` | Product CRUD |
| Categories | `pages/dashboard/products/categories.jsx` | Category management |
| Attributes | `pages/dashboard/products/attributes.jsx` | Product attributes |
| Payments | `pages/dashboard/payments/payments.jsx` | Payment records |
| Consumers | `pages/dashboard/consumers/consumers.jsx` | Customer list |
| Coupons | `pages/dashboard/coupon/coupons.jsx` | Coupon management |
| Reviews | `pages/dashboard/reviews/reviews.jsx` | Review moderation |
| Shipping Fees | `pages/dashboard/shipping/shippingFees.jsx` | Shipping config |
| Slider | `pages/dashboard/slider/slider.jsx` | Hero slider management |
| SEO | `pages/dashboard/seo/seo.jsx` | SEO metadata |
| Brands | `pages/dashboard/brands.jsx` | Brand management |
| Brand Settings | `pages/dashboard/brandSettings.jsx` | Brand config |
| Policies | `pages/dashboard/policies.jsx` | Policy editor |
| Media Gallery | `pages/dashboard/media/gallery.jsx` | Image gallery |
| UTM Analytics | `pages/dashboard/analytics/utmAnalytics.jsx` | UTM tracking |

---

## Components

### Root Components (`components/`)

| Component | File | Description |
|-----------|------|-------------|
| Header | `Header.jsx` | Sticky nav, search, cart/wishlist icons, mobile menu |
| Footer | `Footer.jsx` | Site footer with links |
| ProductCard | `ProductCard.jsx` | Product tile with hover image, wishlist, badge |
| HeroSlider | `HeroSlider.jsx` | Auto-advancing banner slider |
| HeroSliderSkeleton | `HeroSliderSkeleton.jsx` | Skeleton for hero slider |
| SlidingCollection | `SlidingCollection.jsx` | 3D carousel for collections |
| InfiniteReviewsSlider | `InfiniteReviewsSlider.jsx` | Auto-scrolling reviews strip |
| Testimonials | `Testimonials.jsx` | Static testimonials section |
| TrustBadges | `TrustBadges.jsx` | Trust/security badges row |
| CouponStrip | `CouponStrip.jsx` | Promotional coupon banner |
| UnlockedExclusives | `UnlockedExclusives.jsx` | Exclusive offers section |
| OptimizedImage | `OptimizedImage.jsx` | Next/Image wrapper with blur-up loading |
| Loader | `Loader.jsx` | Full-page loading spinner |
| ProtectedRoute | `ProtectedRoute.jsx` | Auth guard wrapper |
| DashboardSkeleton | `DashboardSkeleton.jsx` | Dashboard loading skeleton |
| ProductListSkeleton | `ProductListSkeleton.jsx` | Product grid loading skeleton |
| Skeleton | `Skeleton.tsx` | Generic skeleton component |

### Cart (`components/cart/`)

| Component | File | Description |
|-----------|------|-------------|
| CartDrawer | `CartDrawer.jsx` | Slide-in cart panel with items, totals, checkout |
| QuantityOfferBar | `QuantityOfferBar.jsx` | Quantity-based offer progress bar |

### Checkout (`components/checkout/`)

| Component | File | Description |
|-----------|------|-------------|
| OrderSummary | `OrderSummary.jsx` | Price breakdown, coupon input, place order button |
| CartStep | `CartStep.jsx` | Cart items review step |
| ShippingStep | `ShippingStep.jsx` | Shipping address selection |
| PaymentStep | `PaymentStep.jsx` | Payment method selection |
| ExpressCheckout | `ExpressCheckout.jsx` | Razorpay express checkout |
| MagicCheckoutIntegration | `MagicCheckoutIntegration.jsx` | Razorpay Magic Checkout SDK |

### Common (`components/common/`)

| Component | File | Description |
|-----------|------|-------------|
| SafeImage | `SafeImage.jsx` | Fault-tolerant image with fallback |
| Analytics | `Analytics.jsx` | Facebook Pixel / GA event helpers |
| UTMTracker | `UTMTracker.jsx` | UTM parameter capture |
| FomoElements | `FomoElements.jsx` | FOMO urgency UI elements |
| DonutChart | `DonutChart.jsx` | SVG donut chart |
| Shimmer | `Shimmer.jsx` | Shimmer animation wrapper |
| ProductSkeleton | `ProductSkeleton.jsx` | Product card skeleton |
| FeaturedProductSkeleton | `FeaturedProductSkeleton.jsx` | Featured product skeleton |
| HeroSliderSkeleton | `common/HeroSliderSkeleton.jsx` | Hero skeleton (common version) |

### Dashboard (`components/Dashboard/`)

| Component | File | Description |
|-----------|------|-------------|
| Card | `Card.jsx` | Stat card widget |
| DashboardHeader | `DashboardHeader.jsx` | Admin top bar |
| DashboardFooter | `DashboardFooter.jsx` | Admin footer |
| PaymentChart | `PaymentChart.jsx` | Payment trend chart |
| PaymentStatusChart | `PaymentStatusChart.jsx` | Payment status pie chart |
| ShippingChart | `ShippingChart.jsx` | Shipping stats chart |
| BrandAssignment | `BrandAssignment.jsx` | Assign products to brands |
| BrandTags | `BrandTags.jsx` | Brand tag display |

### Products (`components/products/`)

| Component | File | Description |
|-----------|------|-------------|
| AttributeSelector | `AttributeSelector.jsx` | Color/size variation picker |
| ExistingImageSelector | `ExistingImageSelector.jsx` | Reuse uploaded images |
| colorMap | `colorMap.js` | Color name → hex mapping |

### Sidebar (`components/Sidebar/`)

| Component | File | Description |
|-----------|------|-------------|
| Sidebar | `Sidebar.jsx` | Admin navigation sidebar |
| SidebarItem | `SidebarItem.jsx` | Individual sidebar nav item |

---

## Contexts

| Context | File | Provides |
|---------|------|----------|
| AuthContext | `context/AuthContext.jsx` | `user`, `isAuthenticated`, login/logout |
| CartContext | `context/CartContext.jsx` | `cartItems`, `cartTotal`, add/remove/update |
| WishlistContext | `context/WishlistContext.jsx` | `wishlistItems`, add/remove |

## Hooks

| Hook | File | Purpose |
|------|------|---------|
| useAsyncData | `hooks/useAsyncData.js` | Async data fetching with loading/error state |
| useFormInput | `hooks/useFormInput.js` | Controlled form input handler |
| usePagination | `hooks/usePagination.js` | Pagination logic |

## Services

| Service | File | Purpose |
|---------|------|---------|
| publicApi | `services/publicApi.js` | All public-facing API calls |
| adminApi | `services/adminApi.js` | Admin API calls |
| cacheManager | `services/cacheManager.js` | Client-side cache layer |
| performance-monitor | `services/performance-monitor.js` | Web vitals monitoring |

---

## Optimization Recommendations

### 1. Header — Missing debounce on search

The `debouncedSearch` function fires on every keystroke without an actual delay — it's named "debounced" but uses `useCallback` without `setTimeout`. This means an API call fires on every character typed.

**Fix:** wrap the fetch in a `setTimeout` and clear it on the next call.

```js
const debouncedSearch = useCallback((query) => {
  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  searchTimerRef.current = setTimeout(async () => {
    if (!query.trim()) { setSearchResults([]); return; }
    // ... fetch logic
  }, 300);
}, [apiUrl]);

const searchTimerRef = useRef(null);
```

---

### 2. ProductCard — Hover image always rendered in DOM

Even when `hoverImageData` is null, the hover overlay div is conditionally rendered but `SafeImage` inside it still loads eagerly on some browsers. The `hoverImagePreloaded` state is set but the main image opacity logic depends on it — if preload fails silently, the hover never works.

**Fix:** only render the hover image after first hover, not on mount.

```jsx
const [showHoverImage, setShowHoverImage] = useState(false);

const handleMouseEnter = () => {
  setIsHovered(true);
  if (!showHoverImage) setShowHoverImage(true); // mount on first hover only
};

// In JSX:
{showHoverImage && hoverImageData && (
  <div style={{ position: 'absolute', ... }}>
    <SafeImage ... />
  </div>
)}
```

---

### 3. SlidingCollection — `getCardStyle` runs on every render without memoization

`getCardStyle(index)` reads `stageRef.current.offsetWidth` (a layout read / reflow trigger) on every render for every card. With 6+ collections this causes multiple forced reflows per render.

**Fix:** memoize stage dimensions with a `ResizeObserver`.

```js
const [stageDims, setStageDims] = useState({ w: 0, h: 0 });

useEffect(() => {
  const ro = new ResizeObserver(([entry]) => {
    setStageDims({ w: entry.contentRect.width, h: entry.contentRect.height });
  });
  if (stageRef.current) ro.observe(stageRef.current);
  return () => ro.disconnect();
}, []);
```

Then use `stageDims.w` / `stageDims.h` inside `getCardStyle` instead of reading from the ref directly.

---

### 4. InfiniteReviewsSlider — `requestAnimationFrame` loop runs even when tab is hidden

The `autoScroll` loop uses `requestAnimationFrame` which pauses when the tab is hidden, but the `isVisible` IntersectionObserver check only pauses when scrolled out of view — not when the tab is backgrounded. This is fine, but the bigger issue is that `isVisible` is captured in the closure at effect creation time and goes stale.

**Fix:** use a ref for `isVisible` so the rAF loop always reads the latest value.

```js
const isVisibleRef = useRef(true);

useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    isVisibleRef.current = entry.isIntersecting;
  }, { threshold: 0.1 });
  // ...
}, []);

// In autoScroll:
if (!isPaused && isVisibleRef.current) {
  slider.scrollLeft += scrollSpeed;
}
```

---

### 5. CartDrawer — Coupon loaded from sessionStorage on every `isOpen` change

The `useEffect` that reads `sessionStorage` runs every time the drawer opens. This is fine for correctness but creates a redundant parse on every open. Since the coupon state is already managed in `UnifiedCheckout`, consider lifting it to `CartContext` so it's shared without re-reading storage.

**Short-term fix:** add a guard so it only reads once.

```js
useEffect(() => {
  if (!isOpen || appliedCoupon) return; // skip if already loaded
  const savedCoupon = sessionStorage.getItem('appliedCoupon');
  // ...
}, [isOpen]);
```

---

### 6. OrderSummary — `getPublicCoupons` fetches on every mount

Every time `OrderSummary` mounts it fetches all available coupons. If the user navigates back and forth this fires repeatedly.

**Fix:** cache the result in `sessionStorage` or move the fetch to the parent `UnifiedCheckout` and pass coupons as a prop.

---

### 7. HeroSlider — Interval not reset when `current` changes via dot click

The auto-advance `setInterval` is set once on mount and never resets when the user manually clicks a dot. This means the next auto-advance can fire almost immediately after a manual click.

**Fix:** reset the interval on manual navigation.

```js
const intervalRef = useRef(null);

const resetInterval = () => {
  if (intervalRef.current) clearInterval(intervalRef.current);
  intervalRef.current = setInterval(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, 5000);
};

// Call resetInterval() inside dot onClick and on mount
```

---

### 8. OptimizedImage — `onLoadingComplete` is deprecated in Next.js 13+

`onLoadingComplete` was removed in Next.js 13. Use `onLoad` instead.

```jsx
<Image
  onLoad={() => setIsLoading(false)}
  // remove: onLoadingComplete
/>
```

---

### 9. General — `React.memo` missing on heavy list components

`ProductCard` already uses `React.memo` — good. But `CartDrawer` cart item rows, `InfiniteReviewsSlider` review cards, and `SlidingCollection` cards are all inline JSX with no memoization. Extract them into memoized sub-components to avoid re-rendering the full list on any state change.

---

### 10. General — No `React.lazy` / dynamic imports for dashboard pages

All dashboard pages are bundled into the main chunk. Since admin users are a small subset, these should be code-split.

```js
// In _app.jsx or individual dashboard pages
const OrdersPage = dynamic(() => import('./orders/orders'), { ssr: false });
```

This alone can reduce the initial JS bundle by 30–40% for storefront users.
