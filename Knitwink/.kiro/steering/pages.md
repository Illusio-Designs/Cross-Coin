---
inclusion: always
---

# Master Build Plan — Allbirds Frontend Clone

## How Kiro should use this file
This file is your single source of truth for every page and feature.
When a human says "work on [page name]" — find that page in this document,
read its full spec, then cross-reference ui-conventions.md for design rules,
structure.md for file paths, and tech.md for libraries.

**Never start building without reading all 4 steering files first.**
**Never ask the human to repeat design rules — they are already in ui-conventions.md.**
**Never write backend code. Never use inline style={{}}. Never use raw <img>.**

---

## Design System Rules (always apply to every page)

Before writing any component, confirm these rules are followed:

### Colors — only these, never hardcoded hex
| Token | Tailwind class | Use for |
|---|---|---|
| White | `bg-white text-white` | Cards, navbar, page bg |
| Off-white | `bg-off-white` | Page tint, announcement bar, footer |
| Brand black | `text-brand-black bg-brand-black` | Headings, active states |
| Gray 200 | `border-gray-200` | Dividers, card borders |
| Gray 600 | `text-gray-600` | Secondary text, labels |
| Gray 800 | `text-gray-800` | Body text |
| Sage | `bg-sage text-sage` | Primary CTA, icons, accents |
| Sage dark | `bg-sage-dark` | Sage hover state |
| Earth | `bg-earth text-earth` | Sale badge, warm accents |

### Typography — never deviate
- Hero headline: `text-6xl lg:text-8xl font-display font-normal tracking-tight`
- Section heading: `text-3xl lg:text-4xl font-display font-normal`
- Product name on card: `text-sm font-normal text-gray-800`
- Price: `text-sm font-medium text-brand-black`
- Body: `text-base font-normal text-gray-800 leading-relaxed`
- Label/badge: `text-xs font-medium uppercase tracking-widest`
- Button text: `text-sm font-medium uppercase tracking-wider`

### Spacing — section rhythm
- Between homepage sections: `py-16 md:py-24 lg:py-32`
- Page horizontal padding: `px-6 md:px-10 lg:px-16` inside `max-w-site mx-auto`
- Product grid gap: `gap-4 md:gap-6`

### Buttons — always rounded-full, always from Button.tsx
- Primary: sage green fill, white text
- Secondary: black outline, black text
- Ghost: underline text only

### Animations — keep subtle
- Hover transitions: `duration-150 ease-out`
- Drawer/modal: framer-motion, `duration: 0.25`, `ease: "easeOut"`
- Image crossfade: framer-motion opacity, `duration: 0.2`
- No parallax. No auto-play. No word-by-word text animations.

### Images — always next/image
- Above fold: `priority` prop
- Product cards: `fill` + `object-cover` inside a sized container
- Never `<img>`. Never `layout="fill"` (deprecated).

---

## All Pages — Build Specs

---

### PAGE: Homepage
**Command:** `work on homepage`
**File:** `app/page.tsx`
**Type:** Server Component

**Data fetching:**
```ts
getFeaturedCollections() → next: { revalidate: 60 }
getBestsellers()         → next: { revalidate: 60 }
getMaterials()           → next: { revalidate: 3600 }
```

**Sections in order:**
1. `HeroBanner` — full-bleed image, 64–80px headline, subtitle, primary CTA
2. `CollectionGrid` — 4 tiles, grid-cols-2 lg:grid-cols-4, image + name overlay
3. `SustainabilityStrip` — full-width sage-light band, leaf icon + centered text
4. `BestsellerRow` — embla carousel, heading "Bestsellers", arrow nav desktop
5. `MaterialSection` — 2 rows alternating [image|text] and [text|image], ghost CTA each
6. `ReviewBand` — 3 customer quote cards, bg-off-white, star icons in sage
7. `InstagramStrip` — 6 square UGC-style images in a row, "Follow us @handle" below

**SEO:** `generateMetadata()` with site name, description, OG image from hero

---

### PAGE: Collection / PLP
**Command:** `work on collection page`
**File:** `app/collections/[handle]/page.tsx`
**Type:** Server Component + Client filter/sort

