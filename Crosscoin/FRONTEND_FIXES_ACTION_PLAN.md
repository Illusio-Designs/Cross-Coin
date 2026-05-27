# Crosscoin Frontend - Fixes Action Plan

**Status:** Ready to implement  
**Estimated Time:** 2-3 weeks (with team)  
**Priority:** HIGH - Critical issues blocking production quality

---

## PHASE 1: CRITICAL FIXES (Week 1) - 37 hours

### Fix #1: Add Global Error Boundary
**Severity:** 🔴 CRITICAL  
**Time:** 2 hours  
**Files to Create/Modify:**
- Create: `components/common/ErrorBoundary.jsx`
- Modify: `pages/_app.jsx`
- Create: `pages/500.jsx` (error page)

**Implementation:**
```jsx
// components/common/ErrorBoundary.jsx
import React from 'react';
import { logger } from '../config/logging';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.href = '/'}>
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Use in _app.jsx:**
```jsx
import ErrorBoundary from '../components/common/ErrorBoundary';

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
```

---

### Fix #2: Refactor Orders Component (Issue #2)
**Severity:** 🔴 CRITICAL  
**Time:** 8 hours  
**File:** `pages/dashboard/orders/orders.jsx`

**Current State:** 66 state variables  
**Target State:** 3-4 state objects + useReducer

**Implementation:**
```jsx
// Before: 66 useState calls
const [orders, setOrders] = useState([]);
const [loading, setLoading] = useState(true);
const [filterValue, setFilterValue] = useState("");
const [currentPage, setCurrentPage] = useState(1);
// ... 60+ more ...

// After: Consolidated state
const [filterState, setFilterState] = useState({
  searchValue: "",
  paymentType: "all",
  status: "all",
  paymentStatus: "all",
  brand: "all",
  startDate: "",
  endDate: "",
  sortBy: "createdAt",
  sortOrder: "desc"
});

const [orders, setOrders] = useState([]);

const [uiState, setUiState] = useState({
  loading: true,
  error: null,
  isViewModalOpen: false,
  isAwbModalOpen: false,
  isExporting: false,
  isDownloadingBulk: false,
  isManualOrderOpen: false
});

const [pageState, setPageState] = useState({
  currentPage: 1,
  itemsPerPage: 10,
  totalPages: 0,
  totalOrders: 0
});

const [dataState, setDataState] = useState({
  selectedOrder: null,
  selectedOrders: new Set(),
  syncingOrders: new Set(),
  generatingLabel: new Set(),
  labelStats: {},
  brands: []
});
```

**OR Use useReducer:**
```jsx
const initialState = {
  orders: [],
  filters: { search: "", status: "all" },
  ui: { loading: true, error: null },
  page: { current: 1, total: 0 }
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, loading: action.payload } };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    // ... more cases
    default:
      return state;
  }
};

const [state, dispatch] = useReducer(reducer, initialState);
```

**Verification:**
- Component < 300 lines
- Max 3-4 state variables
- Easier to maintain

---

### Fix #3: Remove Hardcoded API URLs
**Severity:** 🔴 CRITICAL  
**Time:** 4 hours  
**Files to Modify:**
- `pages/dashboard/analytics/utmAnalytics.jsx`
- `pages/dashboard/media/gallery.jsx`

**Implementation:**

Before:
```jsx
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
let analyticsUrl = `${baseUrl}/api/utm/analytics`;
```

After:
```jsx
// Create service:
// services/analyticsService.js
export const analyticsService = {
  getAnalytics: async (params) => {
    const response = await adminApi.get('/api/utm/analytics', { params });
    return response.data;
  },
  getAllTracking: async () => {
    const response = await adminApi.get('/api/utm/all');
    return response.data;
  }
};

