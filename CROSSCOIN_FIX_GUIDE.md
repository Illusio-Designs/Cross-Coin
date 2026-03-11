# CrossCoin E-Commerce - Fix Implementation Guide

## 🔧 How to Fix Critical Issues

This guide provides step-by-step fixes for all critical and high-priority issues found in the audit.

---

## CRITICAL FIX #1: Payment Signature Verification Bug

**File:** `Backend/controller/paymentController.js`  
**Line:** ~1 (in `verifyMagicCheckoutPayment` function)

### The Problem
```javascript
// ❌ WRONG - Missing await on async function
const isValidSignature = PaymentService.verifyMagicCheckoutSignature(
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
);
```

### The Fix
```javascript
// ✅ CORRECT - Add await
const isValidSignature = await PaymentService.verifyMagicCheckoutSignature(
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
);
```

### Why This Matters
- Without `await`, the function returns a Promise instead of the verification result
- This causes all payment verifications to fail
- Users can't complete prepaid orders

---

## CRITICAL FIX #2: Standardize Amount Units (Paise vs Rupees)

**Files:** 
- `Backend/controller/magicCheckoutController.js`
- `Crosscoin/src/pages/UnifiedCheckout.jsx`
- `Backend/services/paymentService.js`

### The Problem
Amounts are inconsistent throughout the codebase:
- Frontend sends paise
- Backend expects rupees in some places
- Shipping fees stored in rupees
- Magic Checkout expects paise

### The Solution

**Step 1: Create a utility file** `Backend/utils/amountConverter.js`

```javascript
/**
 * Amount conversion utilities
 * All amounts in database are stored in RUPEES
 * All Razorpay amounts must be in PAISE
 * Frontend sends amounts in PAISE
 */

module.exports = {
  /**
   * Convert rupees to paise
   * @param {number} rupees - Amount in rupees
   * @returns {number} Amount in paise
   */
  rupeesToPaise: (rupees) => {
    return Math.round(parseFloat(rupees) * 100);
  },

  /**
   * Convert paise to rupees
   * @param {number} paise - Amount in paise
   * @returns {number} Amount in rupees
   */
  paiseToRupees: (paise) => {
    return Math.round(parseFloat(paise) / 100);
  },

  /**
   * Validate amount is in valid range
   * @param {number} amount - Amount to validate
   * @param {string} unit - 'rupees' or 'paise'
   * @returns {boolean} True if valid
   */
  isValidAmount: (amount, unit = 'rupees') => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return false;
    
    if (unit === 'rupees') {
      return num >= 1 && num <= 999999; // Max 9,99,999 rupees
    } else if (unit === 'paise') {
      return num >= 100 && num <= 99999900; // Max 9,99,999 rupees in paise
    }
    return false;
  }
};
```

**Step 2: Update Magic Checkout Controller**

```javascript
// At top of file, add:
const amountConverter = require('../utils/amountConverter');

// In createOrder function, fix line ~280:
module.exports.createOrder = async (req, res) => {
  try {
    const { 
      amount, // This is in RUPEES from frontend
      currency = 'INR', 
      customer_id, 
      cart_items = [],
      shipping_address = {},
      notes = {}
    } = req.body;

    // Validate required parameters
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid amount is required' 
      });
    }

    // ✅ CORRECT - Convert rupees to paise for Razorpay
    const amountInPaise = amountConverter.rupeesToPaise(amount);

    // Format line_items for Magic Checkout
    const formattedLineItems = cart_items.map(item => ({
      type: 'e-commerce',
      sku: item.product_id ? `SKU_${item.product_id}` : 'SKU_UNKNOWN',
      variant_id: item.variation_id ? `VAR_${item.variation_id}` : null,
      price: amountConverter.rupeesToPaise(item.price || 0), // ✅ Convert to paise
      offer_price: amountConverter.rupeesToPaise(item.price || 0),
      tax_amount: 0,
      quantity: item.quantity || 1,
      name: item.name || 'Product',
      description: item.description || '',
    }));

    // Calculate line_items_total in paise
    const lineItemsTotal = formattedLineItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Rest of function...
  }
};
```

**Step 3: Update Shipping Fee Calculation**

