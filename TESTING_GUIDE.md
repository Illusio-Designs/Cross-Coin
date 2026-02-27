# Testing Guide for Performance Optimizations

## Quick Start

```bash
cd Crosscoin
npm run dev
```

Visit: http://localhost:3000

---

## ✅ What to Test

### 1. Grey Skeleton Loading (Most Important)

**Test on Home Page:**
1. Open http://localhost:3000
2. Refresh the page (Ctrl+Shift+R for hard refresh)
3. Watch for grey skeleton on:
   - ✅ Product images (should show grey shimmer)
   - ✅ Category images (should show grey shimmer)
   - ✅ Thumbnail images (should show grey shimmer)
   - ❌ Hero slider (should NOT show skeleton - loads directly)

**Expected Behavior:**
- Grey shimmer appears immediately
- Image fades in smoothly when loaded
- No layout shift
- Same size and position as before

**Test on Products Page:**
1. Visit http://localhost:3000/Products
2. Scroll through products
3. Verify grey skeleton on product cards

**Test on Product Details:**
1. Click any product
2. Verify grey skeleton on:
   - Main product image
   - Thumbnail images
   - Related product images

---

### 2. CSS Loading (Check All Pages)

**Pages to Test:**
- ✅ Home (/)
- ✅ Products (/Products)
- ✅ Product Details (/ProductDetails?slug=any-product)
- ✅ Cart/Checkout (/UnifiedCheckout)
- ✅ Login (/login)
- ✅ Wishlist (/Wishlist)
- ✅ Thank You (/ThankYou)
- ✅ Policy (/policy?name=privacy-policy)
- ✅ Dashboard (/dashboard) - if you have admin access

**What to Check:**
- All styles load correctly
- No missing styles
- No layout breaks
- Colors are correct
- Spacing is correct
- Responsive design works

---

### 3. API Caching

**Test Caching:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit home page
4. Note the API calls (sliders, categories)
5. Navigate away and come back
6. Check console - should see "loaded from cache"
7. Verify NO duplicate API calls in Network tab

**Expected Console Messages:**
```
Fetching sliders from API...
Sliders data cached successfully
Fetching categories from API...
Categories data cached successfully

// On second visit:
Sliders data loaded from cache
Categories data loaded from cache
```

---

### 4. Performance Testing

**Using Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Performance" only
4. Choose "Mobile" device
5. Click "Analyze page load"

**Target Scores:**
- Performance: 80+ (was ~60)
- FCP: <1.5s (was ~2.5s)
- LCP: <2.0s (was ~3.5s)
- CLS: <0.1 (was ~0.2)

**Using Network Throttling:**
1. DevTools → Network tab
2. Select "Fast 3G" or "Slow 3G"
3. Refresh page
4. Verify grey skeletons appear immediately
5. Check load time

---

### 5. Functional Testing

**Critical User Flows:**

**Flow 1: Browse & Add to Cart**
1. Visit home page
2. Click on a product
3. Select size/color
4. Add to cart
5. Verify cart drawer opens
6. Check cart count updates

**Flow 2: Checkout Process**
1. Add items to cart
2. Click "Checkout"
3. Fill shipping details
4. Proceed to payment
5. Verify all steps work

**Flow 3: Wishlist**
1. Click heart icon on product
2. Visit wishlist page
3. Verify product appears
4. Remove from wishlist
5. Verify it's removed

**Flow 4: Search & Filter**
1. Use search bar
2. Apply filters
3. Sort products
4. Verify results update

---

## 🐛 Common Issues & Solutions

### Issue 1: Grey Skeleton Not Showing
**Cause:** Browser cache
**Solution:** Hard refresh (Ctrl+Shift+R)

### Issue 2: Styles Missing
**Cause:** CSS import path issue
**Solution:** Check browser console for 404 errors

### Issue 3: API Calls Not Cached
**Cause:** Cache not initialized
**Solution:** Clear browser cache and reload

### Issue 4: Images Not Loading
**Cause:** API URL mismatch
**Solution:** Check .env file for NEXT_PUBLIC_API_URL

---

## 📊 Performance Comparison

### Before vs After

**Measure These Metrics:**

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| FCP | ~2.5s | <1.5s | Lighthouse |
| LCP | ~3.5s | <2.0s | Lighthouse |
| TTI | ~4.0s | <2.5s | Lighthouse |
| CLS | 0.2 | <0.1 | Lighthouse |
| Bundle Size | ~800KB | ~500KB | Network tab |
| API Calls | 4+ | 4 (first), 0 (cached) | Network tab |

---

## 🔍 Visual Inspection Checklist

### Home Page
- [ ] Hero slider loads without skeleton (correct)
- [ ] Product images show grey skeleton
- [ ] Category images show grey skeleton
- [ ] Testimonials load correctly
- [ ] Footer loads correctly
- [ ] All styles intact

### Products Page
- [ ] Product grid shows skeletons
- [ ] Filters work correctly
- [ ] Pagination works
- [ ] Product cards styled correctly

### Product Details
- [ ] Main image shows skeleton
- [ ] Thumbnails show skeleton
- [ ] Size/color selectors work
- [ ] Add to cart works
- [ ] Buy now works

### Checkout
- [ ] Cart items display correctly
- [ ] Shipping form works
- [ ] Payment integration works
- [ ] Order summary correct

### Dashboard (Admin)
- [ ] All dashboard pages load
- [ ] Tables display correctly
- [ ] Forms work
- [ ] No style issues

---

## 🚀 Production Testing

### Before Deploying:

1. **Build Test:**
```bash
npm run build
npm start
```
Visit http://localhost:3000 and test everything

2. **Bundle Analysis:**
```bash
npm run analyze
```
Check bundle sizes are reduced

3. **Type Check:**
```bash
npm run type-check
```
Ensure no TypeScript errors

4. **Lint Check:**
```bash
npm run lint
```
Fix any linting issues

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

✅ Grey Skeleton Loading
- Home page: [ ] Pass [ ] Fail
- Products page: [ ] Pass [ ] Fail
- Product details: [ ] Pass [ ] Fail
- Notes: ___________

✅ CSS Loading
- All pages styled: [ ] Pass [ ] Fail
- No layout breaks: [ ] Pass [ ] Fail
- Responsive works: [ ] Pass [ ] Fail
- Notes: ___________

✅ API Caching
- Cache working: [ ] Pass [ ] Fail
- No duplicate calls: [ ] Pass [ ] Fail
- Console messages: [ ] Pass [ ] Fail
- Notes: ___________

✅ Performance
- Lighthouse score: ___/100
- FCP: ___s
- LCP: ___s
- CLS: ___
- Notes: ___________

✅ Functionality
- Add to cart: [ ] Pass [ ] Fail
- Checkout: [ ] Pass [ ] Fail
- Wishlist: [ ] Pass [ ] Fail
- Search: [ ] Pass [ ] Fail
- Notes: ___________

Overall Status: [ ] PASS [ ] FAIL
```

---

## 🎯 Success Criteria

**Must Pass:**
- ✅ All pages load without errors
- ✅ Grey skeleton appears on images (except sliders)
- ✅ All styles intact (no visual changes)
- ✅ All functionality works
- ✅ Performance improved (Lighthouse score +10)

**Nice to Have:**
- ✅ LCP under 1.5s
- ✅ Cache hit rate >80%
- ✅ Bundle size reduced by 30%

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify .env configuration
4. Clear browser cache
5. Try incognito mode

---

**Happy Testing! 🚀**
