# Crosscoin Frontend - Complete Issues List

**Generated:** 2026-05-27  
**Total Issues:** 31 identified  
**Status:** Ready for action

---

## CRITICAL ISSUES (🔴) - FIX IMMEDIATELY

### Issue #1: Zero Error Boundaries Implemented
- **Severity:** 🔴 CRITICAL
- **Category:** Error Handling
- **Impact:** App crashes on component errors
- **Affected Files:** All pages (158 components)
- **Status:** ❌ NOT IMPLEMENTED
- **Recommendation:** Add ErrorBoundary component wrapper at app level and page level
- **Time to Fix:** 2 hours

---

### Issue #2: 66 State Variables in Orders Page
- **Severity:** 🔴 CRITICAL  
- **Category:** State Management
- **File:** `pages/dashboard/orders/orders.jsx:21-66`
- **Impact:** Component is unmaintainable, excessive re-renders
- **Details:** Single component has:
  - orders, loading, error
  - filterValue, currentPage, itemsPerPage, totalPages, totalOrders
  - isViewModalOpen, selectedOrder
  - paymentTypeFilter, statusFilter, paymentStatusFilter
  - sortBy, sortOrder
  - cancelPrompt, confirmPrompt
  - allOrdersStats (11+ nested)
  - syncingOrders, syncingAll
  - exportStartDate, exportEndDate, isExporting
  - isAwbModalOpen, awbOrderId, awbNumber, courierName
  - selectedOrders
  - isDownloadingBulk
  - labelStats, statsStartDate, statsEndDate, refreshingStatus
  - isManualOrderOpen, brandFilter, brands
  - generatingLabel, highlightedRows
  - labelPollTimer, debouncedSearch
- **Recommendation:** Refactor using useReducer or split into sub-components
- **Time to Fix:** 8 hours

---

### Issue #3: Hardcoded API URLs
- **Severity:** 🔴 CRITICAL
- **Category:** API/Configuration
- **Files:** 
  - `pages/dashboard/analytics/utmAnalytics.jsx` - Line ~40
  - `pages/dashboard/media/gallery.jsx` - Line ~30
- **Impact:** Maintenance burden, changes require code edits
- **Details:**
  ```jsx
  // Bad:
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
  let analyticsUrl = `${apiUrl}/api/utm/analytics`;
  ```
- **Recommendation:** Create `analyticsService` and `galleryService` like other services
- **Time to Fix:** 4 hours

---

### Issue #4: Missing Loading/Error States (Critical Pages)
- **Severity:** 🔴 CRITICAL
- **Category:** UX/State Management
- **Files:**
  - `pages/dashboard/coupon/coupons.jsx` - No feedback during fetch
  - `pages/dashboard/shipping/shippingFees.jsx` - No feedback
  - `pages/dashboard/shipping/shippingSettings.jsx` - No feedback
  - `pages/dashboard/reviews/reviews.jsx` - No feedback
  - `pages/dashboard/policies.jsx` - No feedback
  - And 20+ more pages
- **Impact:** Users don't know if data is loading, silent failures
- **Recommendation:** Add try-catch and loading/error state to all async operations
- **Time to Fix:** 8 hours (for critical pages)

---

### Issue #5: Missing PropTypes in Components
- **Severity:** 🔴 CRITICAL
- **Category:** Type Safety
- **Count:** 20+ components without PropTypes
- **Affected Directories:**
  - `components/Dashboard/*`
  - `components/ui/*`
  - `components/products/*`
- **Impact:** No runtime type checking, prop errors go undetected
- **Recommendation:** Add PropTypes to all reusable components
- **Time to Fix:** 6 hours

---

### Issue #6: Missing Key Props in Dynamic Lists
- **Severity:** 🔴 CRITICAL
- **Category:** React Best Practices
- **Files:**
  - `pages/About.jsx:line 40-60` - 4 .map() without keys
  - `pages/blog-details.jsx:line 80-120` - Multiple sections without keys
  - `pages/blog.jsx:line 50-80` - Category list without keys
  - 15+ more instances
- **Impact:** React can't track items, causes bugs on reorder/delete
- **Example:**
  ```jsx
  {stats.map((s, i) => (
    <StatCard stat={s} />  // ❌ Missing key
  ))}
  ```
- **Recommendation:** Add `key={item.id}` to all mapped elements
- **Time to Fix:** 3 hours

---