```javascript
// In getShippingInfo function, fix line ~350:
const shippingFees = await ShippingFee.findAll();
const prepaidFee = shippingFees.find(f => f.orderType === 'prepaid')?.fee || 0;
const codFee = shippingFees.find(f => f.orderType === 'cod')?.fee || 0;

// Process each address
for (const address of addresses) {
  // ... validation code ...

  // ✅ CORRECT - Convert fees to paise
  if (payment_method === 'cod' && addressInfo.cod_available) {
    addressInfo.shipping_fee = amountConverter.rupeesToPaise(codFee);
    addressInfo.cod_fee = amountConverter.rupeesToPaise(codFee);
  } else {
    addressInfo.shipping_fee = amountConverter.rupeesToPaise(prepaidFee);
    addressInfo.cod_fee = 0;
  }
}
```

---

## CRITICAL FIX #3: Centralize Razorpay Instance

**Create new file:** `Backend/utils/razorpayHelper.js`

```javascript
const Razorpay = require('razorpay');
const settingsHelper = require('../services/settingsHelper');

/**
 * Get Razorpay instance for a specific brand
 * @param {number} brandId - Brand ID (default: 1)
 * @returns {Promise<Razorpay>} Razorpay instance
 */
async function getRazorpayInstance(brandId = 1) {
  try {
    const key_id = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_ID');
    const key_secret = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_SECRET');
    
    if (!key_id || !key_secret) {
      throw new Error(`Razorpay credentials not configured for brand ${brandId}`);
    }
    
    return new Razorpay({
      key_id,
      key_secret
    });
  } catch (error) {
    console.error(`Error initializing Razorpay for brand ${brandId}:`, error);
    throw error;
  }
}

module.exports = { getRazorpayInstance };
```

**Update both controller files:**

```javascript
// In paymentController.js - REMOVE the duplicate function and add:
const { getRazorpayInstance } = require('../utils/razorpayHelper');

// In magicCheckoutController.js - REMOVE the duplicate function and add:
const { getRazorpayInstance } = require('../utils/razorpayHelper');
```

---

## HIGH PRIORITY FIX #4: Add Brand Context to Magic Checkout

**File:** `Backend/controller/magicCheckoutController.js`

### The Problem
All functions hardcode `brandId = 1`, breaking multi-brand support.

### The Solution

```javascript
// Add helper function at top of file:
function getBrandIdFromRequest(req) {
  // Try multiple sources for brand ID
  return req.headers['x-brand-id'] || 
         req.body.brand_id || 
         req.query.brand_id || 
         1; // Default to 1
}

// Update all functions to use it:
module.exports.getPromotions = async (req, res) => {
  try {
    const brandId = getBrandIdFromRequest(req);
    const { order_id, customer_id, cart_total } = req.query;
    
    // ... rest of function ...
    
    // When calling getRazorpayInstance:
    const razorpay = await getRazorpayInstance(brandId);
  }
};

// Apply same pattern to:
// - applyPromotion()
// - getShippingInfo()
// - createOrder()
// - verifyPayment()
```

---

## HIGH PRIORITY FIX #5: Fix Payment Verification Transaction

**File:** `Backend/controller/paymentController.js`

### The Problem
Payment record created before order exists, causing orphaned records.

### The Solution

```javascript
module.exports.verifyMagicCheckoutPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      orderId, 
      razorpayPaymentId, 
      razorpayOrderId, 
      razorpaySignature 
    } = req.body;
    
    // Validate required fields
    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'All payment fields are required' 
      });
    }

    // ✅ STEP 1: Verify signature FIRST (before any database changes)
    const isValidSignature = await PaymentService.verifyMagicCheckoutSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'Invalid payment signature' 
      });
    }

    // ✅ STEP 2: Find and validate order
    const order = await Order.findByPk(orderId, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // ✅ STEP 3: Validate payment amount matches order amount
    const orderAmountInPaise = amountConverter.rupeesToPaise(order.final_amount);
    // Note: You might want to fetch actual payment amount from Razorpay API here
    
    // ✅ STEP 4: Update order status
    order.payment_status = 'paid';
    order.status = 'processing';
    await order.save({ transaction });

    // ✅ STEP 5: Create payment record (only after order is updated)
    const payment = await PaymentService.createMagicCheckoutPayment({
      order_id: order.id,
      user_id: order.user_id,
      guest_user_id: order.guest_user_id,
      payment_type: 'razorpay',
      amount_paid: order.final_amount,
      status: 'successful',
      magic_checkout_order_id: razorpayOrderId,
      magic_checkout_payment_id: razorpayPaymentId,
      magic_checkout_signature: razorpaySignature
    }, transaction);

    // ✅ STEP 6: Increment coupon usage if applicable
    if (order.coupon_id) {
      await CouponUsage.create({
        couponId: order.coupon_id,
        userId: order.user_id,
        orderId: order.id
      }, { transaction });
    }

    // ✅ STEP 7: Commit transaction (all or nothing)
    await transaction.commit();

    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      order: {
        id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        status: order.status
      },
      payment: {
        id: payment.id,
        amount_paid: payment.amount_paid,
        status: payment.status
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error verifying Magic Checkout payment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify payment', 
      error: error.message 
    });
  }
};
```

