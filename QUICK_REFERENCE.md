# CrossCoin E-Commerce - Quick Reference Guide

## 🚨 Critical Issues at a Glance

| Issue | File | Line | Fix | Time |
|-------|------|------|-----|------|
| Payment verification fails | `Backend/controller/paymentController.js` | ~1 | Add `await` | 5 min |
| Amount unit inconsistency | Multiple | Multiple | Create converter | 2 hrs |
| Duplicate Razorpay function | 2 files | ~13 | Centralize | 30 min |
| No transaction rollback | `Backend/controller/paymentController.js` | ~1 | Add rollback | 1 hr |

---

## 🔧 One-Minute Fixes

### Fix 1: Payment Verification (5 minutes)
```javascript
// File: Backend/controller/paymentController.js
// Line: ~1 in verifyMagicCheckoutPayment()

// BEFORE:
const isValidSignature = PaymentService.verifyMagicCheckoutSignature(...);

// AFTER:
const isValidSignature = await PaymentService.verifyMagicCheckoutSignature(...);
```

### Fix 2: Enable Magic Checkout (1 minute)
```javascript
// File: Crosscoin/.env

// BEFORE:
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=false

// AFTER:
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
```

---

## 📁 File Structure Reference

```
Backend/
├── controller/
│   ├── paymentController.js          ← Payment processing
│   └── magicCheckoutController.js    ← Magic Checkout
├── model/
│   ├── paymentModel.js               ← Payment schema
│   └── couponModel.js                ← Coupon schema
├── services/
│   ├── paymentService.js             ← Payment utilities
│   ├── fshipService.js               ← Shipping integration
│   └── addressQualityService.js      ← Address validation
├── utils/
│   ├── razorpayHelper.js             ← [NEW] Razorpay instance
│   ├── amountConverter.js            ← [NEW] Amount conversion
│   ├── logger.js                     ← [NEW] Logging
│   └── errorMessages.js              ← [NEW] Error codes
└── routes/
    └── paymentRoutes.js              ← Payment endpoints

Crosscoin/
├── src/
│   ├── pages/
│   │   └── UnifiedCheckout.jsx       ← Checkout page
│   ├── components/
│   │   └── checkout/
│   │       ├── MagicCheckoutIntegration.jsx
│   │       ├── CartStep.jsx
│   │       └── PaymentStep.jsx
│   ├── services/
│   │   ├── publicindex.js            ← API calls
│   │   └── stockService.js           ← [NEW] Stock validation
│   └── utils/
│       ├── validation.js             ← [NEW] Form validation
│       └── toast.js                  ← Toast notifications
└── .env                              ← Environment config
```

---

## 🔑 Key API Endpoints

### Payment Endpoints
```
POST   /api/payments/razorpay-order              Create Razorpay order
POST   /api/payments/update-order-payment        Update payment after success
POST   /api/payments/razorpay-callback           Razorpay callback handler
GET    /api/payments/my-payments                 Get user payments
POST   /api/payments/refund/:paymentId           Process refund (admin)
```

### Magic Checkout Endpoints
```
POST   /api/payments/magic-checkout/create-order      Create order
POST   /api/payments/magic-checkout/verify-payment    Verify payment
GET    /api/payments/magic-checkout/promotions        Get promotions
POST   /api/payments/magic-checkout/apply-promotion   Apply coupon
POST   /api/payments/magic-checkout/shipping-info     Get shipping info
```

---

## 💾 Database Models

