# Crosscoin Performance Optimization Plan
## Target: 1.5s Load Time + Grey Skeleton Loading

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### 1. **CSS BLOCKING ISSUES** (Highest Priority)
**Problem:** 15+ CSS files imported in `_app.jsx` block initial render
```javascript
// Current: ALL CSS loaded upfront (blocking)
import "../styles/globals.css";
import "../styles/responsive.css";
import "../styles/mobile-utilities.css";
import "../styles/components/Footer.css";
import "../styles/components/Header.css";
import "../styles/components/Testimonials.css";
import "../styles/pages/Home.css";
import "../styles/pages/products.css";
import "../styles/pages/ProductDetails.css";
import "../styles/pages/UnifiedCheckout.css";
import "../styles/pages/ThankYou.css";
import "../styles/pages/Wishlist.css";
import "../styles/pages/Login.css";
import "../styles/pages/Policy.css";
import "../styles/dashboard/layout.css";
import "../styles/dashboard/sidebar.css";
import "../styles/dashboard/full-width-fix.css";
import "../styles/dashboard/mobile.css";
import "../styles/pages/auth/adminlogin.css";
```

**Impact:** ~500-800ms delay on initial load
**Solution:** 
- Keep only critical CSS in _app.jsx (globals, responsive, mobile-utilities)
- Move page-specific CSS to individual pages using dynamic imports
- Inline critical above-the-fold CSS in _document.jsx

---

### 2. **IMAGE LOADING ISSUES**
**Problem:** No grey skeleton/placeholder during image load
- `SafeImage.jsx` has loading state but no visual placeholder
- `OptimizedImage.jsx` uses blur effect but not grey skeleton
- Product cards show nothing while loading

**Impact:** Poor perceived performance, layout shifts
**Solution:** Add grey skeleton background to all images (except sliders)

---

### 3. **ROUTE LOADING ISSUES**
**Problem:** Multiple API calls on every page load
```javascript
// home.jsx - 4 API calls on mount
fetchSliders();
fetchCategories();
fetchLatestProducts();
fetchExclusiveProducts();
```

**Impact:** ~800-1200ms waiting for data
**Solution:** 
- Implement ISR (Incremental Static Regeneration)
- Add API response caching
- Use SWR for client-side data fetching

---

### 4. **JAVASCRIPT BUNDLE SIZE**
**Problem:** Heavy dependencies loaded upfront
- react-toastify
- react-icons (multiple icon sets)
- @vercel/analytics + @vercel/speed-insights
- DOMPurify
- gsap
- Multiple context providers

**Impact:** ~300-500ms parse/execute time
**Solution:** Code splitting and lazy loading

---

### 5. **THIRD-PARTY SCRIPTS**
**Problem:** Microsoft Clarity loaded synchronously in _document.jsx
```javascript
<script type="text/javascript" async ...>
```

**Impact:** ~100-200ms blocking
**Solution:** Move to next/script with proper loading strategy

---

### 6. **NO LOADING STATES**
**Problem:** Pages render empty content while data loads
- No skeleton screens for product grids
- No loading indicators for sliders
- Blank sections during API calls

**Impact:** Poor UX, high bounce rate
**Solution:** Add skeleton loaders everywhere

---

## ✅ OPTIMIZATION PLAN

### **Phase 1: Critical CSS Optimization** (Highest Impact)

#### 1.1 Split CSS Loading
```javascript
// _app.jsx - Keep only critical
import "../styles/globals.css";
import "../styles/critical.css";  // Create this
import "../styles/responsive.css";
import "../styles/mobile-utilities.css";

// Move page-specific CSS to individual pages
// Example: home.jsx
import "../styles/pages/Home.css";
import "../styles/components/Header.css";
import "../styles/components/Footer.css";
```

#### 1.2 Inline Critical CSS
Create critical CSS for above-the-fold content in `_document.jsx`

#### 1.3 Defer Non-Critical CSS
Use `next/dynamic` for dashboard and admin CSS