### Issue #7: No Promise Error Handlers
- **Severity:** 🔴 CRITICAL
- **Category:** Error Handling  
- **Count:** 21+ locations
- **Impact:** Unhandled rejections, silent failures
- **Example:**
  ```jsx
  orderService.generateLabel(orderId)
    .then(result => setLabel(result))
    // ❌ Missing .catch()
  ```
- **Recommendation:** Add .catch() to all promise chains or use async-await with try-catch
- **Time to Fix:** 5 hours

---

### Issue #8: Console Statements in Production
- **Severity:** 🔴 CRITICAL
- **Category:** Code Quality
- **Count:** 21 instances
- **Impact:** Debug code in production, potential data leaks
- **Examples:**
  - Various console.log statements
  - console.error without proper formatting
- **Recommendation:** Remove all console.log statements
- **Time to Fix:** 1 hour

---

## HIGH PRIORITY ISSUES (🟡) - FIX THIS WEEK

### Issue #9: 149+ useEffect Hooks Without Proper Cleanup
- **Severity:** 🟡 HIGH
- **Category:** Memory Leaks
- **Files:** 149 useEffect hooks across codebase
- **Impact:** Memory leaks, stale closures, infinite loops
- **Example:**
  ```jsx
  useEffect(() => {
    window.addEventListener('scroll', handler);
    // ❌ Missing cleanup function
  }, []); // ❌ Missing dependencies
  ```
- **Recommendation:** Add dependency arrays and cleanup functions
- **Time to Fix:** 10 hours

---

### Issue #10: No API Response Validation
- **Severity:** 🟡 HIGH
- **Category:** API Layer
- **Files:** `services/index.js` and all API service files
- **Impact:** App crashes on unexpected response format
- **Example:**
  ```jsx
  const data = await api.get('/orders');
  setOrders(data.orders); // ❌ No null check
  ```
- **Recommendation:** Validate response schema before using
- **Time to Fix:** 6 hours

---

### Issue #11: No Request Cancellation (Memory Leak Risk)
- **Severity:** 🟡 HIGH
- **Category:** Performance
- **Files:** All async service calls
- **Impact:** Memory leaks from unmounted components
- **Example:**
  ```jsx
  useEffect(() => {
    fetch('/api/data').then(r => setData(r));
    // ❌ No AbortController
  }, [userId]);
  ```
- **Recommendation:** Use AbortController for all API requests
- **Time to Fix:** 4 hours

---

### Issue #12: Inconsistent Error Handling Patterns
- **Severity:** 🟡 HIGH
- **Category:** Code Quality
- **Impact:** Difficult debugging, inconsistent UX
- **Details:**
  - Some use try-catch
  - Some use .catch()
  - Some silent fail
  - No global error logger
- **Recommendation:** Standardize on async-await with try-catch
- **Time to Fix:** 5 hours

---

### Issue #13: Missing Form Validation
- **Severity:** 🟡 HIGH
- **Category:** UX/Data Validation
- **Files:** All form components
- **Impact:** Invalid data submitted, server errors
- **Missing:**
  - Client-side validation
  - Error message display
  - Field highlighting
  - Required field indication
- **Time to Fix:** 8 hours

---

### Issue #14: No Loading Skeletons/Placeholders
- **Severity:** 🟡 HIGH
- **Category:** UX
- **Files:** Dashboard pages with tables/lists
- **Impact:** Flickering, poor perceived performance
- **Missing in:**
  - Products table
  - Orders table
  - Categories table
  - Most dashboard pages
- **Time to Fix:** 6 hours

---

### Issue #15: Rate Limiting on API Calls
- **Severity:** 🟡 HIGH
- **Category:** Performance
- **Issues:**
  - Search doesn't debounce properly
  - Click handlers trigger multiple API calls
  - Button clicks not disabled during loading
  - No request throttling
- **Time to Fix:** 3 hours

---

### Issue #16: Missing Accessibility Attributes
- **Severity:** 🟡 HIGH
- **Category:** Accessibility
- **Count:** 100+ components affected
- **Missing:**
  - aria-labels on icon buttons
  - aria-expanded on collapse components
  - role attributes for custom components
  - alt text on images
  - aria-live for dynamic updates
- **Impact:** Non-keyboard navigable, screen reader issues
- **Time to Fix:** 8 hours

---

### Issue #17: No Global Error Handler
- **Severity:** 🟡 HIGH
- **Category:** Error Handling
- **Impact:** Errors not caught at application level
- **Missing:**
  - App-wide error boundary
  - Global error logger
  - 500 error page handler
  - Network error handling
  - Timeout handling
