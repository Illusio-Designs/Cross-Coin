# Premium Socks Store - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
shopify/
├── src/
│   ├── app/                    # Next.js 14 App Router pages
│   │   ├── layout.tsx         # Root layout with Header/Footer
│   │   ├── page.tsx           # Homepage
│   │   ├── collections/       # Shop/Collection pages
│   │   ├── products/          # Product detail pages
│   │   ├── cart/              # Cart page
│   │   ├── checkout/          # Checkout page
│   │   ├── account/           # Customer account pages
│   │   ├── search/            # Search page
│   │   ├── about/             # About page
│   │   └── contact/           # Contact page
│   │
│   ├── components/            # Reusable React components
│   │   ├── layout/           # Header, Footer, Navigation
│   │   ├── home/             # Homepage sections
│   │   ├── product/          # Product cards, grids, details
│   │   ├── cart/             # Cart drawer
│   │   └── collection/       # Collection filters
│   │
│   ├── store/                # Zustand state management
│   │   ├── cartStore.ts      # Shopping cart state
│   │   └── wishlistStore.ts  # Wishlist state
│   │
│   ├── lib/                  # Utilities and helpers
│   │   ├── products.ts       # Product data and functions
│   │   └── utils.ts          # Helper functions
│   │
│   └── styles/               # Global styles
│       └── globals.css       # Tailwind + custom styles
│
├── public/                   # Static assets
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── package.json             # Dependencies

```

## Features Implemented

### Homepage
- ✅ Hero slider with auto-rotation
- ✅ Featured collections grid
- ✅ Best sellers section
- ✅ Benefits/features section
- ✅ Product showcase
- ✅ Shop by category
- ✅ Customer testimonials
- ✅ Instagram feed
- ✅ Newsletter signup

### Collection/Shop Page
- ✅ Product grid (responsive)
- ✅ Filter sidebar (price, size, color, category, material)
- ✅ Sort options
- ✅ Mobile-friendly filters

### Product Detail Page
- ✅ Image gallery with thumbnails
- ✅ Variant selectors (size, color)
- ✅ Quantity selector
- ✅ Add to cart
- ✅ Add to wishlist
- ✅ Product features
- ✅ Related products
- ✅ Shipping/return info

### Cart System
- ✅ Cart drawer (slide-in panel)
- ✅ Cart page
- ✅ Update quantities
- ✅ Remove items
- ✅ Discount code input
- ✅ Persistent cart (localStorage)

### Checkout
- ✅ Contact information
- ✅ Shipping address form
- ✅ Shipping method selection
- ✅ Payment UI
- ✅ Order summary sidebar

### Customer Account
- ✅ Login page
- ✅ Register page
- ✅ Account dashboard
- ✅ Order history

### Global Features
- ✅ Announcement bar
- ✅ Sticky header
- ✅ Mega menu navigation
- ✅ Mobile hamburger menu
- ✅ Search functionality
- ✅ Footer with links
- ✅ Responsive design
- ✅ Black & white theme

## Customization

### Colors
Edit `tailwind.config.js` to change the color scheme:

```js
colors: {
  primary: '#000000',    // Main brand color
  secondary: '#ffffff',  // Secondary color
  accent: '#333333',     // Accent color
  muted: '#666666',      // Muted text
  border: '#e5e5e5',     // Border color
}
```

### Products
Edit `src/lib/products.ts` to add/modify products.

### Images
Replace placeholder images with your own product images.

## Next Steps

1. Connect to a real backend API
2. Integrate payment gateway (Stripe, PayPal)
3. Add user authentication
4. Implement order processing
5. Add product reviews system
6. Set up email notifications
7. Add analytics tracking
8. Optimize images
9. Add SEO metadata
10. Deploy to production

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Other Platforms
Build the project and deploy the `.next` folder:
```bash
npm run build
```

## Support

For issues or questions, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
