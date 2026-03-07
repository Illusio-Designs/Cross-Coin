# 🚀 Luxury Jewellery Store - Quick Start

## Installation (5 minutes)

### Step 1: Install Dependencies
```bash
cd jewellery
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

The store will run on **port 3001** (different from the socks store on port 3000)

### Step 3: Open in Browser
Navigate to [http://localhost:3001](http://localhost:3001)

## 🎨 Color Scheme

This luxury jewelry store features an elegant **Gold & Black** theme:

- **Primary Black**: #000000 - Sophistication and elegance
- **Gold**: #D4AF37 - Luxury and premium quality  
- **Dark Gold**: #B8941F - Hover states
- **Light Gold**: #F4E4C1 - Subtle backgrounds
- **Accent Gold**: #C9A961 - Highlights

## 💎 What's Included

A complete luxury jewelry ecommerce storefront with:

- ✅ Homepage with elegant hero slider
- ✅ Product collections (Rings, Necklaces, Earrings, Bracelets, Watches)
- ✅ Product detail pages with material selection
- ✅ Shopping cart with gold accents
- ✅ Checkout flow
- ✅ Customer account pages
- ✅ Search functionality
- ✅ Wishlist feature
- ✅ Mobile responsive design
- ✅ Luxurious gold & black theme
- ✅ Elegant serif typography (Playfair Display)

## 📦 Product Categories

- **Rings** - Engagement, Wedding, Fashion
- **Necklaces** - Pendants, Chains, Pearls
- **Earrings** - Studs, Drops, Hoops
- **Bracelets** - Tennis, Bangles, Chains
- **Watches** - Luxury timepieces
- **Wedding Jewelry** - Bridal collections

## 🎯 Key Features

### Design
- Luxurious gold and black color palette
- Elegant serif fonts for headings
- Shimmer effects on gold elements
- Premium product photography
- Sophisticated hover animations

### Functionality
- Material selection (18K Gold, White Gold, Platinum)
- Ring size selection
- High-value product pricing ($1,000 - $10,000+)
- Wishlist with heart icon
- Cart with gold accents
- Persistent state management

## 🛠️ Customization

### Change Colors
Edit `tailwind.config.js`:
```js
colors: {
  gold: '#D4AF37',      // Main gold color
  darkGold: '#B8941F',  // Hover states
  lightGold: '#F4E4C1', // Backgrounds
}
```

### Add Products
Edit `src/lib/products.ts` to add your jewelry products.

### Replace Images
Update image URLs with your actual product photography.

## 🌐 Deploy

### Vercel (Easiest)
```bash
npm install -g vercel
vercel
```

### Other Platforms
```bash
npm run build
npm start
```

## 📚 Documentation

- See `README.md` for project overview
- Product data in `src/lib/products.ts`
- Color scheme in `tailwind.config.js`
- State management in `src/store/`

## 🎁 Special Features

1. **Luxury Pricing** - Products range from $1,299 to $8,999
2. **Material Selection** - Choose between 18K Gold, White Gold, Platinum
3. **Ring Sizing** - Size selection for rings
4. **Gift Wrapping** - Complimentary on all orders
5. **Free Shipping** - On orders over $500

## 🆘 Need Help?

Check the documentation:
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)

## 🎯 What's Next?

1. Replace placeholder images with professional jewelry photography
2. Customize gold shades to match your brand
3. Add your product catalog
4. Connect to a backend API
5. Integrate payment processing (Stripe recommended for luxury goods)
6. Add authentication
7. Deploy to production

Enjoy building your luxury jewelry store! 💎✨
