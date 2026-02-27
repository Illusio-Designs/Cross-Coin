# Magic Checkout Troubleshooting Guide

## Issue: Payment Gateway Opens Instead of Magic Checkout

If you're seeing the standard Razorpay payment gateway instead of Magic Checkout (mobile/OTP screen), follow these steps:

---

## ✅ Step 1: Verify Razorpay Dashboard Settings

### 1.1 Check Magic Checkout is Enabled
1. Login to https://dashboard.razorpay.com
2. Go to **Settings** → **Magic Checkout**
3. Ensure the toggle is **ON** (blue/green)
4. Platform should be set to **"Custom E-Commerce Platform"**

### 1.2 Verify You're in Correct Mode
- If testing: Switch to **Test Mode** (toggle at top right)
- If live: Switch to **Live Mode**
- Magic Checkout must be enabled separately for Test and Live modes

### 1.3 Check API Keys Match the Mode
- Test Mode: Keys start with `rzp_test_`
- Live Mode: Keys start with `rzp_live_`
- Your `.env` files must use keys from the same mode

---

## ✅ Step 2: Verify Environment Variables

### 2.1 Backend (.env)
```bash
cd Backend
cat .env | grep RAZORPAY
```

Should show:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
```

### 2.2 Frontend (.env.local)
```bash
cd Crosscoin
cat .env.local | grep RAZORPAY
```

Should show:
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
```

### 2.3 Verify Keys Match
- Backend `RAZORPAY_KEY_ID` should match Frontend `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- Both should be from the same mode (test or live)

---

## ✅ Step 3: Restart Servers

After changing environment variables, you MUST restart:

### 3.1 Restart Backend
```bash
cd Backend
# Stop the server (Ctrl+C)
# Start again
node index.js
```

### 3.2 Restart Frontend
```bash
cd Crosscoin
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

---

## ✅ Step 4: Clear Browser Cache

Magic Checkout SDK is cached by browser:

1. Open DevTools (F12)
2. Right-click on refresh button
3. Select **"Empty Cache and Hard Reload"**
4. Or use Incognito/Private window

---

## ✅ Step 5: Verify Code Updates

### 5.1 Check Frontend Code
Open `Crosscoin/src/components/checkout/ExpressCheckout.jsx`

Look for these lines around line 250:
```javascript
// CRITICAL: Enable Magic Checkout with customer_details
customer_details: {
  contact: user?.phone || "",
  email: user?.email || "",
  name: user?.name || "",
},

// Enable Magic Checkout features
remember_customer: true,
send_sms_hash: true,
allow_rotation: true,
```

If missing, the code wasn't updated properly.

### 5.2 Check Backend Code
Open `Backend/controller/magicCheckoutController.js`

Look for these lines around line 495:
```javascript
// Enable partial payment (required for Magic Checkout)
partial_payment: false,
```

---

## ✅ Step 6: Test with Known Magic Checkout Account

Magic Checkout shows different screens based on user:

### For NEW Users (Never used Razorpay):
- Shows mobile number entry
- Shows OTP verification
- Shows address entry form
- Shows payment methods

### For EXISTING Users (Used Razorpay before):
- Shows mobile number entry
- Shows OTP verification
- Shows SAVED addresses (if any)
- Shows saved payment methods

### Test with Razorpay Test Numbers:
```
Mobile: 9999999999
OTP: 000000
```

---

## ✅ Step 7: Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Click "Express Checkout" button
4. Look for errors

### Expected Console Output:
```
Creating Razorpay order for Express Checkout...
Order created successfully: {order_id: "order_xxxxx", ...}
```

### Common Errors:

#### Error: "RAZORPAY_KEY_ID is undefined"
**Solution**: Add keys to `.env.local` and restart frontend

#### Error: "Invalid API key"
**Solution**: Verify keys are correct and from same mode (test/live)

#### Error: "Order creation failed"
**Solution**: Check backend is running and keys are in `Backend/.env`

---

## ✅ Step 8: Verify Network Requests

1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Express Checkout" button
4. Look for these requests:

### Request 1: Create Order
```
POST /api/payments/magic-checkout/create-order
Status: 200 OK
Response: {success: true, order_id: "order_xxxxx"}
```

### Request 2: Razorpay SDK Load
```
GET https://checkout.razorpay.com/v1/checkout.js
Status: 200 OK
```

If either fails, check:
- Backend server is running
- API URL is correct in `.env.local`
- No CORS errors

---

## ✅ Step 9: Verify Razorpay Account Status

### 9.1 Check Account Activation
1. Go to https://dashboard.razorpay.com
2. Check if account is **Activated**
3. Some features require KYC completion