// Use in component:
import { analyticsService } from '../../../services';
const data = await analyticsService.getAnalytics(params);
```

---

### Fix #4: Add Loading/Error States to Critical Pages
**Severity:** 🔴 CRITICAL  
**Time:** 8 hours  
**Files:** 20+ pages needing fixes

**Pattern to Apply:**
```jsx
// Current (Bad):
const fetchData = async () => {
  const data = await service.getData();
  setData(data);
};

// After (Good):
const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await service.getData();
    setData(data);
  } catch (err) {
    setError(err.message || 'Failed to load data');
    setData([]);
  } finally {
    setLoading(false);
  }
};

// Display in UI:
{loading && <Loader />}
{error && <ErrorAlert message={error} />}
{!loading && !error && <DataTable data={data} />}
```

**Pages to Fix Priority Order:**
1. `pages/dashboard/orders/orders.jsx` (already has some)
2. `pages/dashboard/coupon/coupons.jsx`
3. `pages/dashboard/shipping/shippingFees.jsx`
4. `pages/dashboard/shipping/shippingSettings.jsx`
5. `pages/dashboard/reviews/reviews.jsx`
6. `pages/dashboard/policies.jsx`
7. `pages/dashboard/brands.jsx`
8. And 12+ more dashboard pages

---

### Fix #5: Add PropTypes to All Components
**Severity:** 🔴 CRITICAL  
**Time:** 6 hours  
**Files:** 20+ components

**Pattern:**
```jsx
// Before:
const MyButton = ({ onClick, children, variant }) => {
  return <button onClick={onClick}>{children}</button>;
};

// After:
import PropTypes from 'prop-types';

const MyButton = ({ onClick, children, variant }) => {
  return <button onClick={onClick} className={`btn-${variant}`}>{children}</button>;
};

MyButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
};

MyButton.defaultProps = {
  variant: 'primary'
};

export default MyButton;
```

**Install if needed:**
```bash
npm install prop-types
```

**Files needing PropTypes:**
- `components/Dashboard/BrandTags.jsx`
- `components/Dashboard/BrandAssignment.jsx`
- `components/ui/Table.jsx`
- `components/ui/Modal.jsx`
- `components/ui/Button.jsx`
- `components/products/AttributeSelector.jsx`
- And 14+ more components

---

### Fix #6: Add Missing Keys in Lists
**Severity:** 🔴 CRITICAL  
**Time:** 3 hours  
**Files:** 20+ files

**Pattern:**
```jsx
// Before:
{items.map((item, i) => (
  <ItemComponent item={item} />
))}

// After:
{items.map((item) => (
  <ItemComponent key={item.id} item={item} />
))}
```

**Files to Fix:**
- `pages/About.jsx` - 4 .map() calls
- `pages/blog-details.jsx` - Multiple sections
- `pages/blog.jsx` - Category list
- Dashboard pages - Many table/list renders

---

### Fix #7: Add Promise .catch() Handlers
**Severity:** 🔴 CRITICAL  
**Time:** 5 hours  
**Count:** 21+ locations

**Pattern:**
```jsx
// Before:
orderService.getData()
  .then(d => setData(d))
  // No error handler!

// After:
orderService.getData()
  .then(d => setData(d))
  .catch(err => {
    setError(err.message);
    logger.error('Failed to load orders:', err);
  });

// OR Better - Use async/await:
try {
  const data = await orderService.getData();
  setData(data);
} catch (err) {
  setError(err.message);
  logger.error('Failed to load orders:', err);
}
```

---

### Fix #8: Remove Console Statements
**Severity:** 🔴 CRITICAL  
**Time:** 1 hour  
**Count:** 21 instances

**Quick Fix:**
```bash
# Find all console statements:
grep -r "console\." src/ --include="*.jsx" --include="*.js"

