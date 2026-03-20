# Kiro Prompt Guide
# ─────────────────────────────────────────────────────────────
# How to use: paste any line below into Kiro chat exactly as written.
# Kiro will read the steering files and know everything automatically.
# Wait for each prompt to finish before running the next one.
# ─────────────────────────────────────────────────────────────


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — Run these once, in order, before anything else
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Set up the project from scratch following setup.md

─────────────────────────────────────────────────

Set up base UI components following ui-conventions.md and structure.md — Button, Input, Badge, Modal, Drawer, Skeleton, cn utility

─────────────────────────────────────────────────

Set up Zustand stores following structure.md — cartStore and uiStore

─────────────────────────────────────────────────

Set up all custom hooks following structure.md — useCart, useAuth, useMediaQuery, useIntersectionObserver

─────────────────────────────────────────────────

Set up app/layout.tsx with AnnouncementBar, Navbar, Footer, and CartDrawer following ui-conventions.md


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — Core pages (paste one at a time)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Work on homepage

─────────────────────────────────────────────────

Work on collection page

─────────────────────────────────────────────────

Work on product page

─────────────────────────────────────────────────

Work on cart page

─────────────────────────────────────────────────

Work on checkout page

─────────────────────────────────────────────────

Work on login page

─────────────────────────────────────────────────

Work on register page


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — Account pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Work on account page

─────────────────────────────────────────────────

Work on orders page

─────────────────────────────────────────────────

Work on order detail page

─────────────────────────────────────────────────

Work on settings page


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — Extra pages (add whenever you want)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Work on about page

─────────────────────────────────────────────────

Work on sustainability page

─────────────────────────────────────────────────

Work on quiz page

─────────────────────────────────────────────────

Work on search page

─────────────────────────────────────────────────

Work on wishlist page

─────────────────────────────────────────────────

Work on blog page

─────────────────────────────────────────────────

Work on blog post page

─────────────────────────────────────────────────

Work on contact page

─────────────────────────────────────────────────

Work on size guide page

─────────────────────────────────────────────────

Work on 404 page


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIXING & ITERATING — use these anytime
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Review [component name] against ui-conventions.md and fix any violations

─────────────────────────────────────────────────

Make [page name] fully responsive for mobile following ui-conventions.md

─────────────────────────────────────────────────

Add [feature] to [page name] following the design system in ui-conventions.md. Do not change anything else.

─────────────────────────────────────────────────

Fix the [component name] — [describe the problem]. Do not change anything else in the file.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDING A NEW PAGE NOT IN THE LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add a new [page name] page at app/[route]/page.tsx following the design system in ui-conventions.md and structure.md. Include generateMetadata(), loading.tsx, and error.tsx.