- **Time to Fix:** 4 hours

---

### Issue #18: Hardcoded Environment Variables
- **Severity:** 🟡 HIGH
- **Category:** Configuration
- **Examples:**
  - `process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX"`
  - API URLs with hardcoded defaults
  - Feature flags not centralized
- **Time to Fix:** 2 hours

---

### Issue #19: Image Optimization Missing
- **Severity:** 🟡 HIGH
- **Category:** Performance
- **Missing:**
  - next/image not used consistently
  - No lazy loading for below-fold images
  - No image compression
  - Missing placeholder blur
- **Impact:** Large bundle, slow load
- **Time to Fix:** 6 hours

---

### Issue #20: Unused/Duplicate State Variables
- **Severity:** 🟡 HIGH
- **Category:** Code Quality
- **Impact:** Confusing code, accidental re-renders
- **Details:**
  - State set but never used
  - State not updated despite being defined
  - Duplicate state for same data
- **Time to Fix:** 4 hours

---

## MEDIUM PRIORITY ISSUES (🟢) - FIX NEXT MONTH

### Issue #21: Large Components (500+ lines)
- **Severity:** 🟢 MEDIUM
- **Files:**
  - `pages/dashboard/products/products.jsx` - 500+ lines
  - `pages/dashboard/orders/orders.jsx` - 500+ lines
- **Impact:** Hard to maintain, difficult to test
- **Time to Fix:** 8 hours per component

---

### Issue #22: Missing JSDoc Comments
- **Severity:** 🟢 MEDIUM
- **Files:** Service functions
- **Impact:** No IDE autocomplete hints
- **Time to Fix:** 4 hours

---

### Issue #23: Inconsistent Naming Conventions
- **Severity:** 🟢 MEDIUM
- **Examples:**
  - `isLoading` vs `loading`
  - `setIsOpen` vs `setOpen`
  - `handleClick` vs `onClick`
- **Time to Fix:** 3 hours

---

### Issue #24: No Performance Monitoring
- **Severity:** 🟢 MEDIUM
- **Missing:**
  - Lighthouse CI integration
  - Performance metrics tracking
  - Bundle size monitoring
  - Component render profiling
- **Time to Fix:** 8 hours

---

### Issue #25: Memory Leak Risks (Event Listeners)
- **Severity:** 🟢 MEDIUM
- **Issues:**
  - Window scroll listeners not cleaned up
  - Resize listeners not cleaned up
  - Timer intervals not cleared
  - WebSocket connections not closed
- **Time to Fix:** 5 hours

---

### Issue #26: No Error Retry Logic
- **Severity:** 🟢 MEDIUM
- **Missing:**
  - Exponential backoff
  - Retry button for failed operations
  - Max retry limits
- **Time to Fix:** 4 hours

---

### Issue #27: No Feature Flags
- **Severity:** 🟢 MEDIUM
- **Impact:** Deployments require code changes
- **Missing:**
  - Feature flag system
  - A/B testing capability
  - Gradual rollout mechanism
- **Time to Fix:** 8 hours

---

### Issue #28: Missing Analytics Events
- **Severity:** 🟢 MEDIUM
- **Missing:**
  - Page view tracking
  - Click tracking
  - Form submission tracking
  - Error tracking
- **Time to Fix:** 6 hours

---

### Issue #29: Duplicate Utility Functions
- **Severity:** 🟢 MEDIUM
- **Examples:**
  - Multiple date formatters
  - Multiple API error handlers
  - Multiple loading state handlers
- **Time to Fix:** 3 hours

---

### Issue #30: No Test Coverage
- **Severity:** 🟢 MEDIUM
- **Missing:**
  - Unit tests
  - Integration tests
  - E2E tests
  - Visual regression tests
- **Time to Fix:** 20+ hours (ongoing)

---

### Issue #31: No Loading Indicators During Navigation
- **Severity:** 🟢 MEDIUM
- **Missing:**
  - Page load progress bar
  - Loading skeleton on navigation
  - Transition animations
- **Impact:** No feedback during page transitions
- **Time to Fix:** 3 hours

---

## SUMMARY TABLE

