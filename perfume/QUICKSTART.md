# 🚀 Quick Start Guide

## Installation (5 minutes)

### Step 1: Install Dependencies
```bash
cd shopify
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
Navigate to [http://localhost:3000](http://localhost:3000)

That's it! Your premium socks store is now running.

## 📁 What You Get

A complete Shopify-level ecommerce storefront with:

- ✅ Homepage with hero slider, collections, best sellers
- ✅ Product listing page with filters
- ✅ Product detail page with variants
- ✅ Shopping cart (drawer + page)
- ✅ Checkout flow
- ✅ Customer account pages
- ✅ Search functionality
- ✅ Mobile responsive design
- ✅ Black & white premium theme

## 🎨 Customization

### Change Colors
Edit `tailwind.config.js`:
```js
colors: {
  primary: '#000000',    // Change to your brand color
  secondary: '#ffffff',
  accent: '#333333',
}
```

### Add Products
Edit `src/lib/products.ts` to add your products.

### Replace Images
Update image URLs in components with your product images.

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🌐 Deploy

### Vercel (Easiest)
```bash
npm install -g vercel
vercel
```

### Other Platforms
Deploy the `.next` folder after running `npm run build`

## 📚 Documentation

- See `SETUP.md` for detailed setup instructions
- See `FEATURES.md` for complete feature list
- See `README.md` for project overview

## 🆘 Need Help?

Check the documentation:
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)

## 🎯 What's Next?

1. Replace placeholder images with real product photos
2. Customize colors and branding
3. Add your product data
4. Connect to a backend API
5. Integrate payment processing
6. Deploy to production

Enjoy building your premium socks store! 🧦
