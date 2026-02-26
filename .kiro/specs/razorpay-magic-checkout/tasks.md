# Implementation Tasks: Razorpay Magic Checkout Integration

## Overview
This task list implements Razorpay Magic Checkout integration for the Cross Coin e-commerce platform. The implementation reuses existing routes and controllers where possible, adding new endpoints only for Magic Checkout-specific APIs.

## Environment Variables Required

### Backend (.env)
Add the following to `Backend/.env`:
```env
# Razorpay Magic Checkout Configuration
RAZORPAY_MAGIC_CHECKOUT_ENABLED=true
MAGIC_CHECKOUT_MIN_ADDRESS_QUALITY_SCORE=60
MAGIC_CHECKOUT_COD_THRESHOLD_SCORE=70
```

**Existing variables to verify:**
- `RAZORPAY_KEY_ID` - Already present
- `RAZORPAY_KEY_SECRET` - Already present
- `FSHIP_API_KEY` - Already present (for serviceability checks)

### Frontend (.env.local)
Add the following to `Frontend/.env.local`:
```env
# Razorpay Magic Checkout
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_pBysvwx4mlXcuM
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true
```

## Database Changes Required

### Migration 1: Add Magic Checkout fields to payments table
```sql
ALTER TABLE payments 
ADD COLUMN magic_checkout_order_id VARCHAR(255) NULL AFTER razorpay_signature,
ADD COLUMN magic_checkout_payment_id VARCHAR(255) NULL AFTER magic_checkout_order_id,
ADD COLUMN magic_checkout_signature VARCHAR(255) NULL AFTER magic_checkout_payment_id,
ADD INDEX idx_magic_checkout_order (magic_checkout_order_id),
ADD INDEX idx_magic_checkout_payment (magic_checkout_payment_id);
```

