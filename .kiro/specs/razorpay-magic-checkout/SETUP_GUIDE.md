# Razorpay Magic Checkout - Setup Guide

## Overview
This guide provides detailed instructions for setting up Razorpay Magic Checkout integration in the Cross Coin e-commerce platform.

## Prerequisites
- Razorpay account with Magic Checkout enabled
- Access to Razorpay Dashboard
- MySQL database access
- Node.js backend and Next.js frontend running

## 1. Environment Variables Setup

### Backend Environment Variables

Add the following to `Backend/.env`:

```env
# ============================================
# RAZORPAY MAGIC CHECKOUT CONFIGURATION
# ============================================

# Enable/Disable Magic Checkout Feature
RAZORPAY_MAGIC_CHECKOUT_ENABLED=true

# Address Quality Thresholds
# Minimum score (0-100) for address to be considered valid
MAGIC_CHECKOUT_MIN_ADDRESS_QUALITY_SCORE=60

# Minimum score (0-100) for COD to be available
# Addresses below this score will only allow prepaid payment
MAGIC_CHECKOUT_COD_THRESHOLD_SCORE=70
```

### Existing Variables to Verify

Ensure these variables are already present in `Backend/.env`:

```env
# Razorpay Credentials (ALREADY EXISTS)
RAZORPAY_KEY_ID=rzp_live_pBysvwx4mlXcuM
RAZORPAY_KEY_SECRET=wUKwe9fq0aaZNt6qNVEwhm5f

# FShip Configuration (ALREADY EXISTS - Used for serviceability)
FSHIP_API_KEY=788cc7cc216c463217a7145bb3f6989416b159740fb8c54fc1fe32a6fc849aa1
FSHIP_ENVIRONMENT=production
FSHIP_PRODUCTION_URL=https://capi.fship.in
FSHIP_DEFAULT_WAREHOUSE_ID=227729
```

### Frontend Environment Variables

Add the following to `Frontend/.env.local`:

```env
# ============================================
# RAZORPAY MAGIC CHECKOUT CONFIGURATION
# ============================================

# Razorpay Public Key (ALREADY EXISTS)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_pBysvwx4mlXcuM

# Enable/Disable Magic Checkout Feature
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
```

### Environment Variable Descriptions

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RAZORPAY_MAGIC_CHECKOUT_ENABLED` | Boolean | false | Master switch to enable/disable Magic Checkout |
| `MAGIC_CHECKOUT_MIN_ADDRESS_QUALITY_SCORE` | Number (0-100) | 60 | Minimum address quality score to allow checkout |
| `MAGIC_CHECKOUT_COD_THRESHOLD_SCORE` | Number (0-100) | 70 | Minimum score required to enable COD option |
| `NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED` | Boolean | false | Frontend feature flag for Magic Checkout |

## 2. Database Schema Changes

### Migration 1: Add Magic Checkout Fields to Payments Table

**File:** `Backend/migrations/add_magic_checkout_to_payments.sql`

```sql
-- Add Magic Checkout specific fields to payments table
ALTER TABLE payments 
ADD COLUMN magic_checkout_order_id VARCHAR(255) NULL COMMENT 'Razorpay Magic Checkout order identifier' AFTER razorpay_signature,
ADD COLUMN magic_checkout_payment_id VARCHAR(255) NULL COMMENT 'Razorpay Magic Checkout payment identifier' AFTER magic_checkout_order_id,
ADD COLUMN magic_checkout_signature VARCHAR(255) NULL COMMENT 'Payment signature for Magic Checkout verification' AFTER magic_checkout_payment_id;

