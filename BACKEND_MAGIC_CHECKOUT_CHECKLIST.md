# Backend Magic Checkout Update Checklist

## Files That Need to Be Updated on Backend Server

### ✅ 1. Install Razorpay Package (if not already installed)

**Location**: `Backend/`

**Command**:
```bash
cd Backend
npm install razorpay
```

---

### ✅ 2. Update Environment Variables

**Location**: `Backend/.env`

**Add these variables**:
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here

# Optional: Default warehouse pincode for shipping
DEFAULT_WAREHOUSE_PINCODE=400001
```

**Important**: 
- Get your keys from https://dashboard.razorpay.com/app/keys
- Use `rzp_test_` keys for testing
- Use `rzp_live_` keys for production

---

### ✅ 3. Update Payment Controller

**Location**: `Backend/controller/paymentController.js`

**What to check**:
- File should have `createMagicCheckoutOrder` function
- File should have `verifyMagicCheckoutPayment` function

**If these functions are missing, add them**:

```javascript
// At the top of the file, add Razorpay import if not present
const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Add these functions at the end of the file:

// Create Magic Checkout order
module.exports.createMagicCheckoutOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, customer, items } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid amount is required' 
      });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const orderOptions = {
      amount: amountInPaise,
      currency: currency,
      receipt: receipt || `order_${Date.now()}`,
      notes: {
        customer_id: customer?.id || 'guest',
        items: JSON.stringify(items || [])
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status
    });

  } catch (error) {
    console.error('Error creating Magic Checkout order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create order', 
      error: error.message 
    });
  }
};

// Verify Magic Checkout payment
module.exports.verifyMagicCheckoutPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false,
        message: 'order_id, payment_id, and signature are required' 
      });
    }

    const crypto = require('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      res.json({
        success: true,
        message: 'Payment verified successfully',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify payment', 
      error: error.message 
    });
  }
};
```

---

### ✅ 4. Check Magic Checkout Controller Exists

**Location**: `Backend/controller/magicCheckoutController.js`

**This file should already exist with these functions**:
- `getPromotions` - Fetches available coupons
- `applyPromotion` - Applies a coupon code
- `getShippingInfo` - Returns shipping serviceability
- `createOrder` - Creates Razorpay order (main function)
- `verifyPayment` - Verifies payment signature

**Status**: ✅ This file is already complete (from previous implementation)

---

### ✅ 5. Update Payment Routes

**Location**: `Backend/routes/paymentRoutes.js`

**Check if these routes exist**:

```javascript
// Magic Checkout routes (should be present)
router.post('/magic-checkout/create-order', createOrder);
router.post('/magic-checkout/verify-payment', verifyPayment);
router.get('/magic-checkout/promotions', getPromotions);
router.post('/magic-checkout/apply-promotion', applyPromotion);
router.post('/magic-checkout/shipping-info', getShippingInfo);
```

**If missing, add them**:

```javascript
const {
    getPromotions,
    applyPromotion,
    getShippingInfo,
    createOrder,
    verifyPayment
} = require('../controller/magicCheckoutController.js');

// Add these routes in the router section:
router.post('/magic-checkout/create-order', createOrder);
router.post('/magic-checkout/verify-payment', verifyPayment);
router.get('/magic-checkout/promotions', getPromotions);
router.post('/magic-checkout/apply-promotion', applyPromotion);
router.post('/magic-checkout/shipping-info', getShippingInfo);
```

**Status**: ✅ Routes are already added (from previous implementation)

---

### ✅ 6. Restart Backend Server

**After making all changes, restart your backend server**:

```bash
# Stop the current server (Ctrl+C)