**Data fetching:**
```ts
getCollection(handle) → next: { revalidate: 60 }
```

**Layout:**
- `h1` collection name: `text-4xl font-display text-center pt-16 pb-4`
- Description: `text-base text-gray-600 text-center max-w-lg mx-auto pb-8`
- FilterBar row: filter pills left, SortDropdown right
- ProductGrid below

**ProductCard spec:**
- Aspect 4/5 mobile, 3/4 desktop
- Hover: framer-motion crossfade to `images[1]`, 200ms
- Hover lift: `hover:-translate-y-0.5 transition-transform duration-150`
- Swatches: 16px circles, `ring-2 ring-brand-black ring-offset-2` when active
- Swatch click → update card image (useState, client component)
- Badge top-left: "New" = `bg-white/90 text-brand-black`, "Sale" = `bg-earth text-white`
- No border, no shadow

**Filters:** URL search params so they're shareable
**Loading:** Skeleton grid in `loading.tsx`
**SEO:** `generateMetadata()` with collection name + description

---

### PAGE: Product Detail Page
**Command:** `work on product page`
**File:** `app/products/[handle]/page.tsx`
**Type:** Server Component + Client interactions

**Data fetching:**
```ts
getProduct(handle) → next: { revalidate: 120 }
```

**Left column — gallery:**
- Main image 1:1 aspect, `priority`
- 5 thumbnails below, 80×80, active = `ring-2 ring-brand-black`

**Right column — info:**
- Collection name: `text-xs uppercase tracking-widest text-gray-600`
- Product name: `text-3xl font-display font-normal`
- Price + compareAtPrice (strikethrough in gray-400)
- Color selector: label + 24px swatch circles
- Size selector: pill buttons, OOS = `opacity-40 cursor-not-allowed`
- Size Guide ghost link → `SizeGuide` modal
- Add to Cart primary Button → `useCart().addItem()`
- CarbonBadge: `bg-gray-100 rounded-full px-3 py-1.5 text-xs uppercase`
- Description: `text-base text-gray-600 leading-relaxed mt-6`
- 4 feature icons row

**Below fold:**
- `FeatureBreakdown` grid
- `ReviewsSection` (next/dynamic ssr:false)
- `CrossSell` row

**StickyATCBar:**
- IntersectionObserver on main ATC button
- framer-motion y: 64→0, 200ms when ATC scrolls out of view
- `fixed bottom-0 h-16 bg-white border-t border-gray-200 z-50`

**SEO:** `generateMetadata()` with product name, description, `images[0]` as OG

---

### PAGE: Cart (full page fallback)
**Command:** `work on cart page`
**File:** `app/cart/page.tsx`
**Type:** Client Component

Full-page version of the cart for users who navigate directly to /cart.
Same CartItem, FreeShippingBar, CartUpsell components as the drawer.
Two-column desktop: `lg:grid-cols-[1fr_380px]`
Left: item list. Right: order summary + checkout button.

---

### PAGE: Checkout
**Command:** `work on checkout page`
**File:** `app/checkout/page.tsx`
**Type:** Client Component (protected)

**Layout:** `grid-cols-1 lg:grid-cols-[1fr_380px] gap-12`

**Left — CheckoutForm:**
- Section 1 "Contact": Email
- Section 2 "Shipping": AddressFields component
- Section 3 "Payment": PaymentFields component (text inputs only, no payment logic)
- Submit: POST via `lib/api/orders.ts → createOrder()`
- On success: `cartStore.clearCart()` → `router.push("/account/orders/[id]")`

**Right — OrderSummary:**
- Sticky `top-8`
- Item list with thumbnails
- Subtotal, Shipping, Total
- Lock icon + "Secure checkout" 12px text-gray-600

**Section heading style:** `text-sm font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-3 mb-6`

---

### PAGE: Login
**Command:** `work on login page`
**File:** `app/login/page.tsx`
**Type:** Client Component