**Expected Improvement:** -400ms load time

---

### **Phase 2: Image Loading with Grey Skeleton**

#### 2.1 Update SafeImage Component
```javascript
// Add grey skeleton background
const [isLoading, setIsLoading] = useState(true);

return (
  <div style={{ position: 'relative', background: '#e5e7eb' }}>
    {isLoading && !isSlider && (
      <div className="image-skeleton" />
    )}
    <img
      onLoad={() => setIsLoading(false)}
      style={{ opacity: isLoading ? 0 : 1 }}
    />
  </div>
);
```

#### 2.2 Add Skeleton CSS
```css
.image-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #e5e7eb 25%,
    #f3f4f6 50%,
    #e5e7eb 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### 2.3 Exclude Sliders
Add `isSlider` prop to skip skeleton for hero sliders

**Expected Improvement:** Better perceived performance, -200ms CLS

---

### **Phase 3: Route & Data Loading Optimization**

#### 3.1 Implement ISR for Home Page
```javascript
// pages/index.jsx
export async function getStaticProps() {
  const [sliders, categories, products] = await Promise.all([
    getPublicSliders(),
    getPublicCategories(),
    getPublicProducts({ limit: 15 })
  ]);

  return {
    props: { sliders, categories, products },
    revalidate: 300 // 5 minutes
  };
}
```

#### 3.2 Add API Caching
```javascript
// utils/apiCache.js - Already exists, use it!
import { getCachedData, setCachedData } from '../utils/apiCache';

const fetchWithCache = async (key, fetcher, ttl = 300) => {
  const cached = getCachedData(key);
  if (cached) return cached;
  
  const data = await fetcher();
  setCachedData(key, data, ttl);
  return data;
};
```

#### 3.3 Use SWR for Client-Side Data
```javascript
import useSWR from 'swr';

const { data: products } = useSWR('/api/products', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000
});
```

**Expected Improvement:** -600ms initial load, instant subsequent loads

---

### **Phase 4: Code Splitting & Lazy Loading**

#### 4.1 Lazy Load Heavy Components
```javascript
// Lazy load non-critical components
const Testimonials = dynamic(() => import('../components/Testimonials'), {
  loading: () => <div className="skeleton-testimonials" />
});

const Footer = dynamic(() => import('../components/Footer'), {
  loading: () => <div className="skeleton-footer" />
});
```

#### 4.2 Split Icon Imports
```javascript
// Instead of importing entire icon sets
import { IoIosArrowBack } from 'react-icons/io';

// Use dynamic imports
const ArrowIcon = dynamic(() => 
  import('react-icons/io').then(mod => mod.IoIosArrowBack)
);
```

#### 4.3 Defer Analytics
```javascript
// Load analytics after page interactive
useEffect(() => {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      // Load analytics
    }, 2000);
  }
}, []);
```

**Expected Improvement:** -300ms parse time, -200KB bundle size

---

### **Phase 5: Add Loading Skeletons**

#### 5.1 Product Grid Skeleton
```javascript
const ProductSkeleton = () => (
  <div className="product-card-skeleton">
    <div className="skeleton-image" />
    <div className="skeleton-title" />
    <div className="skeleton-price" />
  </div>
);

