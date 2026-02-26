# UTM Order Tracking Debug Report

## 🔧 LATEST CHANGES (2026-02-26)

### Changes Made:
1. ✅ Added comprehensive console logging to UTM tracking
2. ✅ Fixed cookie domain for cross-subdomain sharing
3. ✅ Changed `sameSite` to 'none' in production for cross-domain cookies
4. ✅ Added detailed debugging in both createOrder and createGuestOrder

### Cookie Configuration Updated:
```javascript
// Production cookie settings (api.crosscoin.in → crosscoin.in)
{
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
  secure: true, // HTTPS only in production
  sameSite: 'none', // Required for cross-domain cookies
  domain: '.crosscoin.in' // Share across all subdomains
}
```

### What to Check Next:
1. **Check Backend Logs** - Look for these emoji logs:
   - 🍪 = Cookies received
   - 🔑 = Session ID
   - 🔍 = Looking for UTM record
   - ✅ = Success
   - ❌ = Error/Not found
   - ⚠️ = Warning

2. **Test Order Creation** - Create a new order and check backend logs for:
   ```
   🍪 createOrder - Cookies received: { session_id: 'xxx-xxx-xxx' }
   🔑 createOrder - Session ID from cookie: xxx-xxx-xxx
   🔍 createOrder - Looking for UTM record with session_id: xxx-xxx-xxx
   ✅ createOrder: Associated with UTM tracking ID: 123
   📊 createOrder: UTM Campaign: brand_awareness
   ```

3. **If No Cookies** - You'll see:
   ```
   🍪 createOrder - Cookies received: undefined
   ❌ createOrder: No session_id cookie found
   ```

4. **Verify Cookie in Browser**:
   - Open DevTools → Application → Cookies
   - Check for `session_id` cookie
   - Domain should be `.crosscoin.in`
   - SameSite should be `None`
   - Secure should be `true`

---

## Issue
UTM tracking is working (361 visits recorded), but orders are not being linked to UTM campaigns.

---

## Verification Checklist

### 1. Database Schema ✅

**UTM Tracking Table:**
- ✅ Has `session_id` field
- ✅ Has `id` as primary key
- ✅ Stores UTM parameters

**Orders Table:**
- ✅ Has `utm_tracking_id` field (foreign key)
- ✅ Links to utm_tracking table

**Associations:**
- ✅ UTMTracking.hasMany(Order) defined
- ✅ Order.belongsTo(UTMTracking) should be defined

---

### 2. Backend Code Review

#### A. UTM Tracking Creation (✅ Working)
**File:** `Backend/controller/utmController.js`

```javascript
// Session ID is created and stored in cookie
let sessionId = req.cookies?.session_id;
if (!sessionId) {
  sessionId = uuidv4();
  res.cookie('session_id', sessionId, {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

// UTM record created with session_id
const utmRecord = await UTMTracking.create({
  session_id: sessionId,
  utm_source,
  utm_medium,
  utm_campaign,
  // ... other fields
});
```

**Status:** ✅ Working - 361 visits tracked

---

#### B. Order Creation - UTM Linking (⚠️ NEEDS VERIFICATION)
**File:** `Backend/controller/orderController.js`

```javascript
// Line ~266-283: Fetch UTM record by session_id
let utmTrackingId = null;

if (req.body.utm_data || req.cookies?.session_id) {
  try {
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      const utmRecord = await UTMTracking.findOne({
        where: { session_id: sessionId },
        order: [['created_at', 'DESC']]
      });
      
      if (utmRecord) {
        utmTrackingId = utmRecord.id;
        console.log("createOrder: Associated with UTM tracking ID:", utmTrackingId);
      }
    }
  } catch (utmError) {
    console.error("Error fetching UTM data:", utmError);
  }
}

// Line ~290-302: Create order with utm_tracking_id
const order = await Order.create({
  order_number: generateOrderNumber(),
  user_id: userId,
  total_amount: subTotal,
  discount_amount: appliedDiscount,
  coupon_id: coupon_id || null,
  shipping_fee: shippingFee,
  final_amount: finalAmount,
  payment_type,
  payment_status: "pending",
  status: "pending",
  notes: notes || null,
  utm_tracking_id: utmTrackingId,  // ⚠️ CHECK IF THIS IS BEING SAVED
}, { transaction });
```