- Centered card: `bg-white border border-gray-200 rounded-2xl p-10 max-w-sm`
- Heading "Welcome back" `text-3xl font-display`
- Email + Password inputs
- Zod: email format, password min 8
- Submit: `lib/api/auth.ts → login()` → success: `/account`
- "Forgot password?" ghost link
- "Don't have an account? Register" → `/register`

---

### PAGE: Register
**Command:** `work on register page`
**File:** `app/register/page.tsx`
**Type:** Client Component

- Same card layout as login
- Heading "Create account" `text-3xl font-display`
- First name + Last name side by side `grid-cols-2 gap-3`
- Email, Password, Confirm Password
- Zod: passwords match, email valid, password min 8
- Submit: `lib/api/auth.ts → register()` → success: `/account`
- "Already have an account? Sign in" → `/login`

---

### PAGE: Account Overview
**Command:** `work on account page`
**File:** `app/account/page.tsx`
**Type:** Server Component (protected)

- `getMe()` to fetch user
- "Hello, [firstName]" `text-4xl font-display`
- 3 summary stat cards: Total Orders, Last Order Status, Member Since
- Quick links to orders + settings

---

### PAGE: Order History
**Command:** `work on orders page`
**File:** `app/account/orders/page.tsx`
**Type:** Server Component

- `getOrders()` → list of OrderCard components
- Each OrderCard: order number, date (date-fns), status badge, total, "View" link
- Status badge colors: pending=gray-200, confirmed=sky, shipped=earth, delivered=sage, cancelled=error
- Empty state: illustration + "No orders yet" + CTA to shop

---

### PAGE: Order Detail
**Command:** `work on order detail page`
**File:** `app/account/orders/[id]/page.tsx`
**Type:** Server Component

- `getOrder(id)`
- Order number + date heading
- Status timeline: 4 steps (Confirmed → Processing → Shipped → Delivered)
  Active/done steps: `bg-sage` circle. Upcoming: `bg-gray-200` circle.
- Item list with thumbnails, quantities, prices
- Shipping address block
- Order total summary

---

### PAGE: Account Settings
**Command:** `work on settings page`
**File:** `app/account/settings/page.tsx`
**Type:** Client Component

- ProfileForm: edit first name, last name, email, phone
- PasswordForm: current password, new password, confirm new password
- AddressForm: default shipping address using AddressFields component
- Each section saves independently via PATCH to backend
- Success toast: "Changes saved" in sage green

---

### PAGE: About / Our Story
**Command:** `work on about page`
**File:** `app/about/page.tsx`
**Type:** Server Component

- Full-bleed hero image + headline `text-7xl font-display` centered
- Brand story section: alternating [text|image] blocks same as MaterialSection
- "Our numbers" band: 4 stat cards (year founded, products sold, CO2 offset, countries)
- Team section: 4 cards with photo, name, title
- Values section: 3 icon + heading + description cards

---

### PAGE: Sustainability
**Command:** `work on sustainability page`
**File:** `app/sustainability/page.tsx`
**Type:** Server Component

- Hero: headline "We're in the business of better" `text-7xl font-display`
- Materials section: cards for each material (Merino Wool, Tree Fiber, Sugar Cane)
  Each card: large illustration, material name, description, carbon rating
- Carbon commitment section: full-bleed sage-light bg, large CO2 stat center
- Certifications: logos row (B Corp, Carbon Neutral, etc.)
- "What we're doing next" timeline

---

### PAGE: Style Quiz
**Command:** `work on quiz page`
**File:** `app/quiz/page.tsx`
**Type:** Client Component (next/dynamic ssr:false)

- Progress bar: `h-1 bg-gray-200`, fill `bg-sage`, `transition-all duration-300`
- 4 steps, framer-motion slide between steps
- Step 1: Shopping for? Men / Women / Both
- Step 2: Main activity? Running / Walking / Work / Casual
- Step 3: Matters most? Comfort / Sustainability / Style / Value
- Step 4: Pick vibe — 4 color palettes
- Results: POST to `getQuizRecommendations(answers)` → 4 ProductCards
- "Retake quiz" ghost button

---

### PAGE: Search Results
**Command:** `work on search page`
**File:** `app/search/page.tsx`
**Type:** Server Component