| # | Issue | Severity | Category | Time | Status |
|---|-------|----------|----------|------|--------|
| 1 | Zero Error Boundaries | 🔴 | Error Handling | 2h | ❌ |
| 2 | 66 State Variables | 🔴 | State Mgmt | 8h | ❌ |
| 3 | Hardcoded URLs | 🔴 | API | 4h | ❌ |
| 4 | Missing Load/Error States | 🔴 | UX | 8h | ❌ |
| 5 | Missing PropTypes | 🔴 | Type Safety | 6h | ❌ |
| 6 | Missing Keys in Lists | 🔴 | React | 3h | ❌ |
| 7 | No Promise Handlers | 🔴 | Error | 5h | ❌ |
| 8 | Console Statements | 🔴 | Quality | 1h | ❌ |
| 9 | useEffect Cleanup | 🟡 | Memory | 10h | ❌ |
| 10 | No Response Validation | 🟡 | API | 6h | ❌ |
| 11 | No Request Cancel | 🟡 | Memory | 4h | ❌ |
| 12 | Inconsistent Errors | 🟡 | Quality | 5h | ❌ |
| 13 | No Form Validation | 🟡 | UX | 8h | ❌ |
| 14 | No Skeletons | 🟡 | UX | 6h | ❌ |
| 15 | No Rate Limiting | 🟡 | Performance | 3h | ❌ |
| 16 | No Accessibility | 🟡 | A11y | 8h | ❌ |
| 17 | No Global Handler | 🟡 | Error | 4h | ❌ |
| 18 | Hardcoded Env Vars | 🟡 | Config | 2h | ❌ |
| 19 | No Image Optimization | 🟡 | Performance | 6h | ❌ |
| 20 | Unused State | 🟡 | Quality | 4h | ❌ |
| 21 | Large Components | 🟢 | Maintenance | 8h | ❌ |
| 22 | No JSDoc | 🟢 | Documentation | 4h | ❌ |
| 23 | Naming Inconsistency | 🟢 | Quality | 3h | ❌ |
| 24 | No Perf Monitor | 🟢 | Performance | 8h | ❌ |
| 25 | Memory Leak Risk | 🟢 | Memory | 5h | ❌ |
| 26 | No Retry Logic | 🟢 | Error | 4h | ❌ |
| 27 | No Feature Flags | 🟢 | DevOps | 8h | ❌ |
| 28 | No Analytics | 🟢 | Tracking | 6h | ❌ |
| 29 | Duplicate Utils | 🟢 | Maintenance | 3h | ❌ |
| 30 | No Tests | 🟢 | Testing | 20h+ | ❌ |
| 31 | No Nav Indicators | 🟢 | UX | 3h | ❌ |

**Total Time to Fix:** 160+ hours  
**Critical Issues:** 8 (42 hours)  
**High Priority:** 12 (78 hours)  
**Medium Priority:** 11 (40+ hours)

---

## PHASE-BASED FIX PLAN

### Phase 1: Critical Foundation (1 Week)
- Issue #1: Add Error Boundaries (2h)
- Issue #2: Refactor Orders Component (8h)
- Issue #3: Remove Hardcoded URLs (4h)
- Issue #4: Add Load/Error States (8h)
- Issue #5: Add PropTypes (6h)
- Issue #6: Add Missing Keys (3h)
- Issue #7: Add Promise Handlers (5h)
- Issue #8: Remove Console Logs (1h)
- **Total:** 37 hours

### Phase 2: Quality Improvements (1 Week)
- Issue #9: useEffect Cleanup (10h)
- Issue #10: Response Validation (6h)
- Issue #11: Request Cancellation (4h)
- Issue #12: Standardize Error Handling (5h)
- Issue #13: Form Validation (8h)
- Issue #14: Add Skeletons (6h)
- **Total:** 39 hours

### Phase 3: Polish & Optimization (1 Week)
- Issue #15-20: Various (40+ hours)
- Issue #21-31: Additional improvements (20+ hours)

---

## QUICK WINS (Can be done in 1 hour each)

1. ✅ Remove all console.log statements (Issue #8)
2. ✅ Add aria-labels to icon buttons (Issue #16)
3. ✅ Fix missing keys in .map() calls (Issue #6)
4. ✅ Remove duplicate utility functions (Issue #29)
5. ✅ Standardize naming conventions (Issue #23)

---

## CRITICAL PATH

Start with these issues to unblock other fixes:

1. **Error Boundaries** → Enables safe refactoring
2. **Refactor Orders** → Reduces complexity
3. **PropTypes** → Catches prop bugs
4. **Promise Handlers** → Fixes silent failures
5. **Loading States** → Improves UX

---

**Generated:** 2026-05-27  
**Status:** Ready for Development  
**Next Step:** Start with Priority 1 Critical Issues