---

## HIGH PRIORITY FIX #6: Add Coupon Payment Mode Filter

**File:** `Backend/controller/magicCheckoutController.js`

### The Problem
Coupons with payment mode restrictions aren't filtered.

### The Solution

```javascript
module.exports.getPromotions = async (req, res) => {
  try {
    const { order_id, customer_id, cart_total, payment_method } = req.query;

    // Validate required parameters
    if (!order_id || !cart_total) {
      return res.status(400).json({ 
        message: 'order_id and cart_total are required' 
      });
    }

    const cartTotalAmount = parseFloat(cart_total);
    const currentDate = new Date();

    // ✅ FIXED - Add payment_method filter
    const whereClause = {
      status: 'active',
      startDate: { [Op.lte]: currentDate },
      endDate: { [Op.gte]: currentDate }
    };

    // Filter by payment method if specified
    if (payment_method) {
      whereClause[Op.or] = [
        { paymentMode: null }, // Coupons with no restriction
        { paymentMode: payment_method } // Coupons for this payment method
      ];
    }

    const activeCoupons = await Coupon.findAll({ where: whereClause });

    // ... rest of function ...
  }
};
```

---

## HIGH PRIORITY FIX #7: Improve Guest Checkout Validation

**File:** `Crosscoin/src/pages/UnifiedCheckout.jsx`

### Create validation utility: `Crosscoin/src/utils/validation.js`

```javascript
/**
 * Validation utilities for checkout
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // Indian phone number format
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const validatePincode = (pincode) => {
  // Indian pincode format
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(pincode);
};

export const validateAddress = (address) => {
  return {
    isValid: address.fullName && 
             address.phoneNumber && 
             address.address && 
             address.city && 
             address.state && 
             address.postalCode,
    errors: {
      fullName: !address.fullName ? 'Full name is required' : null,
      phoneNumber: !address.phoneNumber ? 'Phone number is required' : 
                   !validatePhone(address.phoneNumber) ? 'Invalid phone number' : null,
      address: !address.address ? 'Address is required' : null,
      city: !address.city ? 'City is required' : null,
      state: !address.state ? 'State is required' : null,
      postalCode: !address.postalCode ? 'Postal code is required' : 
                  !validatePincode(address.postalCode) ? 'Invalid postal code' : null,
    }
  };
};

export const validateGuestInfo = (guestInfo) => {
  return {
    isValid: guestInfo.email && 
             guestInfo.firstName && 
             guestInfo.phone &&
             validateEmail(guestInfo.email) &&
             validatePhone(guestInfo.phone),
    errors: {
      email: !guestInfo.email ? 'Email is required' : 
             !validateEmail(guestInfo.email) ? 'Invalid email format' : null,
      firstName: !guestInfo.firstName ? 'First name is required' : null,
      phone: !guestInfo.phone ? 'Phone is required' : 
             !validatePhone(guestInfo.phone) ? 'Invalid phone number' : null,
    }
  };
};
```

### Update checkout validation:

```javascript
// In UnifiedCheckout.jsx, update handlePlaceOrder:
import { validateEmail, validatePhone, validateAddress, validateGuestInfo } from '../utils/validation';

const handlePlaceOrder = async () => {
  // Validation
  if (!isAuthenticated) {
    const validation = validateGuestInfo(guestInfo);
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors)
        .filter(e => e !== null)
        .join(', ');
      showValidationErrorToast(errorMessages);
      return;
    }
  }

  // Validate address
  const addressValidation = validateAddress(shippingAddress);
  if (!addressValidation.isValid) {
    const errorMessages = Object.values(addressValidation.errors)
      .filter(e => e !== null)
      .join(', ');
    showValidationErrorToast(errorMessages);
    return;
  }

  // ... rest of function ...
};
```