# Then restart
cd Backend
npm start
# or
node index.js
# or
nodemon index.js
```

---

## Quick Verification Checklist

After updating, verify these endpoints work:

### Test 1: Create Order Endpoint
```bash
curl -X POST http://localhost:5000/api/payments/magic-checkout/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "customer_id": "test123",
    "cart_items": []
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "order_id": "order_xxxxxxxxxxxxx",
  "amount": 10000,
  "currency": "INR",
  "receipt": "order_1234567890_test123",
  "status": "created"
}
```

### Test 2: Get Promotions Endpoint
```bash
curl "http://localhost:5000/api/payments/magic-checkout/promotions?order_id=test&cart_total=10000"
```

**Expected Response**:
```json
{
  "promotions": []
}
```

---

## Common Issues & Solutions

### Issue 1: "Razorpay is not defined"
**Solution**: Install razorpay package
```bash
cd Backend
npm install razorpay
```

### Issue 2: "RAZORPAY_KEY_ID is undefined"
**Solution**: Add keys to `.env` file
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

### Issue 3: "Cannot find module 'razorpay'"
**Solution**: 
```bash
cd Backend
npm install
npm install razorpay
```

### Issue 4: "Route not found"
**Solution**: 
1. Check `paymentRoutes.js` has the routes
2. Restart backend server
3. Check server logs for errors

### Issue 5: "Order creation failed"
**Solution**:
1. Verify Razorpay keys are correct
2. Check Razorpay dashboard is accessible
3. Ensure test mode is enabled
4. Check server logs for detailed error

---

## Files Summary

### Files to Check/Update:
1. ✅ `Backend/.env` - Add Razorpay keys
2. ✅ `Backend/package.json` - Verify razorpay is in dependencies
3. ✅ `Backend/controller/magicCheckoutController.js` - Already complete
4. ✅ `Backend/routes/paymentRoutes.js` - Already has routes
5. ⚠️ `Backend/controller/paymentController.js` - May need createMagicCheckoutOrder function

### Files Already Complete (No Changes Needed):
- `Backend/controller/magicCheckoutController.js` ✅
- `Backend/routes/paymentRoutes.js` ✅
- `Backend/model/*.js` ✅
- `Backend/services/*.js` ✅

---

## Step-by-Step Update Process

### Step 1: Backup
```bash
# Create a backup of your backend
cp -r Backend Backend_backup_$(date +%Y%m%d)
```

### Step 2: Install Dependencies
```bash
cd Backend
npm install razorpay
```

### Step 3: Update .env
```bash
# Edit Backend/.env
nano Backend/.env
# or
code Backend/.env
```

Add:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
DEFAULT_WAREHOUSE_PINCODE=400001
```

### Step 4: Verify Files
Check if these files exist and have the right content:
- `Backend/controller/magicCheckoutController.js` ✅
- `Backend/routes/paymentRoutes.js` ✅

### Step 5: Restart Server
```bash
cd Backend
# Stop current server (Ctrl+C)
npm start
```

### Step 6: Test Endpoints
```bash
# Test create order
curl -X POST http://localhost:5000/api/payments/magic-checkout/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "INR"}'
```

---

## What's Already Done (From Previous Implementation)

✅ `magicCheckoutController.js` - Complete with all functions
✅ Payment routes - All Magic Checkout routes added
✅ Models - All database models ready
✅ Services - Address quality and FShip services ready

## What You Need to Do Now

1. **Add Razorpay keys to `.env`** ⚠️ REQUIRED
2. **Install razorpay package** ⚠️ REQUIRED
3. **Restart backend server** ⚠️ REQUIRED
4. **Test endpoints** ✅ Recommended

---

## Quick Commands

```bash
# 1. Go to backend folder
cd Backend

# 2. Install razorpay
npm install razorpay

# 3. Edit .env file (add Razorpay keys)
nano .env

# 4. Restart server
npm start

# 5. Test in another terminal
curl -X POST http://localhost:5000/api/payments/magic-checkout/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "INR"}'
```

---

## Expected Server Logs

When server starts successfully, you should see:
```
Server running on port 5000
Database connected successfully
Razorpay initialized
```

When Express Checkout is used, you should see:
```
Creating Razorpay order for Express Checkout...
Order created successfully: order_xxxxxxxxxxxxx
Payment verified successfully
```

---

**That's it! Once you complete these steps, Express Checkout will work perfectly! 🚀**
