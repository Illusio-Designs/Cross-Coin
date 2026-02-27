# Razorpay Magic Checkout - Quick Reference

## 🚀 Quick Start

### Environment Variables to Add

**Backend (`Backend/.env`):**
```env
RAZORPAY_MAGIC_CHECKOUT_ENABLED=true
MAGIC_CHECKOUT_MIN_ADDRESS_QUALITY_SCORE=60
MAGIC_CHECKOUT_COD_THRESHOLD_SCORE=70
```

**Frontend (`Frontend/.env.local`):**
```env
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
```

### Database Migrations to Run

```bash
# 1. Add Magic Checkout fields to payments table
ALTER TABLE payments 
ADD COLUMN magic_checkout_order_id VARCHAR(255) NULL,
ADD COLUMN magic_checkout_payment_id VARCHAR(255) NULL,
ADD COLUMN magic_checkout_signature VARCHAR(255) NULL,
ADD INDEX idx_magic_checkout_order (magic_checkout_order_id),
ADD INDEX idx_magic_checkout_payment (magic_checkout_payment_id);

# 2. Create address quality scores table
CREATE TABLE address_quality_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  address_hash VARCHAR(64) NOT NULL UNIQUE,
  pincode VARCHAR(10) NOT NULL,
  quality_score INT NOT NULL DEFAULT 50,
  delivery_success_count INT NOT NULL DEFAULT 0,
  delivery_failure_count INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pincode (pincode),
  INDEX idx_quality_score (quality_score)
);

# 3. Verify coupon_usage table exists (create if needed)
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  user_id INT NULL,
  guest_user_id INT NULL,
  order_id INT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_coupon_user (coupon_id, user_id),
  INDEX idx_coupon_guest (coupon_id, guest_user_id)
);
```

## 📋 What Changes in Your Codebase

### New Files to Create

**Backend:**
- `Backend/controller/magicCheckoutController.js` - Magic Checkout API handlers
- `Backend/services/addressQualityService.js` - Address quality calculation
- `Backend/migrations/add_magic_checkout_to_payments.sql` - Database migration
- `Backend/migrations/create_address_quality_scores.sql` - Database migration
- `Backend/migrations/verify_coupon_usage_table.sql` - Database migration

**Frontend:**
- `Frontend/src/components/checkout/MagicCheckoutIntegration.jsx` - SDK integration
- `Frontend/src/components/checkout/AddressQualityIndicator.jsx` - Quality display

### Files to Update

**Backend:**
- `Backend/routes/paymentRoutes.js` - Add Magic Checkout routes
- `Backend/controller/paymentController.js` - Add Magic Checkout handlers
- `Backend/services/paymentService.js` - Add signature verification
- `Backend/controller/orderController.js` - Support Magic Checkout orders

**Frontend:**
- `Frontend/src/pages/UnifiedCheckout.jsx` - Integrate Magic Checkout
- `Frontend/src/services/publicindex.js` - Add Magic Checkout API calls
- `Frontend/src/styles/pages/checkout.css` - Add Magic Checkout styles

### No Changes Needed

**These stay the same:**
- Database schema (except new columns/tables above)
- FShip integration (`Backend/services/fshipService.js`)
- Order models (`Backend/model/orderModel.js`, `Backend/model/paymentModel.js`)
- Existing payment routes and controllers (backward compatible)
- Cart functionality
- Wishlist functionality
- Product catalog

## 🔌 New API Endpoints

All endpoints added to existing `Backend/routes/paymentRoutes.js`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments/magic-checkout/promotions` | GET | Fetch applicable promotions |
| `/api/payments/magic-checkout/apply-promotion` | POST | Apply promotion code |
| `/api/payments/magic-checkout/shipping-info` | POST | Get shipping serviceability |
| `/api/payments/magic-checkout/create-order` | POST | Create Razorpay order |
| `/api/payments/magic-checkout/verify-payment` | POST | Verify payment signature |

## 🎯 Razorpay Dashboard Configuration

### URLs to Configure

1. **Get Promotions URL:**
   ```
   https://api.crosscoin.in/api/payments/magic-checkout/promotions
   ```

2. **Apply Promotions URL:**
   ```
   https://api.crosscoin.in/api/payments/magic-checkout/apply-promotion
   ```

3. **Shipping Info URL:**
   ```
   https://api.crosscoin.in/api/payments/magic-checkout/shipping-info
   ```

### Configuration Steps

1. Login to Razorpay Dashboard
2. Navigate to **Magic Checkout** → **Platform Setup**
3. Select **Custom E-Commerce Platform**
4. Go to **Checkout Settings** → **Coupon Settings**
5. Enter promotion URLs
6. Go to **Shipping Setup**
7. Select **API** as service type
8. Enter shipping info URL
9. Save all settings

## 🧪 Testing Checklist

### Backend Tests
- [ ] GET `/api/payments/magic-checkout/promotions` returns active coupons
- [ ] POST `/api/payments/magic-checkout/apply-promotion` validates and applies discount
- [ ] POST `/api/payments/magic-checkout/shipping-info` returns serviceability
- [ ] Payment signature verification works
- [ ] Orders created with Magic Checkout data

### Frontend Tests
- [ ] Magic Checkout SDK loads on checkout page
- [ ] Promotions display correctly
- [ ] Address quality indicators show
- [ ] COD availability determined correctly
- [ ] Payment flow completes successfully
- [ ] Fallback to standard checkout works

### Integration Tests
- [ ] Complete checkout flow (prepaid)
- [ ] Complete checkout flow (COD)
- [ ] Guest checkout with Magic Checkout
- [ ] Authenticated checkout with Magic Checkout
- [ ] FShip order creation after Magic Checkout payment
- [ ] Email notifications sent

## 🔧 Common Issues and Fixes

### Issue: SDK Not Loading
```javascript
// Check browser console for:
// "Razorpay is not defined"

