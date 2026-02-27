# Magic Checkout Setup Guide

## ⚠️ IMPORTANT: Magic Checkout is NOT a Separate SDK!

**Magic Checkout is a FEATURE of the standard Razorpay Checkout**, not a separate SDK or modal.

When you enable Magic Checkout in your Razorpay Dashboard, the standard `checkout.js` automatically provides:
- ✅ Mobile number + OTP verification
- ✅ Saved addresses from Razorpay network
- ✅ QuickBuy for returning customers
- ✅ Auto-fill for 200M+ customers
- ✅ Address quality validation
- ✅ COD serviceability

## Current Implementation Status

✅ **Your code is CORRECT!** The Express Checkout button uses the standard Razorpay Checkout, which is exactly what you need.

❌ **What's Missing**: Magic Checkout needs to be enabled in your Razorpay Dashboard.

---

## How to Enable Magic Checkout

### Step 1: Login to Razorpay Dashboard
Go to: https://dashboard.razorpay.com

### Step 2: Navigate to Magic Checkout
1. Click on **Settings** in the left sidebar
2. Click on **Magic Checkout**
3. Or directly go to: https://dashboard.razorpay.com/app/magic-checkout

### Step 3: Platform Setup
1. In **Platform Setup**, select **Custom E-Commerce Platform** from dropdown
2. Click **Next**

### Step 4: Configure API Endpoints (Optional but Recommended)

#### Checkout Settings:
Navigate to **Setup & Settings** → **Checkout Settings**

**Coupon Settings**:
- URL for get promotions: `https://api.crosscoin.in/api/payments/magic-checkout/promotions`
- URL for apply promotions: `https://api.crosscoin.in/api/payments/magic-checkout/apply-promotion`

Click **Save settings**

#### Shipping Setup:
Navigate to **Shipping Setup**

- Select **API** as Shipping Service type
- URL for shipping info: `https://api.crosscoin.in/api/payments/magic-checkout/shipping-info`

Click **Save Settings**

### Step 5: Enable Magic Checkout Features
1. Toggle ON **Magic Checkout**
2. Enable **COD Intelligence** (optional)
3. Enable **Address Quality Validation** (optional)
4. Click **Save**

---

## How It Works

### Before Enabling Magic Checkout:
```
User clicks "Express Checkout" 
→ Standard Razorpay modal opens
→ User enters card/UPI details
→ Payment completes
```

### After Enabling Magic Checkout:
```
User clicks "Express Checkout"
→ Razorpay modal opens with Magic Checkout
→ User enters MOBILE NUMBER
→ User enters OTP
→ Saved addresses AUTO-FILL (if returning customer)
→ User selects/adds address
→ User selects payment method
→ Payment completes
```

---

## Testing Magic Checkout

### Test Mode:
1. Ensure you're using **Test API Keys** (`rzp_test_xxxxx`)
2. Click "Express Checkout" button
3. You should see:
   - Mobile number entry screen
   - OTP verification
   - Address selection/entry
   - Payment methods

### Test Credentials:
- **Mobile**: `9999999999`
- **OTP**: `000000`
- **Test Card**: `4111 1111 1111 1111`
- **CVV**: Any 3 digits
- **Expiry**: Any future date

---

## Verification Checklist

After enabling Magic Checkout in dashboard:

### ✅ Dashboard Verification:
- [ ] Magic Checkout toggle is ON
- [ ] Platform is set to "Custom E-Commerce Platform"
- [ ] API endpoints are configured (optional)
- [ ] Test mode is enabled

### ✅ Frontend Verification:
- [ ] Express Checkout button appears in cart
- [ ] Button opens Razorpay modal
- [ ] Modal shows mobile number entry (Magic Checkout feature)
- [ ] OTP verification works
- [ ] Address entry/selection works
- [ ] Payment completes successfully

### ✅ Backend Verification:
- [ ] Order created in database
- [ ] Payment details saved
- [ ] Razorpay Dashboard shows payment

---

## Common Issues

### Issue 1: "Standard checkout opens, not Magic Checkout"
**Cause**: Magic Checkout not enabled in dashboard
**Solution**: 
1. Go to Razorpay Dashboard
2. Navigate to Magic Checkout settings
3. Toggle ON Magic Checkout
4. Save settings

### Issue 2: "Mobile number screen doesn't appear"
**Cause**: Using live keys but Magic Checkout only enabled in test mode
**Solution**: Enable Magic Checkout for both test and live modes

### Issue 3: "Saved addresses don't show"
**Cause**: 
- First-time user (no saved addresses)
- Magic Checkout not fully enabled
**Solution**: 
- Test with a mobile number that has used Razorpay before
- Ensure Magic Checkout is enabled in dashboard

### Issue 4: "API endpoints not working"
**Cause**: Endpoints not configured in dashboard
**Solution**: 
- Configure endpoints in Dashboard → Magic Checkout → Setup & Settings
- Ensure backend server is running
- Test endpoints manually

---

## What Your Code Does (Already Correct!)

### ExpressCheckout.jsx:
```javascript
// 1. Loads standard Razorpay SDK
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

// 2. Creates Razorpay order
const orderData = await createMagicCheckoutOrder({...});

// 3. Opens Razorpay Checkout (which includes Magic Checkout if enabled)
const rzp = new window.Razorpay({
  key: RAZORPAY_KEY,
  order_id: orderData.order_id,
  // ... other options
});
rzp.open();
```

**This is CORRECT!** When Magic Checkout is enabled in your dashboard, this same code will automatically show Magic Checkout features.

---

## Key Points to Remember

1. **No Code Changes Needed** - Your implementation is correct
2. **Enable in Dashboard** - Magic Checkout is a dashboard setting
3. **Same SDK** - Uses standard `checkout.js`, not a separate SDK
4. **Automatic Features** - Mobile/OTP/Saved addresses appear automatically when enabled
5. **Test Mode First** - Always test in test mode before going live

---

## Dashboard Screenshots Guide

### Where to Find Magic Checkout Settings:
```
Razorpay Dashboard
└── Settings (left sidebar)
    └── Magic Checkout
        ├── Platform Setup
        │   └── Select "Custom E-Commerce Platform"
        ├── Setup & Settings
        │   ├── Checkout Settings
        │   │   └── Coupon Settings (API URLs)
        │   └── Shipping Setup
        │       └── Shipping Service (API URL)
        └── Enable Magic Checkout Toggle
```

---

## Next Steps

1. **Login to Razorpay Dashboard**: https://dashboard.razorpay.com
2. **Enable Magic Checkout**: Settings → Magic Checkout → Toggle ON
3. **Configure Platform**: Select "Custom E-Commerce Platform"
4. **Add API Endpoints** (optional): Configure promotion and shipping URLs
5. **Test**: Click Express Checkout and verify mobile number screen appears
6. **Go Live**: Switch to live keys and enable Magic Checkout for live mode

---

## Support

If Magic Checkout still doesn't work after enabling:
1. Check you're using the correct API keys
2. Verify Magic Checkout is enabled for the correct mode (test/live)
3. Clear browser cache and try again
4. Contact Razorpay Support: support@razorpay.com

---

**Your Express Checkout code is perfect! Just enable Magic Checkout in the Razorpay Dashboard and it will work! 🚀**
