---
inclusion: always
---

# Product Overview

## What We Are Building
A **frontend-only** Next.js application — a pixel-faithful clone of Allbirds.com.
This repo contains **only the frontend**. The backend already exists and is
maintained separately. This project never touches backend code, database schemas,
API logic, or server infrastructure.

## Our Job
Build every UI page, component, and interaction. Consume data from the existing
REST API. Make it look and feel exactly like Allbirds.com.

## Pages to Build
1. **Homepage** — Hero banner, featured collections, sustainability strip, bestseller row, material breakdown sections, footer
2. **Collection / PLP** — Product grid with filter + sort, color swatch switching on cards
3. **Product Detail Page (PDP)** — Image gallery, color/size selector, sticky Add-to-Cart bar, feature breakdown, carbon badge, reviews, cross-sell row
4. **Cart Drawer** — Slide-in cart, line items, free shipping progress bar, upsell block
5. **Checkout** — Address + payment form, order summary panel
6. **Account pages** — Login, Register, Order history, Profile settings
7. **About / Sustainability** — Brand story, material science sections
8. **Style Quiz** — Multi-step quiz → product recommendations

## What We Do NOT Do
- No backend code
- No database queries
- No API route logic (except `/api/revalidate` for ISR webhook from backend)
- No auth token generation — we only read/store the token the backend gives us
- No payment processing logic — we pass card details to backend endpoint only