---

## HIGH PRIORITY FIX #8: Add Stock Validation

**File:** `Crosscoin/src/pages/UnifiedCheckout.jsx`

### Create stock validation service: `Crosscoin/src/services/stockService.js`

```javascript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

export const validateCartStock = async (cartItems) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/products/validate-stock`,
      {
        items: cartItems.map(item => ({
          product_id: item.productId || item.id,
          variation_id: item.variationId || item.variation?.id,
          quantity: item.quantity
        }))
      }
    );

    return {
      isValid: response.data.isValid,
      unavailableItems: response.data.unavailableItems || [],
      message: response.data.message
    };
  } catch (error) {
    console.error('Error validating stock:', error);
    throw error;
  }
};
```

### Update checkout to validate stock:

```javascript
const handlePlaceOrder = async () => {
  // ... existing validation ...

  // ✅ NEW - Validate stock before creating order
  try {
    const stockValidation = await validateCartStock(cartItems);
    if (!stockValidation.isValid) {
      showValidationErrorToast(
        `${stockValidation.message}. Please update your cart.`
      );
      return;
    }
  } catch (error) {
    console.error('Stock validation error:', error);
    showValidationErrorToast('Unable to validate stock. Please try again.');
    return;
  }

  // ... rest of function ...
};
```

---

## MEDIUM PRIORITY FIX #9: Enable Magic Checkout

**File:** `Crosscoin/.env`

```javascript
// Change from:
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=false

// To:
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
```

---

## MEDIUM PRIORITY FIX #10: Add Comprehensive Logging

**Create:** `Backend/utils/logger.js`

```javascript
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] INFO: ${message} ${JSON.stringify(data)}\n`;
    console.log(logEntry);
    fs.appendFileSync(path.join(LOG_DIR, 'app.log'), logEntry);
  },

  error: (message, error = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${message} ${JSON.stringify({
      message: error.message,
      stack: error.stack,
      ...error
    })}\n`;
    console.error(logEntry);
    fs.appendFileSync(path.join(LOG_DIR, 'error.log'), logEntry);
  },

  payment: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] PAYMENT: ${message} ${JSON.stringify(data)}\n`;
    console.log(logEntry);
    fs.appendFileSync(path.join(LOG_DIR, 'payment.log'), logEntry);
  }
};

module.exports = logger;
```

### Use in payment controller:

```javascript
const logger = require('../utils/logger');

module.exports.verifyMagicCheckoutPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    
    logger.payment('Payment verification started', {
      orderId,
      razorpayOrderId,
      razorpayPaymentId
    });

    // ... verification logic ...

    logger.payment('Payment verified successfully', {
      orderId,
      paymentId: razorpayPaymentId,
      status: 'successful'
    });

  } catch (error) {
    logger.error('Payment verification failed', error);
    // ... error handling ...
  }
};
```

---

## Implementation Priority

### Week 1 (Critical)
1. Fix payment signature verification (await)
2. Standardize amount units
3. Centralize Razorpay instance
4. Fix payment verification transaction

### Week 2 (High Priority)
5. Add brand context to Magic Checkout
6. Add coupon payment mode filter
7. Improve guest checkout validation
8. Add stock validation

### Week 3 (Medium Priority)
9. Enable Magic Checkout
10. Add comprehensive logging
11. Add timeout handling
12. Improve error messages

---

## Testing After Fixes

```bash
# Test payment verification
curl -X POST http://localhost:5000/api/payments/magic-checkout/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "razorpayPaymentId": "pay_xxx",
    "razorpayOrderId": "order_xxx",
    "razorpaySignature": "sig_xxx"
  }'

# Test promotions with payment method filter
curl -X GET "http://localhost:5000/api/payments/magic-checkout/promotions?order_id=order_xxx&cart_total=50000&payment_method=prepaid"

# Test shipping info
curl -X POST http://localhost:5000/api/payments/magic-checkout/shipping-info \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_xxx",
    "addresses": [{
      "pincode": "400001",
      "city": "Mumbai"
    }],
    "payment_method": "cod"
  }'
```

---

**Next Steps:** Apply these fixes in order of priority, test thoroughly, and deploy to staging before production.