### 9.2 Check Magic Checkout Eligibility
1. Go to **Settings** → **Magic Checkout**
2. If you see "Not Available" or "Contact Support":
   - Your account may not have Magic Checkout enabled
   - Contact Razorpay Support: support@razorpay.com

---

## ✅ Step 10: Test in Different Scenarios

### Scenario 1: Guest User (Not Logged In)
```javascript
// Should show:
- Mobile number entry
- OTP verification
- Address entry form
- Payment methods
```

### Scenario 2: Logged In User (First Time)
```javascript
// Should show:
- Mobile number entry (pre-filled)
- OTP verification
- Address entry form
- Payment methods
```

### Scenario 3: Returning User (Used Razorpay Before)
```javascript
// Should show:
- Mobile number entry (pre-filled)
- OTP verification
- SAVED addresses (if any)
- Saved payment methods
```

---

## 🔍 Advanced Debugging

### Check Razorpay Order Details
```bash
curl -u YOUR_KEY_ID:YOUR_KEY_SECRET \
  https://api.razorpay.com/v1/orders/order_xxxxx
```

Should return order details with `partial_payment: false`

### Check Magic Checkout Status
```javascript
// In browser console after clicking Express Checkout:
console.log(window.Razorpay);
// Should show Razorpay object with checkout methods
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Using Live Keys in Test Mode
- Dashboard is in Test Mode
- But `.env` has `rzp_live_` keys
- **Solution**: Use `rzp_test_` keys for testing

### ❌ Mistake 2: Not Restarting Servers
- Changed `.env` files
- But didn't restart servers
- **Solution**: Always restart after changing env vars

### ❌ Mistake 3: Magic Checkout Not Enabled
- Code is correct
- Keys are correct
- But Magic Checkout toggle is OFF in dashboard
- **Solution**: Enable in Razorpay Dashboard

### ❌ Mistake 4: Wrong API URL
- Frontend `.env.local` has wrong `NEXT_PUBLIC_API_URL`
- Order creation fails
- **Solution**: Verify API URL matches backend

### ❌ Mistake 5: Browser Cache
- Old SDK version cached
- **Solution**: Hard refresh or use Incognito

---

## 📞 Still Not Working?

### Check These Final Items:

1. **Razorpay Account Type**
   - Some account types don't have Magic Checkout
   - Contact Razorpay Support

2. **Geographic Restrictions**
   - Magic Checkout may not be available in all regions
   - Check with Razorpay

3. **Browser Compatibility**
   - Use latest Chrome, Firefox, or Safari
   - Some old browsers don't support Magic Checkout

4. **Network Issues**
   - Check if Razorpay CDN is accessible
   - Try different network/VPN

---

## ✅ Success Indicators

You'll know Magic Checkout is working when:

1. ✅ Click "Express Checkout" button
2. ✅ Modal opens with **mobile number entry** (not payment methods)
3. ✅ Enter mobile and receive OTP
4. ✅ After OTP, see address selection/entry
5. ✅ Then see payment methods

If you see payment methods FIRST (without mobile/OTP), Magic Checkout is NOT enabled.

---

## 📋 Quick Checklist

Copy this and check each item:

```
□ Magic Checkout enabled in Razorpay Dashboard
□ Using correct mode (Test/Live) in dashboard
□ API keys match the mode (test/live)
□ Backend .env has RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
□ Frontend .env.local has NEXT_PUBLIC_RAZORPAY_KEY_ID
□ Frontend .env.local has NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
□ Backend server restarted after env changes
□ Frontend server restarted after env changes
□ Browser cache cleared
□ Code updated with customer_details parameter
□ No console errors
□ Order creation API works (200 OK)
□ Razorpay SDK loads successfully
```

---

## 🎯 Expected Flow

```
User clicks "Express Checkout"
    ↓
Frontend creates order via API
    ↓
Backend creates Razorpay order
    ↓
Frontend opens Razorpay modal
    ↓
IF Magic Checkout enabled:
    → Shows mobile entry screen
    → Shows OTP screen
    → Shows address screen
    → Shows payment methods
    
IF Magic Checkout NOT enabled:
    → Shows payment methods directly (standard checkout)
```

---

## 📧 Contact Support

If still not working after all steps:

**Razorpay Support:**
- Email: support@razorpay.com
- Phone: +91-80-6890-6890
- Dashboard: Settings → Support

**Provide them:**
1. Your Razorpay Account ID
2. Test Order ID (from console logs)
3. Screenshot of Magic Checkout settings
4. Screenshot of console errors (if any)

---

**Remember**: Magic Checkout is a DASHBOARD FEATURE, not a code feature. If your code is correct but Magic Checkout isn't showing, the issue is in your Razorpay Dashboard settings!