// Fix: Verify environment variable
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_pBysvwx4mlXcuM
```

### Issue: No Promotions Showing
```sql
-- Check if promotions exist and are active
SELECT * FROM coupons 
WHERE status = 'active' 
AND start_date <= NOW() 
AND end_date >= NOW();
```

### Issue: COD Not Available
```javascript
// Check address quality score
// Default threshold is 70
// Adjust in .env:
MAGIC_CHECKOUT_COD_THRESHOLD_SCORE=60
```

### Issue: Payment Verification Failing
```javascript
// Verify signature calculation
const crypto = require('crypto');
const generated_signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(razorpay_order_id + '|' + razorpay_payment_id)
  .digest('hex');

// Must match razorpay_signature from callback
```

## 📊 Key Metrics to Monitor

### Business Metrics
- Magic Checkout adoption rate
- Saved address usage rate
- Saved payment method usage rate
- Promotion application rate
- COD vs Prepaid ratio
- RTO rate (Magic Checkout vs Standard)

### Technical Metrics
- SDK load success rate
- API response times
- Payment success rate
- Order creation success rate
- Error rates by endpoint

## 🔒 Security Checklist

- [ ] API keys stored in environment variables (not in code)
- [ ] Payment signatures verified on backend
- [ ] Payment amounts validated
- [ ] Rate limiting implemented on payment endpoints
- [ ] Address data hashed before storing quality scores
- [ ] HTTPS enforced for all API calls
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints

## 🚦 Deployment Steps

### Pre-Deployment
1. Backup database
2. Run migrations on staging
3. Test all flows on staging
4. Review code changes
5. Prepare rollback plan

### Deployment
1. Set environment variables
2. Run database migrations
3. Deploy backend code
4. Deploy frontend code
5. Configure Razorpay Dashboard
6. Test in production

### Post-Deployment
1. Monitor error logs
2. Check payment success rate
3. Verify order creation
4. Monitor FShip integration
5. Check email notifications

## 📞 Support Contacts

- **Razorpay Support:** support@razorpay.com
- **Razorpay Dashboard:** https://dashboard.razorpay.com/
- **FShip Support:** support@fship.in
- **Documentation:** https://razorpay.com/docs/payments/magic-checkout/

## 🎓 Key Concepts

### Address Quality Score
- Range: 0-100
- Factors: Pincode validity, phone validity, address completeness, historical delivery data
- Used to determine COD availability
- Threshold configurable via environment variable

### COD Serviceability
- Based on address quality score
- Integrates with FShip serviceability data
- Can be disabled for low-quality addresses
- Reduces RTO (Return to Origin) rates

### Promotion Validation
- Checks active status and date range
- Validates usage limits (total and per-user)
- Verifies minimum purchase requirements
- Applies maximum discount caps

### Payment Verification
- Uses HMAC SHA256 signature
- Validates order_id and payment_id
- Ensures payment amount matches order amount
- Prevents payment tampering

## 📝 Quick Commands

### Start Development
```bash
# Backend
cd Backend
npm start

# Frontend
cd Frontend
npm run dev
```

### Run Migrations
```bash
cd Backend
mysql -u root -p crosscoin < migrations/add_magic_checkout_to_payments.sql
mysql -u root -p crosscoin < migrations/create_address_quality_scores.sql
mysql -u root -p crosscoin < migrations/verify_coupon_usage_table.sql
```

### Check Logs
```bash
# Backend logs
tail -f Backend/logs/app.log

# Frontend logs (browser console)
# Open DevTools → Console
```

### Test API Endpoints
```bash
# Get promotions
curl -X GET "http://localhost:5000/api/payments/magic-checkout/promotions?order_id=test&cart_total=100000"

# Apply promotion
curl -X POST "http://localhost:5000/api/payments/magic-checkout/apply-promotion" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"test","promotion_code":"WELCOME10","cart_total":100000}'

# Get shipping info
curl -X POST "http://localhost:5000/api/payments/magic-checkout/shipping-info" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"test","addresses":[{"pincode":"400001"}],"cart_total":100000}'
```

---

**Quick Reference Version:** 1.0  
**Last Updated:** [Current Date]  
**Status:** Ready for Implementation
