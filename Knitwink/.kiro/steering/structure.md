---
inclusion: always
---

# Frontend Project Structure

## Root
```
allbirds-frontend/
├── .kiro/steering/         ← Kiro reads these on every prompt
├── app/                    ← Next.js App Router pages
├── components/             ← All UI components
├── lib/                    ← API client + helpers
├── hooks/                  ← Custom React hooks
├── store/                  ← Zustand stores
├── types/                  ← Shared TypeScript types
├── styles/                 ← globals.css only
├── public/                 ← Static assets
├── middleware.ts           ← Protect /account/* and /checkout
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local              ← never commit
└── package.json
```

---

## app/ — Pages
```
app/
├── layout.tsx              ← Root: fonts, providers, AnnouncementBar, Navbar, Footer
├── page.tsx                ← Homepage
├── not-found.tsx
├── error.tsx
├── loading.tsx
│
├── collections/
│   └── [handle]/
│       ├── page.tsx        ← Collection / PLP — Server Component
│       └── loading.tsx     ← Skeleton grid
│
├── products/
│   └── [handle]/
│       ├── page.tsx        ← PDP — Server Component with ISR
│       └── loading.tsx
│
├── quiz/
│   └── page.tsx            ← Style quiz — Client Component
│
├── checkout/
│   └── page.tsx            ← Checkout form — protected
│
├── account/
│   ├── layout.tsx          ← Account sidebar layout
│   ├── page.tsx            ← Profile / overview
│   ├── orders/
│   │   ├── page.tsx        ← Order history
│   │   └── [id]/page.tsx   ← Order detail
│   └── settings/page.tsx
│
├── login/page.tsx
├── register/page.tsx
├── about/page.tsx
├── sustainability/page.tsx
│
└── api/
    └── revalidate/route.ts ← ISR webhook — backend calls this to bust cache
```

---

## components/ — UI Components
```
components/
│
├── layout/
│   ├── Navbar.tsx              ← Sticky header, search, cart icon, account
│   ├── AnnouncementBar.tsx     ← "Free shipping over ₹X" top strip
│   ├── MegaMenu.tsx            ← Desktop hover dropdown — full width
│   ├── MobileMenu.tsx          ← Slide-in drawer for mobile nav
│   └── Footer.tsx
│
├── home/
│   ├── HeroBanner.tsx          ← Full-bleed hero, headline, CTA
│   ├── CollectionGrid.tsx      ← 2-up / 4-up featured collection tiles
│   ├── BestsellerRow.tsx       ← Horizontal scrolling product row
│   ├── SustainabilityStrip.tsx ← "Made with natural materials" band
│   └── MaterialSection.tsx     ← Alternating image + text feature sections
│
├── collection/
│   ├── ProductGrid.tsx         ← Grid of ProductCards
│   ├── ProductCard.tsx         ← Image, swatches, name, price
│   ├── ColorSwatch.tsx         ← Circle that swaps card image on click
│   ├── FilterBar.tsx           ← Filter pills — desktop
│   ├── FilterDrawer.tsx        ← Filter slide-in — mobile
│   └── SortDropdown.tsx
│
├── product/
│   ├── ProductGallery.tsx      ← Main image + thumbnail rail
│   ├── ProductInfo.tsx         ← Name, price, color/size pickers, ATC button
│   ├── StickyATCBar.tsx        ← Fixed bottom bar, appears on scroll
│   ├── FeatureBreakdown.tsx    ← Icon + title + description grid
│   ├── CarbonBadge.tsx         ← "X.Xkg CO₂e" sustainability pill
│   ├── SizeGuide.tsx           ← Modal with size chart
│   ├── ReviewsSection.tsx      ← Star summary + review list
│   └── CrossSell.tsx           ← "Pair it with" product row
│
├── cart/
│   ├── CartDrawer.tsx          ← Slide-in from right
│   ├── CartItem.tsx            ← Line item with qty controls + remove
│   ├── CartUpsell.tsx          ← Suggestion block ("add socks?")
│   └── FreeShippingBar.tsx     ← Progress bar toward free shipping
│
├── checkout/
│   ├── CheckoutForm.tsx        ← Full form with react-hook-form + zod
│   ├── AddressFields.tsx       ← Reusable address fieldset
│   ├── OrderSummary.tsx        ← Right panel — cart items + totals
│   └── PaymentFields.tsx       ← Card number, expiry, CVV
│
├── quiz/
│   ├── QuizShell.tsx           ← Multi-step container + progress bar
│   ├── QuizStep.tsx            ← One step with selectable options
│   └── QuizResults.tsx         ← Recommended products grid
│
├── account/
│   ├── AccountSidebar.tsx      ← Nav: orders, settings, logout
│   ├── OrderCard.tsx           ← Single order summary
│   └── ProfileForm.tsx         ← Edit name, email, password
│
└── ui/                         ← Primitive building blocks
    ├── Button.tsx              ← variant: primary | secondary | ghost
    ├── Badge.tsx               ← New | Sale | Bestseller pill
    ├── Modal.tsx               ← Focus-trapped accessible modal
    ├── Drawer.tsx              ← Slide-in drawer base component
    ├── Skeleton.tsx            ← Loading placeholder shapes
    ├── Input.tsx               ← Styled input + label + error message
    ├── Select.tsx              ← Styled select dropdown
    └── cn.ts                   ← clsx + tailwind-merge utility
```