# Remove them or replace with proper logging:
logger.debug() instead of console.log()
logger.error() instead of console.error()
```

---

## PHASE 2: HIGH PRIORITY FIXES (Week 2) - 39 hours

### Fix #9: useEffect Cleanup & Dependency Arrays
**Time:** 10 hours  
**Files:** 149 useEffect hooks

**Pattern:**
```jsx
// Before:
useEffect(() => {
  window.addEventListener('scroll', handler);
}, []); // Missing cleanup and dependency

// After:
useEffect(() => {
  const onScroll = () => setShowBackTop(window.scrollY > 400);
  window.addEventListener('scroll', onScroll);
  
  return () => {
    window.removeEventListener('scroll', onScroll);
  };
}, []); // No dependencies needed since we cleanup
```

**Common Issues to Fix:**
- Scroll listeners without cleanup
- Resize listeners without cleanup
- Timer intervals without clearInterval
- WebSocket subscriptions without unsubscribe

---

### Fix #10: API Response Validation
**Time:** 6 hours  
**Files:** `services/index.js` and API files

**Pattern:**
```jsx
// Before:
const data = await api.get('/orders');
setOrders(data.orders); // Assumes data.orders exists

// After:
const data = await api.get('/orders');
if (data?.orders && Array.isArray(data.orders)) {
  setOrders(data.orders);
} else {
  setOrders([]);
  logger.warn('Unexpected response format:', data);
}
```

---

### Fix #11: Request Cancellation with AbortController
**Time:** 4 hours  
**Files:** All async operations in hooks

**Pattern:**
```jsx
useEffect(() => {
  const controller = new AbortController();
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', {
        signal: controller.signal
      });
      const data = await response.json();
      setData(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    }
  };

  fetchData();

  return () => controller.abort();
}, []);
```

---

### Fix #12: Standardize Error Handling
**Time:** 5 hours

**Rules:**
1. Always use async/await with try-catch
2. Always show error to user
3. Always log error for debugging
4. Always provide recovery action

```jsx
try {
  setLoading(true);
  const result = await action();
  setSuccess('Operation successful!');
} catch (err) {
  logger.error('Operation failed:', err);
  setError(err.message || 'Something went wrong');
  // Optionally provide retry button
} finally {
  setLoading(false);
}
```

---

### Fix #13: Form Validation
**Time:** 8 hours

**Pattern:**
```jsx
const [formErrors, setFormErrors] = useState({});

const validateForm = () => {
  const errors = {};
  if (!form.name) errors.name = 'Name is required';
  if (!form.email) errors.email = 'Email is required';
  else if (!isValidEmail(form.email)) errors.email = 'Invalid email';
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  try {
    await service.save(form);
    showSuccess('Saved successfully');
  } catch (err) {
    setFormErrors({ submit: err.message });
  }
};

// Display errors:
<input value={form.name} onChange={...} />
{formErrors.name && <span className="error">{formErrors.name}</span>}
```

---

### Fix #14: Add Loading Skeletons
**Time:** 6 hours

**Create:**
```jsx
// components/common/Skeleton.jsx
const Skeleton = ({ width = '100%', height = '20px' }) => (
  <div 
    style={{
      width, height,
      background: '#f0f0f0',
      borderRadius: '4px',
      animation: 'pulse 1.5s infinite'
    }}
  />
);