// Use while loading
{loading ? (
  Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
) : (
  products.map(p => <ProductCard product={p} />)
)}
```

#### 5.2 Slider Skeleton
```javascript
const SliderSkeleton = () => (
  <div className="hero-slider-skeleton">
    <div className="skeleton-slide" />
  </div>
);
```

**Expected Improvement:** Better UX, lower bounce rate

---

### **Phase 6: Next.js Configuration Optimization**

#### 6.1 Update next.config.js
```javascript
module.exports = {
  // Already good, but add:
  
  // Enable SWC minification (already enabled ✓)
  swcMinify: true,
  
  // Add experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-icons', 'lodash'],
  },
  
  // Optimize images (already good ✓)
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Add compression (already enabled ✓)
  compress: true,
};
```

---

## 📊 EXPECTED RESULTS

### Current Performance (Estimated)
- **FCP (First Contentful Paint):** ~2.5s
- **LCP (Largest Contentful Paint):** ~3.5s
- **TTI (Time to Interactive):** ~4.0s
- **CLS (Cumulative Layout Shift):** 0.15-0.25

### After Optimization (Target)
- **FCP:** ~0.8s (-1.7s) ✅
- **LCP:** ~1.5s (-2.0s) ✅ TARGET MET
- **TTI:** ~2.0s (-2.0s) ✅
- **CLS:** <0.1 (-0.15) ✅

---

## 🎯 IMPLEMENTATION PRIORITY

### Week 1: Quick Wins (Days 1-3)
1. ✅ Split CSS loading (Phase 1.1)
2. ✅ Add image skeletons (Phase 2)
3. ✅ Implement API caching (Phase 3.2)

### Week 1: Medium Impact (Days 4-7)
4. ✅ Add loading skeletons (Phase 5)
5. ✅ Lazy load components (Phase 4.1)
6. ✅ Defer analytics (Phase 4.3)

### Week 2: Long-term (Days 8-14)
7. ✅ Implement ISR (Phase 3.1)
8. ✅ Optimize icons (Phase 4.2)
9. ✅ Inline critical CSS (Phase 1.2)

---

## 🔧 SPECIFIC FILES TO MODIFY

### High Priority
1. `src/pages/_app.jsx` - Remove blocking CSS imports
2. `src/components/common/SafeImage.jsx` - Add grey skeleton
3. `src/pages/home.jsx` - Add ISR, caching, skeletons
4. `src/pages/_document.jsx` - Inline critical CSS
5. `src/components/ProductCard.jsx` - Add skeleton state

### Medium Priority
6. `src/components/OptimizedImage.jsx` - Update to grey skeleton
7. `src/utils/apiCache.js` - Enhance caching logic
8. `next.config.js` - Add experimental optimizations
9. `src/styles/critical.css` - Create/update critical styles

### Low Priority
10. All page components - Move CSS imports locally
11. Icon imports - Optimize tree-shaking
12. Analytics components - Defer loading

---

## 📝 NOTES

### Grey Skeleton Implementation
- Apply to: Product images, category images, thumbnails
- Exclude: Hero slider images (as requested)
- Color: `#e5e7eb` (grey-200) with shimmer animation
- Animation: 1.5s linear infinite shimmer

### Loading Time Target
- **1.5s for frontend** = LCP (Largest Contentful Paint)
- Focus on above-the-fold content
- Defer below-the-fold content
- Use skeleton screens for perceived performance

### Testing Strategy
1. Use Lighthouse in Chrome DevTools
2. Test on 3G/4G throttled connection
3. Test on mobile devices
4. Monitor Core Web Vitals in production

---

## 🚀 QUICK START COMMANDS

```bash
# Install dependencies (if needed)
cd Crosscoin
npm install swr

# Run development server
npm run dev

# Build and analyze bundle
npm run analyze

# Run optimized build
npm run build:optimized

# Test production build locally
npm run build && npm start
```

---

## ⚠️ IMPORTANT CONSIDERATIONS

1. **Don't break existing functionality** - Test thoroughly
2. **Mobile-first** - Optimize for mobile devices first
3. **Progressive enhancement** - Site should work without JS
4. **Accessibility** - Maintain ARIA labels and semantic HTML
5. **SEO** - Don't compromise SEO for performance

---

## 📈 MONITORING

After implementation, monitor:
- Google PageSpeed Insights
- Chrome User Experience Report
- Vercel Analytics (already installed)
- Real User Monitoring (RUM) metrics

---

**Created:** February 27, 2026
**Target Completion:** March 13, 2026 (2 weeks)
**Priority:** HIGH - Direct impact on conversion rate