### Migration 2: Add address quality tracking table
```sql
CREATE TABLE IF NOT EXISTS address_quality_scores (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### Migration 3: Add coupon usage tracking enhancements
```sql
-- Verify coupon_usage table exists, if not create it
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  user_id INT NULL,
  guest_user_id INT NULL,
  order_id INT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_coupon_user (coupon_id, user_id),
  INDEX idx_coupon_guest (coupon_id, guest_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## Task Breakdown

### Phase 1: Backend API Endpoints (Use Existing Routes)

- [x] 1. Create Magic Checkout Controller
  - [x] 1.1 Create `Backend/controller/magicCheckoutController.js`
  - [x] 1.2 Implement `getPromotions` handler
    - [x] 1.2.1 Query active coupons from database
    - [x] 1.2.2 Filter by date range (start_date, end_date)
    - [x] 1.2.3 Check total usage limits
    - [x] 1.2.4 Check per-user usage limits
    - [x] 1.2.5 Validate minimum purchase requirements
    - [x] 1.2.6 Calculate discount amounts for percentage coupons
    - [x] 1.2.7 Return formatted promotions array
  - [x] 1.3 Implement `applyPromotion` handler
    - [x] 1.3.1 Validate promotion code exists
    - [x] 1.3.2 Check promotion is active and not expired
    - [x] 1.3.3 Verify usage limits not exceeded
    - [x] 1.3.4 Validate minimum purchase requirement
    - [x] 1.3.5 Calculate discount amount based on type
    - [x] 1.3.6 Apply maximum discount cap for percentage
    - [x] 1.3.7 Return discount amount and final total
  - [x] 1.4 Implement `getShippingInfo` handler
    - [x] 1.4.1 Validate address completeness
    - [x] 1.4.2 Calculate address quality score
    - [x] 1.4.3 Check FShip serviceability by pincode
    - [x] 1.4.4 Determine COD availability based on quality score
    - [x] 1.4.5 Calculate shipping fees from shipping_fees table
    - [x] 1.4.6 Calculate COD fees if applicable
    - [x] 1.4.7 Return shipping info for each address

- [x] 2. Create Address Quality Service
  - [x] 2.1 Create `Backend/services/addressQualityService.js`
  - [x] 2.2 Implement `calculateAddressQuality` function
    - [x] 2.2.1 Validate pincode format (6 digits)
    - [x] 2.2.2 Validate phone number format (10 digits)
    - [x] 2.2.3 Check address completeness (all required fields)
    - [x] 2.2.4 Query historical delivery data from database
    - [x] 2.2.5 Calculate quality score (0-100)
    - [x] 2.2.6 Return quality score and factors
  - [x] 2.3 Implement `getAddressHash` function for tracking
  - [x] 2.4 Implement `updateAddressQuality` function for feedback

- [x] 3. Update Payment Service for Magic Checkout
  - [x] 3.1 Update `Backend/services/paymentService.js`
  - [x] 3.2 Add `verifyMagicCheckoutSignature` function
    - [x] 3.2.1 Extract order_id and payment_id from callback
    - [x] 3.2.2 Generate signature using HMAC SHA256
    - [x] 3.2.3 Compare with received signature
    - [x] 3.2.4 Return verification result
  - [x] 3.3 Add `createMagicCheckoutPayment` function
    - [x] 3.3.1 Store magic_checkout_order_id
    - [x] 3.3.2 Store magic_checkout_payment_id
    - [x] 3.3.3 Store magic_checkout_signature
    - [x] 3.3.4 Link to order record

- [x] 4. Update Payment Controller for Magic Checkout
  - [x] 4.1 Update `Backend/controller/paymentController.js`
  - [x] 4.2 Add `createMagicCheckoutOrder` handler
    - [x] 4.2.1 Validate request parameters
    - [x] 4.2.2 Create Razorpay order with Magic Checkout flag
    - [x] 4.2.3 Return order details with Magic Checkout context
  - [x] 4.3 Add `verifyMagicCheckoutPayment` handler
    - [x] 4.3.1 Verify payment signature
    - [x] 4.3.2 Validate payment amount
    - [x] 4.3.3 Update payment record
    - [x] 4.3.4 Update order status
    - [x] 4.3.5 Return verification result
  - [x] 4.4 Update `updateOrderPayment` to support Magic Checkout fields

- [x] 5. Add Magic Checkout Routes
  - [x] 5.1 Update `Backend/routes/paymentRoutes.js` (reuse existing file)
  - [x] 5.2 Add route: `GET /api/payments/magic-checkout/promotions`
  - [x] 5.3 Add route: `POST /api/payments/magic-checkout/apply-promotion`
  - [x] 5.4 Add route: `POST /api/payments/magic-checkout/shipping-info`
  - [x] 5.5 Add route: `POST /api/payments/magic-checkout/create-order`
  - [x] 5.6 Add route: `POST /api/payments/magic-checkout/verify-payment`
  - [x] 5.7 Add authentication middleware where needed
  - [x] 5.8 Add guest access support for guest checkout

- [x] 6. Update Order Controller for Magic Checkout
  - [x] 6.1 Update `Backend/controller/orderController.js`
  - [x] 6.2 Modify `createOrder` to accept Magic Checkout payment data
  - [x] 6.3 Modify `createGuestOrder` to accept Magic Checkout payment data
  - [x] 6.4 Add validation for Magic Checkout order creation
  - [x] 6.5 Store Magic Checkout identifiers with order

### Phase 2: Frontend Integration

- [x] 7. Create Magic Checkout SDK Integration
  - [x] 7.1 Create `Frontend/src/components/checkout/MagicCheckoutIntegration.jsx`
  - [x] 7.2 Implement SDK loading function
    - [x] 7.2.1 Load Magic Checkout SDK from CDN
    - [x] 7.2.2 Handle SDK load success
    - [x] 7.2.3 Handle SDK load failure with fallback
  - [x] 7.3 Implement SDK initialization
    - [x] 7.3.1 Initialize with Razorpay key
    - [x] 7.3.2 Pass order context
    - [x] 7.3.3 Configure callbacks
  - [x] 7.4 Implement promotion fetching
    - [x] 7.4.1 Call get promotions API
    - [x] 7.4.2 Display promotions in UI
    - [x] 7.4.3 Handle promotion selection
  - [x] 7.5 Implement promotion application
    - [x] 7.5.1 Call apply promotion API
    - [x] 7.5.2 Update order total
    - [x] 7.5.3 Display discount amount
  - [x] 7.6 Implement shipping info fetching
    - [x] 7.6.1 Call shipping info API with addresses
    - [x] 7.6.2 Display serviceability status
    - [x] 7.6.3 Show COD availability
    - [x] 7.6.4 Display shipping fees
  - [x] 7.7 Implement payment processing
    - [x] 7.7.1 Handle payment method selection
    - [x] 7.7.2 Process payment through Magic Checkout
    - [x] 7.7.3 Handle payment success callback
    - [x] 7.7.4 Handle payment failure callback
  - [x] 7.8 Implement error handling and fallback
    - [x] 7.8.1 Detect Magic Checkout failures
    - [x] 7.8.2 Switch to standard checkout
    - [x] 7.8.3 Display error messages

- [x] 8. Update UnifiedCheckout Page
  - [x] 8.1 Update `Frontend/src/pages/UnifiedCheckout.jsx`
  - [x] 8.2 Add feature flag check for Magic Checkout
  - [x] 8.3 Import MagicCheckoutIntegration component
  - [x] 8.4 Conditionally render Magic Checkout or standard checkout
  - [x] 8.5 Pass cart items and user data to Magic Checkout
  - [x] 8.6 Handle Magic Checkout success callback
  - [x] 8.7 Handle Magic Checkout error callback
  - [x] 8.8 Maintain existing standard checkout flow as fallback

- [x] 9. Update Checkout Services
  - [x] 9.1 Update `Frontend/src/services/publicindex.js`
  - [x] 9.2 Add `getMagicCheckoutPromotions` function
  - [x] 9.3 Add `applyMagicCheckoutPromotion` function
  - [x] 9.4 Add `getMagicCheckoutShippingInfo` function
  - [x] 9.5 Add `createMagicCheckoutOrder` function
  - [x] 9.6 Add `verifyMagicCheckoutPayment` function
  - [x] 9.7 Add error handling for all Magic Checkout APIs

- [x] 10. Create Address Quality Display Component
  - [x] 10.1 Create `Frontend/src/components/checkout/AddressQualityIndicator.jsx`
  - [x] 10.2 Display address quality score visually
  - [x] 10.3 Show COD availability status
  - [x] 10.4 Display quality factors (pincode valid, phone valid, etc.)
  - [x] 10.5 Show recommendations (prepaid vs COD)

- [x] 11. Update Checkout Styling
  - [x] 11.1 Update `Frontend/src/styles/pages/checkout.css`
  - [x] 11.2 Add styles for Magic Checkout components
  - [x] 11.3 Add styles for address quality indicators
  - [x] 11.4 Add styles for promotion display
  - [x] 11.5 Ensure responsive design for mobile

### Phase 3: Testing and Validation

- [x] 12. Backend API Testing
  - [x] 12.1 Test get promotions endpoint
    - [x] 12.1.1 Test with valid order context
    - [x] 12.1.2 Test with expired promotions
    - [x] 12.1.3 Test with usage limit exceeded
    - [x] 12.1.4 Test with minimum purchase not met
  - [x] 12.2 Test apply promotion endpoint
    - [x] 12.2.1 Test valid promotion application
    - [x] 12.2.2 Test invalid promotion code
    - [x] 12.2.3 Test percentage discount calculation
    - [x] 12.2.4 Test fixed discount calculation
    - [x] 12.2.5 Test maximum discount cap
  - [x] 12.3 Test shipping info endpoint
    - [x] 12.3.1 Test with valid addresses
    - [x] 12.3.2 Test with invalid pincode
    - [x] 12.3.3 Test COD serviceability logic
    - [x] 12.3.4 Test shipping fee calculation
  - [x] 12.4 Test payment verification
    - [x] 12.4.1 Test valid signature verification
    - [x] 12.4.2 Test invalid signature rejection
    - [x] 12.4.3 Test payment amount validation

- [x] 13. Frontend Integration Testing
  - [x] 13.1 Test Magic Checkout SDK loading
  - [x] 13.2 Test promotion display and application
  - [x] 13.3 Test address quality indicators
  - [x] 13.4 Test payment flow (prepaid)
  - [x] 13.5 Test COD flow
  - [x] 13.6 Test guest checkout with Magic Checkout
  - [x] 13.7 Test authenticated checkout with Magic Checkout
  - [x] 13.8 Test fallback to standard checkout

- [x] 14. End-to-End Testing
  - [x] 14.1 Test complete checkout flow with Magic Checkout
  - [x] 14.2 Test order creation with Magic Checkout payment
  - [x] 14.3 Test FShip integration with Magic Checkout orders
  - [x] 14.4 Test email notifications for Magic Checkout orders
  - [x] 14.5 Test order tracking for Magic Checkout orders

### Phase 4: Database Migrations and Configuration

- [x] 15. Database Migrations
  - [x] 15.1 Create migration file for payments table updates
  - [x] 15.2 Create migration file for address_quality_scores table
  - [x] 15.3 Create migration file for coupon_usage table (if not exists)
  - [x] 15.4 Run migrations on development database
  - [x] 15.5 Verify migrations on staging database
  - [x] 15.6 Document rollback procedures

- [x] 16. Configuration and Environment Setup
  - [x] 16.1 Add Magic Checkout environment variables to .env
  - [x] 16.2 Add Magic Checkout environment variables to .env.local
  - [x] 16.3 Update .env.example files with new variables
  - [x] 16.4 Configure Magic Checkout in Razorpay Dashboard
    - [x] 16.4.1 Set up promotion API endpoint URL
    - [x] 16.4.2 Set up apply promotion API endpoint URL
    - [x] 16.4.3 Set up shipping info API endpoint URL
    - [x] 16.4.4 Configure webhook URLs
  - [x] 16.5 Test configuration in Razorpay test mode

### Phase 5: Analytics and Monitoring

- [x] 17. Add Analytics Tracking
  - [x] 17.1 Track Magic Checkout initialization events
  - [x] 17.2 Track saved address usage
  - [x] 17.3 Track saved payment method usage
  - [x] 17.4 Track promotion application events
  - [x] 17.5 Track Magic Checkout completion rate
  - [x] 17.6 Track fallback to standard checkout events
  - [x] 17.7 Integrate with existing Facebook Pixel tracking

- [x] 18. Add Backend Logging
  - [x] 18.1 Log Magic Checkout API calls
  - [x] 18.2 Log payment verification attempts
  - [x] 18.3 Log address quality calculations
  - [x] 18.4 Log promotion applications
  - [x] 18.5 Log errors and failures

### Phase 6: Documentation and Deployment

- [x] 19. Documentation
  - [x] 19.1 Document Magic Checkout API endpoints
  - [x] 19.2 Document environment variables
  - [x] 19.3 Document database schema changes
  - [x] 19.4 Create deployment guide
  - [x] 19.5 Create troubleshooting guide
  - [x] 19.6 Update README with Magic Checkout information

- [x] 20. Deployment Preparation
  - [x] 20.1 Review all code changes
  - [x] 20.2 Run all tests
  - [x] 20.3 Prepare rollback plan
  - [x] 20.4 Schedule deployment window
  - [x] 20.5 Notify stakeholders
  - [x] 20.6 Deploy to staging environment
  - [x] 20.7 Perform staging validation
  - [x] 20.8 Deploy to production
  - [x] 20.9 Monitor production deployment
  - [x] 20.10 Verify Magic Checkout functionality in production

## Notes

### Reusing Existing Routes
- All Magic Checkout endpoints will be added to the existing `Backend/routes/paymentRoutes.js`
- No new route files needed
- Maintains consistency with existing API structure

### Backward Compatibility
- Existing order creation flows remain unchanged
- Standard Razorpay checkout continues to work
- Magic Checkout is additive, not replacing existing functionality

### FShip Integration
- Existing FShip integration in orderController.js will work with Magic Checkout orders
- No changes needed to FShip service
- Address quality checks enhance FShip serviceability data

### Testing Strategy
- Test Magic Checkout in Razorpay test mode first
- Use test API keys for development
- Validate all flows before production deployment
- Maintain standard checkout as fallback during rollout

## Success Criteria

- [ ] Magic Checkout SDK loads successfully on checkout page
- [ ] Promotions are fetched and displayed correctly
- [ ] Promotion application calculates discounts accurately
- [ ] Shipping info shows correct serviceability and fees
- [ ] Address quality indicators display properly
- [ ] COD availability is determined correctly
- [ ] Payment processing works for both prepaid and COD
- [ ] Orders are created successfully with Magic Checkout
- [ ] FShip integration works with Magic Checkout orders
- [ ] Guest checkout works with Magic Checkout
- [ ] Authenticated checkout works with Magic Checkout
- [ ] Fallback to standard checkout works when needed
- [ ] All existing checkout flows continue to work
- [ ] Analytics tracking captures Magic Checkout events