// Use:
{loading ? (
  <div>
    <Skeleton height="40px" />
    <Skeleton height="40px" style={{ marginTop: 10 }} />
  </div>
) : (
  <YourActualContent />
)}
```

---

## PHASE 3: MEDIUM PRIORITY FIXES (Week 3+) - 40+ hours

### Fix #15: Rate Limiting
**Time:** 3 hours
- Debounce search input (already done in orders.jsx)
- Disable buttons during loading
- Add request throttling to avoid duplicate calls

### Fix #16: Accessibility
**Time:** 8 hours
- Add aria-labels to icon buttons
- Add aria-expanded to collapse components
- Add alt text to all images
- Make forms keyboard navigable

### Fix #17: Global Error Handler
**Time:** 4 hours
- Create logger service
- Implement error reporting
- Add 404/500 error pages

### Fix #18: Image Optimization
**Time:** 6 hours
- Use next/image for all images
- Add lazy loading
- Add placeholder blur effect

### Fix #19: Refactor Large Components
**Time:** 8 hours per component
- Split components > 300 lines
- Create sub-components
- Share common logic

### Fix #20: Tests
**Time:** 20+ hours
- Unit tests for utilities
- Component tests
- Integration tests
- E2E tests

---

## IMPLEMENTATION TIMELINE

### Week 1 (Priority 1)
```
Mon: Fix #1 (Error Boundary) - 2h
Tue-Wed: Fix #2 (Refactor Orders) - 8h
Wed-Thu: Fix #3 (Remove Hardcoded URLs) - 4h
Thu-Fri: Fix #4 (Load/Error States) - 8h
Fri: Fix #5 (PropTypes) - 6h
     Fix #6 (Missing Keys) - 3h
     Fix #7 (Promise Handlers) - 5h
     Fix #8 (Console Logs) - 1h
```

### Week 2 (Priority 2)
```
Mon-Tue: Fix #9 (useEffect Cleanup) - 10h
Tue: Fix #10 (Response Validation) - 6h
Wed: Fix #11 (Request Cancellation) - 4h
Wed-Thu: Fix #12 (Error Handling) - 5h
Thu-Fri: Fix #13 (Form Validation) - 8h
Fri: Fix #14 (Skeletons) - 6h
```

### Week 3+ (Priority 3)
```
Remaining fixes as time permits
Fix #15-20: Additional improvements (40+ hours)
```

---

## TESTING CHECKLIST

After each fix, verify:

### Fix #1: Error Boundary
- [ ] Error page displays on component error
- [ ] Page doesn't go blank
- [ ] Error is logged
- [ ] Can recover with home button

### Fix #2: Refactor Orders
- [ ] Page loads orders correctly
- [ ] Filters work properly
- [ ] No performance issues
- [ ] < 300 lines per component

### Fix #3: Remove Hardcoded URLs
- [ ] API calls use service layer
- [ ] Can change API URL via env var
- [ ] All endpoints accessible

### Fix #4: Load/Error States
- [ ] Loading shows while fetching
- [ ] Error displays on failure
- [ ] Data displays when loaded
- [ ] Can retry on error

### Fix #5: PropTypes
- [ ] Console has no prop warnings
- [ ] Type checking works
- [ ] Wrong props cause errors

### Fix #6: Missing Keys
- [ ] No console warnings about keys
- [ ] List reorder works correctly
- [ ] Filters work correctly

### Fix #7: Promise Handlers
- [ ] No uncaught promise rejections
- [ ] Errors show to user
- [ ] Errors are logged

### Fix #8: Console Logs
- [ ] Production build has no console statements
- [ ] Only logger is used
- [ ] Debug info still available via logger

---

## ROLLBACK PLAN

If issues arise during implementation:

```bash
# Revert single fix:
git revert <commit-hash>

# Revert all fixes:
git reset --hard origin/main

# Check what changed:
git diff <commit-hash>
```

---

## SUCCESS CRITERIA

After implementing all 3 phases:

✅ Zero console errors  
✅ All state errors handled  
✅ Loading states on all async operations  
✅ Error states on all async operations  
✅ No unhandled promise rejections  
✅ PropTypes on all components  
✅ Keys on all lists  
✅ All event listeners cleaned up  
✅ All forms validated  
✅ Accessibility audit passes  
✅ No memory leaks  

---

## RESOURCES NEEDED

- React error handling guide
- Next.js best practices
- Web accessibility WCAG guidelines
- Performance optimization guide

---

**Created:** 2026-05-27  
**Status:** Ready to implement  
**Estimated Cost:** 2-3 weeks of development  
**Team Size:** 1-2 developers  
**Priority:** HIGH