-- Add indexes for faster lookups
ALTER TABLE payments
ADD INDEX idx_magic_checkout_order (magic_checkout_order_id),
ADD INDEX idx_magic_checkout_payment (magic_checkout_payment_id);
```

**Rollback:**
```sql
ALTER TABLE payments 
DROP INDEX idx_magic_checkout_payment,
DROP INDEX idx_magic_checkout_order,
DROP COLUMN magic_checkout_signature,
DROP COLUMN magic_checkout_payment_id,
DROP COLUMN magic_checkout_order_id;
```

### Migration 2: Create Address Quality Scores Table

**File:** `Backend/migrations/create_address_quality_scores.sql`

```sql
-- Create table to track address quality scores
CREATE TABLE IF NOT EXISTS address_quality_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  address_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA256 hash of normalized address',
  pincode VARCHAR(10) NOT NULL,
  quality_score INT NOT NULL DEFAULT 50 COMMENT 'Quality score 0-100',
  delivery_success_count INT NOT NULL DEFAULT 0 COMMENT 'Number of successful deliveries',
  delivery_failure_count INT NOT NULL DEFAULT 0 COMMENT 'Number of failed deliveries',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pincode (pincode),
  INDEX idx_quality_score (quality_score),
  INDEX idx_address_hash (address_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Tracks address quality scores for COD serviceability';
```

**Rollback:**
```sql
DROP TABLE IF EXISTS address_quality_scores;
```

### Migration 3: Verify/Create Coupon Usage Table

**File:** `Backend/migrations/verify_coupon_usage_table.sql`

```sql
-- Create coupon_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL COMMENT 'Reference to coupons table',
  user_id INT NULL COMMENT 'Reference to users table (null for guest)',
  guest_user_id INT NULL COMMENT 'Reference to guest_users table (null for registered)',
  order_id INT NULL COMMENT 'Reference to orders table',
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Discount amount applied',
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_coupon_user (coupon_id, user_id),
  INDEX idx_coupon_guest (coupon_id, guest_user_id),
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Tracks coupon usage for Magic Checkout promotions';
```

**Rollback:**
```sql
-- Only drop if you created it new, otherwise skip
-- DROP TABLE IF EXISTS coupon_usage;
```

### Running Migrations

#### Development Environment
```bash
cd Backend
mysql -u root -p crosscoin < migrations/add_magic_checkout_to_payments.sql
mysql -u root -p crosscoin < migrations/create_address_quality_scores.sql
mysql -u root -p crosscoin < migrations/verify_coupon_usage_table.sql
```

#### Production Environment
```bash
# Backup database first
mysqldump -u root -p crosscoin > backup_before_magic_checkout_$(date +%Y%m%d).sql

# Run migrations
mysql -u root -p crosscoin < migrations/add_magic_checkout_to_payments.sql
mysql -u root -p crosscoin < migrations/create_address_quality_scores.sql
mysql -u root -p crosscoin < migrations/verify_coupon_usage_table.sql

# Verify migrations
mysql -u root -p crosscoin -e "DESCRIBE payments;"
mysql -u root -p crosscoin -e "DESCRIBE address_quality_scores;"
mysql -u root -p crosscoin -e "DESCRIBE coupon_usage;"
```

## 3. Razorpay Dashboard Configuration

### Step 1: Enable Magic Checkout
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to **Magic Checkout** section
3. Click **Enable Magic Checkout**

### Step 2: Configure Platform
1. In Magic Checkout settings, select **Platform Setup**
2. Choose **Custom E-Commerce Platform** from dropdown
3. Click **Next**

### Step 3: Configure Coupon Settings
1. Navigate to **Setup & Settings** → **Checkout Settings**
2. In **Coupon Settings** section, enter:
   - **URL for get promotions:** `https://api.crosscoin.in/api/payments/magic-checkout/promotions`
   - **URL for apply promotions:** `https://api.crosscoin.in/api/payments/magic-checkout/apply-promotion`
3. Click **Save settings**

### Step 4: Configure Shipping Setup
1. Navigate to **Shipping Setup**
2. Select **API** as Shipping Service type
3. Enter **URL for shipping info:** `https://api.crosscoin.in/api/payments/magic-checkout/shipping-info`
4. Click **Save Settings**

### Step 5: Configure Webhooks (Optional)
1. Navigate to **Settings** → **Webhooks**
2. Add webhook URL: `https://api.crosscoin.in/api/payments/magic-checkout/webhook`
3. Select events:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
4. Click **Save**

## 4. API Endpoint URLs

### Magic Checkout Endpoints (New)

| Endpoint | Method | URL | Auth Required |
|----------|--------|-----|---------------|
| Get Promotions | GET | `/api/payments/magic-checkout/promotions` | Optional |
| Apply Promotion | POST | `/api/payments/magic-checkout/apply-promotion` | Optional |
| Get Shipping Info | POST | `/api/payments/magic-checkout/shipping-info` | Optional |
| Create Order | POST | `/api/payments/magic-checkout/create-order` | Optional |
| Verify Payment | POST | `/api/payments/magic-checkout/verify-payment` | No |

### Existing Endpoints (Reused)

| Endpoint | Method | URL | Auth Required |
|----------|--------|-----|---------------|
| Create Razorpay Order | POST | `/api/payments/razorpay-order` | Yes |
| Update Order Payment | POST | `/api/payments/update-order-payment` | No |
| Create Order | POST | `/api/orders` | Yes |
| Create Guest Order | POST | `/api/orders/guest` | No |

## 5. Testing Configuration

### Test Mode Setup

1. **Use Test API Keys:**
   ```env
   # Backend .env (Test Mode)
   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
   ```

2. **Configure Test Endpoints in Razorpay Dashboard:**
   - Use `https://your-test-domain.com/api/payments/magic-checkout/*` URLs
   - Or use ngrok for local testing: `https://xxxxx.ngrok.io/api/payments/magic-checkout/*`

3. **Test Cards:**
   - Success: `4111 1111 1111 1111`
   - Failure: `4000 0000 0000 0002`
   - CVV: Any 3 digits
   - Expiry: Any future date

### Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start backend server
cd Backend
npm start

# In another terminal, start ngrok
ngrok http 5000

# Use the ngrok URL in Razorpay Dashboard
# Example: https://abc123.ngrok.io/api/payments/magic-checkout/promotions
```

## 6. Verification Checklist

### Backend Verification
- [ ] All environment variables added to `.env`
- [ ] Database migrations executed successfully
- [ ] New tables created: `address_quality_scores`, `coupon_usage`
- [ ] New columns added to `payments` table
- [ ] Backend server starts without errors
- [ ] API endpoints accessible

### Frontend Verification
- [ ] Environment variables added to `.env.local`
- [ ] Frontend builds successfully
- [ ] No console errors on checkout page
- [ ] Magic Checkout SDK loads (check Network tab)

### Razorpay Dashboard Verification
- [ ] Magic Checkout enabled
- [ ] Platform configured as Custom E-Commerce
- [ ] Coupon API URLs configured
- [ ] Shipping API URL configured
- [ ] Webhooks configured (optional)
- [ ] Test mode working

### Integration Verification
- [ ] Get promotions endpoint returns data
- [ ] Apply promotion endpoint validates correctly
- [ ] Shipping info endpoint returns serviceability
- [ ] Payment flow completes successfully
- [ ] Orders created with Magic Checkout data
- [ ] FShip integration works with new orders

## 7. Troubleshooting

### Issue: Magic Checkout SDK Not Loading

**Symptoms:** Console error "Razorpay is not defined"

**Solutions:**
1. Check if `NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true` in `.env.local`
2. Verify Razorpay key is correct
3. Check browser console for network errors
4. Ensure CDN is accessible (not blocked by firewall)

### Issue: Promotions Not Showing

**Symptoms:** No promotions displayed in checkout

**Solutions:**
1. Verify promotions exist in `coupons` table
2. Check promotion dates (start_date, end_date)
3. Verify promotion status is 'active'
4. Check API endpoint URL in Razorpay Dashboard
5. Review backend logs for errors

### Issue: COD Not Available

**Symptoms:** COD option not showing for valid addresses

**Solutions:**
1. Check address quality score calculation
2. Verify `MAGIC_CHECKOUT_COD_THRESHOLD_SCORE` setting
3. Check FShip serviceability response
4. Review address validation logic
5. Check pincode in FShip system

### Issue: Payment Verification Failing

**Symptoms:** Orders not created after payment

**Solutions:**
1. Verify `RAZORPAY_KEY_SECRET` is correct
2. Check signature verification logic
3. Review payment callback logs
4. Ensure webhook URL is accessible
5. Check payment amount matches order amount

## 8. Rollback Procedure

If you need to rollback the Magic Checkout integration:

### Step 1: Disable Feature Flags
```env
# Backend .env
RAZORPAY_MAGIC_CHECKOUT_ENABLED=false

# Frontend .env.local
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=false
```

### Step 2: Restart Services
```bash
# Restart backend
cd Backend
npm restart

# Rebuild and restart frontend
cd Frontend
npm run build
npm start
```

### Step 3: Rollback Database (Optional)
```bash
# Only if you want to remove new tables/columns
mysql -u root -p crosscoin < migrations/rollback_magic_checkout.sql
```

### Step 4: Revert Razorpay Dashboard
1. Navigate to Magic Checkout settings
2. Remove API endpoint URLs
3. Disable Magic Checkout (optional)

## 9. Monitoring and Maintenance

### Metrics to Monitor
- Magic Checkout initialization success rate
- Promotion application rate
- Address quality score distribution
- COD vs Prepaid ratio
- Payment success rate
- Order creation success rate
- RTO rate comparison (Magic Checkout vs Standard)

### Regular Maintenance
- Review address quality scores monthly
- Update COD threshold based on RTO data
- Monitor promotion usage and adjust limits
- Review failed payment logs
- Update FShip serviceability data

## 10. Support and Resources

### Documentation
- [Razorpay Magic Checkout Docs](https://razorpay.com/docs/payments/magic-checkout/)
- [Razorpay API Reference](https://razorpay.com/docs/api/)
- [FShip API Docs](https://fship.in/docs)

### Contact
- Razorpay Support: support@razorpay.com
- FShip Support: support@fship.in
- Internal Team: [Your team contact]

## 11. Security Considerations

### API Key Security
- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate keys periodically
- Use different keys for test and production

### Payment Verification
- Always verify payment signatures
- Validate payment amounts match order amounts
- Log all verification attempts
- Implement rate limiting on payment endpoints

### Address Data
- Hash addresses before storing quality scores
- Don't store sensitive customer data unnecessarily
- Comply with data protection regulations
- Implement data retention policies

## 12. Performance Optimization

### Caching Strategy
- Cache promotion data for 5 minutes
- Cache FShip serviceability data for 1 hour
- Cache address quality scores for 24 hours
- Use Redis for distributed caching (optional)

### Database Optimization
- Add indexes on frequently queried columns
- Archive old address quality scores
- Partition coupon_usage table by date
- Regular database maintenance

### API Optimization
- Implement request batching where possible
- Use connection pooling
- Optimize database queries
- Monitor API response times

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Status:** Ready for Implementation