**Potential Issues:**
1. ❓ Cookie might not be sent from frontend
2. ❓ Session ID might not match between UTM tracking and order
3. ❓ utm_tracking_id might not be saved to database

---

#### C. Guest Order Creation (⚠️ NEEDS SAME CHECK)
**File:** `Backend/controller/orderController.js` - `createGuestOrder` function

```javascript
// Line ~705-720: Same logic for guest orders
let utmTrackingId = null;

if (req.body.utm_data || req.cookies?.session_id) {
  try {
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      const utmRecord = await UTMTracking.findOne({
        where: { session_id: sessionId },
        order: [['created_at', 'DESC']]
      });
      
      if (utmRecord) {
        utmTrackingId = utmRecord.id;
      }
    }
  } catch (utmError) {
    console.error("Error fetching UTM data:", utmError);
  }
}
```

---

### 3. Frontend Code Review

#### A. UTM Tracking (✅ Working)
**File:** `Crosscoin/src/components/common/UTMTracker.jsx`

```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    console.log('=== UTM TRACKER START ===');
    const utmData = captureUTMParameters();
    
    if (utmData) {
      sendUTMToBackend(utmData).then(response => {
        if (response?.success) {
          console.log('✅ UTM tracking complete!');
        }
      });
    }
  }, 100);
}, []);
```

**Status:** ✅ Working - Sends UTM data to backend

---

#### B. Cookie Handling (⚠️ CRITICAL)
**File:** `Crosscoin/src/utils/utmTracker.js`

```javascript
export const sendUTMToBackend = async (utmData) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',  // ✅ This sends cookies
    body: JSON.stringify(utmData),
  });
};
```

**Status:** ✅ Credentials included

---

#### C. Order Creation - Cookie Sending (⚠️ NEEDS VERIFICATION)

**Check these files for cookie handling:**

1. **Checkout/Order API calls**
   - File: `Crosscoin/src/services/orderService.js` or similar
   - Must include `credentials: 'include'` in fetch

2. **Example of what it should look like:**
```javascript
const createOrder = async (orderData) => {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',  // ⚠️ MUST HAVE THIS
    body: JSON.stringify(orderData)
  });
};
```

---

## Diagnostic Steps

### Step 1: Check if session_id cookie exists
**Run in browser console on your site:**
```javascript
document.cookie.split(';').forEach(c => console.log(c.trim()));
```

**Expected:** Should see `session_id=xxxxx-xxxx-xxxx`

---

### Step 2: Check if UTM tracking has session_id
**SQL Query:**
```sql
SELECT id, session_id, utm_source, utm_campaign, created_at 
FROM utm_tracking 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected:** All records should have session_id values

---

### Step 3: Check if orders have utm_tracking_id
**SQL Query:**
```sql
SELECT 
  o.id,
  o.order_number,
  o.utm_tracking_id,
  o.created_at,
  ut.utm_source,
  ut.utm_campaign
FROM orders o
LEFT JOIN utm_tracking ut ON o.utm_tracking_id = ut.id
ORDER BY o.created_at DESC
LIMIT 10;
```

**Expected:** 
- If `utm_tracking_id` is NULL → Orders not linking to UTM
- If `utm_tracking_id` has value but no utm data → Association issue

---

### Step 4: Check backend logs during order creation
**Look for these console logs:**
```
createOrder: Associated with UTM tracking ID: [number]
```

**If NOT present:**
- Session cookie not being sent
- Session ID doesn't match
- UTM record not found

---

### Step 5: Test order creation with UTM
**Manual Test:**

1. Visit: `https://crosscoin.in/?utm_source=test&utm_medium=manual&utm_campaign=debug_test`
2. Open browser console
3. Check for UTM tracking logs
4. Note the session_id from cookie
5. Add product to cart and checkout
6. Check backend logs for "Associated with UTM tracking ID"
7. Check database if order has utm_tracking_id

---

## Common Issues & Fixes

