# Gripzus Website Redesign - Wokiee Style Implementation Plan

## Overview
This document outlines the plan to redesign the Gripzus website based on the Wokiee Shopify theme design, using global CSS variables for easy color management.

---

## Key Design Elements from Wokiee

### 1. **Layout & Structure**
- Clean, modern grid-based layout
- Full-width hero sections with promotional banners
- Product cards in responsive grid (2-6 columns based on screen size)
- Sticky header with mega menu
- Newsletter signup section
- Instagram feed integration
- Customer reviews/testimonials section
- Blog section with cards
- Brand showcase section

### 2. **Typography**
- Clean, modern sans-serif fonts
- Bold headings with good hierarchy
- Uppercase text for labels and CTAs
- Letter spacing on buttons and headings

### 3. **Product Cards**
- Image with hover effect (second image on hover)
- Product badges (Sale, Bestseller, Sold Out, New)
- Quick view button on hover
- Wishlist and compare icons
- Product name, brand, price
- Sale price with strikethrough original price
- Countdown timer for limited offers

### 4. **Color Scheme (Wokiee)**
- Primary: Black (#000000)
- Secondary: White (#FFFFFF)
- Accent: Red for sale badges
- Text: Dark gray for body text
- Borders: Light gray (#E5E5E5)
- Hover states: Subtle gray backgrounds

### 5. **Interactive Elements**
- Smooth hover transitions
- Image zoom on hover
- Slide-in cart drawer
- Modal popups for quick view
- Animated countdown timers
- Smooth scrolling
- Sticky elements (header, promo bar)

---

## Global CSS Variables System

### File Structure
```
Gripzus/
├── src/
│   ├── styles/
│   │   ├── globals.css (Global CSS variables + base styles)
│   │   ├── components/ (Component-specific styles)
│   │   └── pages/ (Page-specific styles)
```

### Global Variables (globals.css)

```css
:root {
  /* ===== PRIMARY COLORS ===== */
  --color-primary: #1A1A1A;        /* Main brand color - Dark */
  --color-primary-light: #2D2D2D;  /* Lighter shade */
  --color-primary-dark: #000000;   /* Darker shade */
  
  /* ===== SECONDARY COLORS ===== */
  --color-secondary: #8B7355;      /* Luxury brown/tan */
  --color-secondary-light: #A68968;
  --color-secondary-dark: #6B5A45;
  
  /* ===== ACCENT COLORS ===== */
  --color-accent: #D4AF37;         /* Gold accent */
  --color-accent-light: #E5C158;
  --color-accent-dark: #B8941F;
  
  /* ===== SEMANTIC COLORS ===== */
  --color-success: #10B981;        /* Green for success */
  --color-error: #EF4444;          /* Red for errors */
  --color-warning: #F59E0B;        /* Orange for warnings */
  --color-info: #3B82F6;           /* Blue for info */
  
  /* ===== NEUTRAL COLORS ===== */
  --color-white: #FFFFFF;
  --color-black: #000000;
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;
  
  /* ===== TEXT COLORS ===== */
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  --text-muted: var(--color-gray-400);
  --text-inverse: var(--color-white);
  
  /* ===== BACKGROUND COLORS ===== */
  --bg-primary: var(--color-white);
  --bg-secondary: var(--color-gray-50);
  --bg-tertiary: var(--color-gray-100);
  --bg-dark: var(--color-primary);
  
  /* ===== BORDER COLORS ===== */
  --border-light: var(--color-gray-200);
  --border-medium: var(--color-gray-300);
  --border-dark: var(--color-gray-400);
  
  /* ===== TYPOGRAPHY ===== */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-heading: 'Playfair Display', Georgia, serif;
  
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;     /* 18px */
  --font-size-xl: 1.25rem;      /* 20px */
  --font-size-2xl: 1.5rem;      /* 24px */
  --font-size-3xl: 1.875rem;    /* 30px */
  --font-size-4xl: 2.25rem;     /* 36px */
  --font-size-5xl: 3rem;        /* 48px */
  
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;
  --letter-spacing-wider: 0.05em;
  
  /* ===== SPACING ===== */
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;       /* 16px */
  --spacing-lg: 1.5rem;     /* 24px */
  --spacing-xl: 2rem;       /* 32px */
  --spacing-2xl: 3rem;      /* 48px */
  --spacing-3xl: 4rem;      /* 64px */
  --spacing-4xl: 6rem;      /* 96px */
  
  /* ===== BORDER RADIUS ===== */
  --radius-none: 0;
  --radius-sm: 0.25rem;     /* 4px */
  --radius-md: 0.375rem;    /* 6px */
  --radius-lg: 0.5rem;      /* 8px */
  --radius-xl: 0.75rem;     /* 12px */
  --radius-2xl: 1rem;       /* 16px */
  --radius-full: 9999px;
  
  /* ===== SHADOWS ===== */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* ===== TRANSITIONS ===== */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
  
  /* ===== Z-INDEX ===== */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  
  /* ===== CONTAINER ===== */
  --container-max-width: 1440px;
  --container-padding: var(--spacing-md);
  
  /* ===== GRID ===== */
  --grid-gap: var(--spacing-lg);
  --grid-columns-mobile: 2;
  --grid-columns-tablet: 3;
  --grid-columns-desktop: 4;
}

/* Dark mode variables (optional) */
[data-theme="dark"] {
  --color-primary: #FFFFFF;
  --color-primary-light: #F3F4F6;
  --color-primary-dark: #E5E7EB;
  
  --text-primary: var(--color-white);
  --text-secondary: var(--color-gray-300);
  --text-muted: var(--color-gray-500);
  
  --bg-primary: var(--color-gray-900);
  --bg-secondary: var(--color-gray-800);
  --bg-tertiary: var(--color-gray-700);
  
  --border-light: var(--color-gray-700);
  --border-medium: var(--color-gray-600);
  --border-dark: var(--color-gray-500);
}
```

---

## Component Styles Using Variables

### Example: Button Component
```css
.btn {
  font-family: var(--font-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--text-inverse);
  border: 2px solid var(--color-primary);
}

.btn-primary:hover {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary-light);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: var(--text-inverse);
  border: 2px solid var(--color-secondary);
}

.btn-outline {
  background-color: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-outline:hover {
  background-color: var(--color-primary);
  color: var(--text-inverse);
}
```

### Example: Product Card
```css
.product-card {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-base);
}

.product-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.product-card__image {
  position: relative;
  overflow: hidden;
  aspect-ratio: 3/4;
}

.product-card__badge {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-error);
  color: var(--text-inverse);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  border-radius: var(--radius-sm);
}

.product-card__title {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.product-card__price {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.product-card__price--sale {
  color: var(--color-error);
}

.product-card__price--original {
  text-decoration: line-through;
  color: var(--text-muted);
  font-size: var(--font-size-base);
  margin-left: var(--spacing-sm);
}
```

---

## Implementation Steps

### Phase 1: Setup Global Variables
1. Create `src/styles/globals.css` with all CSS variables
2. Import in `_app.js` or main layout
3. Test variable usage in existing components

### Phase 2: Component Library
1. Create reusable components:
   - Button
   - ProductCard
   - Badge
   - Input/Form elements
   - Modal
   - Drawer (Cart, Filters)
   - Dropdown
   - Tabs
   - Accordion

### Phase 3: Layout Components
1. Header with mega menu
2. Footer
3. Promo bar (sticky)
4. Newsletter section
5. Breadcrumbs

### Phase 4: Page Templates
1. Homepage
   - Hero slider
   - Featured categories
   - Product grids (Bestsellers, Trending, New Arrivals)
   - Promotional banners
   - Brand showcase
   - Instagram feed
   - Blog section
   - Reviews/testimonials

2. Collection/Category Page
   - Filter sidebar
   - Sort dropdown
   - Product grid
   - Pagination
   - View toggle (grid/list)

3. Product Detail Page
   - Image gallery with zoom
   - Product info
   - Size/variant selector
   - Add to cart
   - Product tabs (Description, Reviews, Shipping)
   - Related products
   - Recently viewed

4. Cart Page
   - Cart items list
   - Quantity controls
   - Remove items
   - Coupon code
   - Order summary
   - Checkout button

5. Checkout Page
   - Multi-step form
   - Address form
   - Payment options
   - Order review

### Phase 5: Features
1. Quick view modal
2. Wishlist functionality
3. Compare products
4. Search with autocomplete
5. Size guide modal
6. Product reviews
7. Newsletter popup
8. Cookie consent
9. Loading states
10. Error states

---

## Responsive Breakpoints

```css
/* Mobile First Approach */
:root {
  --breakpoint-sm: 640px;   /* Small devices */
  --breakpoint-md: 768px;   /* Medium devices */
  --breakpoint-lg: 1024px;  /* Large devices */
  --breakpoint-xl: 1280px;  /* Extra large devices */
  --breakpoint-2xl: 1536px; /* 2X large devices */
}

/* Usage */
@media (min-width: 768px) {
  /* Tablet and up */
}

@media (min-width: 1024px) {
  /* Desktop and up */
}
```

---

## Benefits of Global CSS Variables

1. **Easy Theme Changes**: Update one variable to change colors site-wide
2. **Consistency**: Ensures design consistency across all pages
3. **Maintainability**: Easier to maintain and update
4. **Dark Mode**: Simple to implement with variable overrides
5. **Performance**: No runtime JavaScript needed for theming
6. **Developer Experience**: Clear naming conventions
7. **Scalability**: Easy to add new colors or modify existing ones

---

## Color Customization Example

To change the entire site's color scheme, simply update the root variables:

```css
/* Original Gripzus Colors */
:root {
  --color-primary: #1A1A1A;
  --color-secondary: #8B7355;
  --color-accent: #D4AF37;
}

/* New Color Scheme (Example) */
:root {
  --color-primary: #2C3E50;      /* Navy Blue */
  --color-secondary: #E74C3C;    /* Red */
  --color-accent: #F39C12;       /* Orange */
}
```

All components using these variables will automatically update!

---

## Next Steps

1. Review and approve this design plan
2. Set up the global CSS variables file
3. Start building the component library
4. Implement page templates one by one
5. Test responsiveness across devices
6. Optimize performance
7. Launch!

---

## Notes

- Use Tailwind CSS utility classes alongside custom CSS for faster development
- Ensure all images are optimized (WebP format)
- Implement lazy loading for images
- Use Next.js Image component for automatic optimization
- Add proper SEO meta tags
- Implement analytics tracking
- Set up error monitoring (Sentry)
- Add loading skeletons for better UX

---

**Document Version**: 1.0  
**Last Updated**: February 12, 2026  
**Author**: Kiro AI Assistant