- Search bar at top: full-width, `border border-gray-200 rounded-full px-6 py-3`
- Query from `searchParams.q`
- Fetch: `searchProducts(query)` → next: { revalidate: 0 } (always fresh)
- Results count: "N results for 'query'"
- Same ProductGrid as collection page
- Empty state: "No results for 'X'" + suggested collections

---

### PAGE: Wishlist
**Command:** `work on wishlist page`
**File:** `app/wishlist/page.tsx`
**Type:** Client Component (protected)

- Wishlist stored in Zustand `wishlistStore`
- Same ProductGrid layout
- Each card has a filled heart icon top-right (remove from wishlist)
- Empty state: heart icon + "Your wishlist is empty" + CTA to shop
- "Add all to cart" primary button if items exist

---

### PAGE: 404 Not Found
**Command:** `work on 404 page`
**File:** `app/not-found.tsx`
**Type:** Server Component

- Centered layout, large "404" in `text-9xl font-display text-gray-200`
- "Page not found" heading `text-3xl font-display`
- "The page you're looking for doesn't exist." `text-gray-600`
- Primary Button "Go Home" → /
- Ghost Button "Shop All" → /collections/all

---

### PAGE: Blog / Journal Index
**Command:** `work on blog page`
**File:** `app/journal/page.tsx`
**Type:** Server Component

- Hero: "The Journal" `text-6xl font-display` centered, subtitle
- Fetch: `getPosts()` → next: { revalidate: 300 }
- Featured post: full-width card, large image, title, excerpt, "Read More"
- Post grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`
- Each card: image `aspect-video`, category badge, title, date, read time

---

### PAGE: Blog Post
**Command:** `work on blog post page`
**File:** `app/journal/[slug]/page.tsx`
**Type:** Server Component

- Fetch: `getPost(slug)` → next: { revalidate: 300 }
- `generateMetadata()` with post title, description, og:image
- Hero: full-width post image `aspect-video`
- Title: `text-5xl font-display font-normal max-w-2xl mx-auto text-center py-12`
- Body: `prose max-w-2xl mx-auto` — Tailwind Typography plugin
- Author card below: avatar, name, date
- Related posts row: 3 PostCards

---

### PAGE: Contact
**Command:** `work on contact page`
**File:** `app/contact/page.tsx`
**Type:** Client Component

- Two-column: `grid-cols-1 lg:grid-cols-2 gap-16`
- Left: "Get in touch" heading, contact info cards (email, phone, hours)
- Right: Contact form — Name, Email, Subject dropdown, Message textarea
  react-hook-form + zod, submit via `lib/api/contact.ts → sendMessage()`
  Success: "Thanks! We'll be in touch within 24 hours." in sage
- FAQ accordion below: 5 common questions, framer-motion height animation

---

### PAGE: Size Guide (standalone)
**Command:** `work on size guide page`
**File:** `app/size-guide/page.tsx`
**Type:** Server Component

- Tab switcher: Men / Women / Kids — framer-motion underline indicator
- Size chart tables: UK / EU / US columns
- "How to measure" section with illustration
- Fit guide: Slim / Regular / Relaxed with visual examples

---

## Adding a Brand New Page

When asked to add a completely new page not listed above, follow this checklist:

1. **Read ui-conventions.md** — confirm colors, typography, spacing before writing a line
2. **Read structure.md** — confirm correct file path and component folder
3. **Create the page file** at `app/[route]/page.tsx`
4. **Add generateMetadata()** — always, no exceptions
5. **Add loading.tsx** — always, use Skeleton components
6. **Add error.tsx** — always, with a retry button
7. **Use only existing ui/ components** — Button, Input, Badge, Modal, Skeleton
8. **Fetch data via lib/api/** — never fetch() directly in a component
9. **No inline style={{}}** — Tailwind classes only
10. **No hardcoded colors** — only design tokens from ui-conventions.md
11. **Test responsiveness** — mobile first, check sm/md/lg breakpoints

## When the human says "add [feature] to [page]"
1. Find the page spec above
2. Read the relevant component file
3. Add the feature following the design system rules
4. Do not change anything else on the page
5. State clearly what you changed and why