### Payment Model
```javascript
{
  id: INTEGER (PK),
  order_id: INTEGER (FK),
  user_id: INTEGER (FK, nullable),
  guest_user_id: INTEGER (FK, nullable),
  payment_type: ENUM('cod', 'credit_card', 'debit_card', 'upi', 'wallet', 'razorpay'),
  transaction_id: STRING,
  razorpay_order_id: STRING,
  razorpay_signature: STRING,
  amount_paid: DECIMAL(10,2),
  status: ENUM('pending', 'successful', 'failed', 'refunded', 'cancelled'),
  payment_gateway: STRING,
  magic_checkout_order_id: STRING,
  magic_checkout_payment_id: STRING,
  magic_checkout_signature: STRING,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### Coupon Model
```javascript
{
  id: INTEGER (PK),
  code: STRING (UNIQUE),
  type: ENUM('percentage', 'fixed'),
  value: DECIMAL,
  minPurchase: DECIMAL,
  maxDiscount: DECIMAL,
  usageLimit: INTEGER,
  usageCount: INTEGER,
  perUserLimit: INTEGER,
  paymentMode: ENUM('cod', 'prepaid', null),
  startDate: DATE,
  endDate: DATE,
  status: ENUM('active', 'inactive'),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

---

## 🧮 Amount Conversion Reference

```javascript
// ALWAYS use these conversions:

// Rupees to Paise (for Razorpay)
const paise = rupees * 100;
// Example: 100 rupees = 10,000 paise

// Paise to Rupees (from Razorpay)
const rupees = paise / 100;
// Example: 10,000 paise = 100 rupees

// Database stores in RUPEES
// Razorpay expects PAISE
// Frontend sends PAISE
```

---

## 🔐 Environment Variables

### Backend (.env)
```
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_DATABASE=crosscoin

# Razorpay
RAZORPAY_KEY_ID=rzp_live_pBysvwx4mlXcuM
RAZORPAY_KEY_SECRET=wUKwe9fq0aaZNt6qNVEwhm5f

# Magic Checkout
RAZORPAY_MAGIC_CHECKOUT_ENABLED=true
MAGIC_CHECKOUT_MIN_ADDRESS_QUALITY_SCORE=60
MAGIC_CHECKOUT_COD_THRESHOLD_SCORE=70

# FShip
FSHIP_API_KEY=788cc7cc216c463217a7145bb3f6989416b159740fb8c54fc1fe32a6fc849aa1
FSHIP_ENVIRONMENT=production
FSHIP_DEFAULT_WAREHOUSE_ID=12191
DEFAULT_WAREHOUSE_PINCODE=400001
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=https://api.crosscoin.in
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_pBysvwx4mlXcuM
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
```

---

## 🧪 Testing Commands

### Test Payment Verification
```bash
curl -X POST http://localhost:5000/api/payments/magic-checkout/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "razorpayPaymentId": "pay_xxx",
    "razorpayOrderId": "order_xxx",
    "razorpaySignature": "sig_xxx"
  }'
```

### Test Promotions
```bash
curl -X GET "http://localhost:5000/api/payments/magic-checkout/promotions?order_id=order_xxx&cart_total=50000&payment_method=prepaid"
```

### Test Shipping Info
```bash
curl -X POST http://localhost:5000/api/payments/magic-checkout/shipping-info \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_xxx",
    "addresses": [{
      "pincode": "400001",
      "city": "Mumbai",
      "state": "Maharashtra"
    }],
    "payment_method": "cod"
  }'
```

### Test Order Creation
```bash
curl -X POST http://localhost:5000/api/payments/magic-checkout/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "customer_id": "user_123",
    "cart_items": [{
      "product_id": 1,
      "price": 100,
      "quantity": 1,
      "name": "Product Name"
    }]
  }'
```

---

## 🐛 Common Issues & Solutions

### Issue: "Payment verification failed"
**Cause:** Missing `await` on async function  
**Solution:** Add `await` to `verifyMagicCheckoutSignature()` call

### Issue: "Invalid amount" error
**Cause:** Amount unit mismatch (paise vs rupees)  
**Solution:** Use `amountConverter` utility for all conversions

### Issue: "Order not found" after payment
**Cause:** Race condition in order creation  
**Solution:** Create order BEFORE payment verification

### Issue: "Coupon not applicable"
**Cause:** Payment mode mismatch  
**Solution:** Filter coupons by payment method

### Issue: "Address not serviceable"
**Cause:** FShip API timeout or pincode not covered  
**Solution:** Add timeout handling and fallback logic

---

## 📊 Payment Flow Diagram

```
User Checkout
    ↓
Select Address & Delivery
    ↓
Select Payment Method
    ↓
    ├─→ COD
    │   ├─→ Create Order
    │   ├─→ Mark as Pending
    │   └─→ Show Thank You
    │
    └─→ Prepaid
        ├─→ Create Razorpay Order
        ├─→ Open Payment Modal
        ├─→ User Pays
        ├─→ Verify Signature
        ├─→ Create Order
        ├─→ Mark as Paid
        └─→ Show Thank You
```

---

## 🎯 Success Criteria

### Payment Processing
- ✅ All payment types work (COD, UPI, Cards)
- ✅ Payment amounts are accurate
- ✅ Payment verification succeeds
- ✅ Orders created after payment
- ✅ Payment records tracked

### Checkout Flow
- ✅ Guest checkout works
- ✅ Authenticated checkout works
- ✅ Address validation works
- ✅ Coupon application works
- ✅ Shipping fees calculated correctly

### Error Handling
- ✅ Clear error messages
- ✅ Graceful error recovery
- ✅ No silent failures
- ✅ Proper logging
- ✅ User feedback

### Performance
- ✅ Checkout loads in < 2 seconds
- ✅ Payment processing in < 5 seconds
- ✅ No timeout errors
- ✅ Handles 100+ concurrent users

---

## 📞 Support Resources

### Documentation
- Razorpay Docs: https://razorpay.com/docs/
- FShip Docs: https://fship.in/api-docs/
- Sequelize Docs: https://sequelize.org/

### Debugging
- Check logs in `Backend/logs/`
- Monitor payment.log for payment issues
- Check error.log for system errors
- Use console.log for frontend debugging

### Testing
- Use Razorpay test keys (rzp_test_...)
- Use test FShip environment
- Test with test data before production

---

## ⏱️ Time Estimates

| Task | Time | Difficulty |
|------|------|-----------|
| Fix payment verification | 5 min | Easy |
| Standardize amounts | 2 hrs | Medium |
| Centralize Razorpay | 30 min | Easy |
| Add transaction rollback | 1 hr | Medium |
| Add brand context | 1.5 hrs | Medium |
| Add coupon filter | 45 min | Easy |
| Improve validation | 1.5 hrs | Easy |
| Add stock validation | 2 hrs | Medium |
| Add error handling | 1.5 hrs | Easy |
| Enable Magic Checkout | 30 min | Easy |
| Add logging | 1.5 hrs | Easy |
| Add timeout handling | 1.5 hrs | Medium |
| Improve error messages | 1 hr | Easy |
| Add loading states | 1 hr | Easy |
| Coupon tracking | 45 min | Easy |

**Total Time:** ~20 hours  
**Recommended Timeline:** 2-3 weeks

---

## ✅ Pre-Launch Checklist

- [ ] All critical fixes implemented
- [ ] All high priority fixes implemented
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] End-to-end tests passing
- [ ] Load testing passed
- [ ] Security testing passed
- [ ] QA approval received
- [ ] Product owner approval received
- [ ] Stakeholder sign-off received
- [ ] Deployment plan created
- [ ] Rollback plan created
- [ ] Monitoring set up
- [ ] Support team trained
- [ ] Documentation updated

---

**Last Updated:** March 11, 2026  
**Status:** Ready for Implementation  
**Next Review:** After Phase 1 completion