### Issue 1: Cookie Not Being Sent ❌
**Symptom:** Backend doesn't receive session_id cookie

**Fix:** Add `credentials: 'include'` to all API calls

**Files to check:**
- `Crosscoin/src/services/orderService.js`
- `Crosscoin/src/services/checkoutService.js`
- Any file making order API calls

**Example Fix:**
```javascript
// Before (Wrong)
fetch(`${API_URL}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});

// After (Correct)
fetch(`${API_URL}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // ADD THIS
  body: JSON.stringify(orderData)
});
```

---

### Issue 2: CORS Not Allowing Cookies ❌
**Symptom:** Cookies work on same domain but not cross-domain

**Fix:** Update backend CORS settings

**File:** `Backend/index.js` or `Backend/app.js`

```javascript
app.use(cors({
  origin: ['https://crosscoin.in', 'http://localhost:3000'],
  credentials: true,  // MUST BE TRUE
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### Issue 3: Cookie Domain Mismatch ❌
**Symptom:** Cookie set on api.crosscoin.in not sent to crosscoin.in

**Fix:** Set cookie domain correctly

**File:** `Backend/controller/utmController.js`

```javascript
res.cookie('session_id', sessionId, {
  maxAge: 30 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  domain: '.crosscoin.in'  // ADD THIS for subdomain sharing
});
```

---

### Issue 4: Session ID Not Matching ❌
**Symptom:** UTM has one session_id, order uses different one

**Fix:** Ensure same cookie is used

**Check:**
1. UTM tracking creates session_id cookie
2. Order creation reads same cookie
3. No cookie clearing between UTM and order

---

### Issue 5: Order Model Not Saving utm_tracking_id ❌
**Symptom:** utm_tracking_id is NULL in database

**Fix:** Check Order model definition

**File:** `Backend/model/orderModel.js`

```javascript
utm_tracking_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'utm_tracking',
    key: 'id'
  }
}
```

---

## Quick Fix Checklist

### Backend Fixes:
- [ ] Verify CORS allows credentials
- [ ] Check cookie domain setting
- [ ] Add more console logs in order creation
- [ ] Verify Order model has utm_tracking_id field
- [ ] Check if utm_tracking_id is in Order.create()

### Frontend Fixes:
- [ ] Add `credentials: 'include'` to order API calls
- [ ] Verify session_id cookie exists
- [ ] Check cookie is sent in network tab
- [ ] Test with browser console logs

### Database Fixes:
- [ ] Run SQL queries to verify data
- [ ] Check if utm_tracking_id column exists
- [ ] Verify foreign key constraint

---

## Testing Script

**Run this in browser console after placing order:**

```javascript
// Check if session cookie exists
const cookies = document.cookie.split(';').map(c => c.trim());
const sessionCookie = cookies.find(c => c.startsWith('session_id='));
console.log('Session Cookie:', sessionCookie);

// Check localStorage for UTM data
const utmData = localStorage.getItem('utm_data');
console.log('Stored UTM Data:', utmData ? JSON.parse(utmData) : 'None');

// Make test API call to check cookie is sent
fetch('https://api.crosscoin.in/api/utm/session', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('UTM Session Data:', data))
.catch(err => console.error('Error:', err));
```

---

## Next Steps

1. **Run Diagnostic Steps 1-5** to identify exact issue
2. **Check browser Network tab** during order creation
3. **Check backend logs** for UTM association messages
4. **Run SQL queries** to verify data
5. **Apply fixes** based on findings

---

## Files That Need Verification

### Critical Files:
1. `Backend/controller/orderController.js` - Order creation logic
2. `Crosscoin/src/services/orderService.js` - Frontend order API calls
3. `Backend/index.js` - CORS configuration
4. `Backend/controller/utmController.js` - Cookie settings

### Check These:
- [ ] All fetch calls include `credentials: 'include'`
- [ ] CORS allows credentials
- [ ] Cookie domain is correct
- [ ] Order model saves utm_tracking_id
- [ ] Backend logs show UTM association

---

**Priority:** HIGH
**Impact:** Orders not tracked to marketing campaigns = No ROI data
**Estimated Fix Time:** 30 minutes once issue is identified