---

## lib/ — API Functions
```
lib/
├── api/
│   ├── client.ts           ← Base fetch wrapper (auth header, error handling)
│   ├── products.ts         ← getProduct(handle), getProducts(), getCollection()
│   ├── cart.ts             ← getCart(), addItem(), updateItem(), removeItem()
│   ├── orders.ts           ← getOrders(), getOrder(id)
│   ├── auth.ts             ← login(), register(), logout(), getMe()
│   └── reviews.ts          ← getReviews(productId), submitReview()
│
├── utils.ts                ← formatPrice(), cn(), truncate(), slugify()
└── constants.ts            ← SITE_NAME, SHIPPING_THRESHOLD, ROUTES, NAV_LINKS
```

---

## hooks/
```
hooks/
├── useCart.ts                  ← Cart actions + Zustand cart store
├── useAuth.ts                  ← Current user, login/logout helpers
├── useMediaQuery.ts            ← Responsive breakpoint detection
├── useProducts.ts              ← Client-side product fetching
└── useIntersectionObserver.ts  ← Sticky ATC visibility trigger
```

---

## store/
```
store/
├── cartStore.ts    ← items[], drawerOpen, addItem, removeItem, updateQty
└── uiStore.ts      ← mobileMenuOpen, filterDrawerOpen
```

---

## types/
```
types/
├── product.ts      ← Product, ProductVariant, ProductImage, Feature, Material
├── collection.ts   ← Collection
├── cart.ts         ← Cart, CartItem
├── order.ts        ← Order, OrderItem, OrderStatus
├── user.ts         ← User, Address
└── api.ts          ← ApiResponse<T>, PaginatedResponse<T>, ApiError
```

---

## Naming Conventions
| Thing | Rule | Example |
|---|---|---|
| Components | PascalCase | `ProductCard.tsx` |
| Hooks | `use` prefix, camelCase | `useCart.ts` |
| Lib functions | camelCase | `formatPrice.ts` |
| Stores | camelCase + `Store` | `cartStore.ts` |
| Types | PascalCase | `Product`, `CartItem` |
| Props types | PascalCase + `Props` | `ProductCardProps` |

## Path Aliases
```json
"paths": {
  "@/*":             ["./*"],
  "@/components/*":  ["./components/*"],
  "@/lib/*":         ["./lib/*"],
  "@/hooks/*":       ["./hooks/*"],
  "@/store/*":       ["./store/*"],
  "@/types/*":       ["./types/*"]
}
```
