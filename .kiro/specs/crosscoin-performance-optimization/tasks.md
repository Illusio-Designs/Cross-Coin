# Implementation Plan: CrossCoin Performance Optimization

## Overview

This implementation plan breaks down the performance optimization into 6 phases spanning 8 days. The approach prioritizes critical database fixes and payment processing improvements first, followed by medium-priority optimizations, frontend enhancements, comprehensive testing, and deployment verification.

## Phase 1: Critical Backend Fixes (Days 1-2)

- [x] 1. Create database indexes for query optimization
  - [x] 1.1 Run setupDatabase.js script to create all indexes
    - File: `Backend/scripts/setupDatabase.js`
    - Command: `node Backend/scripts/setupDatabase.js`
    - Creates all 8 performance optimization indexes automatically
    - Validates: Property 1 (Database Index Correctness)
    - _Requirements: 1.1_
    - **Note:** The script now includes `createPerformanceIndexes()` function that creates:
      - idx_orders_user_date (orders table)
      - idx_order_items_product (order_items table)
      - idx_badges_user (badges table)
      - idx_transactions_order (transactions table)
      - idx_products_category (products table)
      - idx_variations_product (product_variations table)
      - idx_coupons_code_status (coupons table)
      - idx_stock_product_warehouse (stock table)

  - [ ]* 1.2 Write property test for index existence
    - **Property 1: Database Index Correctness**
    - **Validates: Requirements 1.1**
    - Test all 8 indexes exist with correct columns
    - File: `tests/database/indexes.test.js`

  - [x] 1.3 Verify all indexes are created
    - Run: `node Backend/scripts/setupDatabase.js`
    - Check output for "✓ Performance indexes: X created"
    - Verify no errors in index creation
    - _Requirements: 1.1_

- [-] 2. Implement batch fetching for order creation
  - [x] 2.1 Create batch fetch utility module
    - File: `src/utils/batch-fetch.js`
    - Implement `batchFetchProducts()` and `batchFetchVariations()` functions
    - Use IN clause to fetch multiple items in single query
    - _Requirements: 1.2_

  - [ ]* 2.2 Write property test for batch fetching
    - **Property 2: Batch Fetching Pattern**
    - **Validates: Requirements 1.2**
    - Verify query count is constant regardless of order count

  - [x] 2.3 Update order creation service to use batch fetching
    - File: `src/services/order-service.js`
    - Replace individual product lookups with batch fetch calls
    - Measure query reduction
    - _Requirements: 1.2_

- [ ] 3. Set up badge recalculation async job queue
  - [x] 3.1 Initialize Bull queue for badge recalculation
    - File: `src/queue/badge-queue.js`
    - Create queue with Redis connection
    - Configure retry policy (max 3 retries with exponential backoff)
    - _Requirements: 1.3_

  - [x] 3.2 Implement badge recalculation job processor
    - File: `src/queue/processors/badge-processor.js`
    - Fetch user transaction history
    - Calculate badge eligibility
    - Update badges table
    - Invalidate user dashboard cache
    - _Requirements: 1.3_

  - [ ]* 3.3 Write property test for async badge recalculation
    - **Property 3: Async Badge Recalculation**
    - **Validates: Requirements 1.3**
    - Verify operation returns immediately without blocking

  - [x] 3.4 Update badge trigger points to enqueue jobs
    - File: `src/services/badge-service.js`
    - Replace synchronous badge updates with queue enqueue calls
    - Ensure immediate return to caller
    - _Requirements: 1.3_

- [x] 4. Implement dashboard aggregation with caching
  - [x] 4.1 Create dashboard aggregation query
    - File: `src/services/dashboard-service.js`
    - Implement `aggregateDashboardData()` function
    - Combine user stats, recent orders, badges, recommendations
    - _Requirements: 1.4_

  - [x] 4.2 Integrate Redis caching for dashboard
    - File: `src/services/dashboard-service.js`
    - Add cache check before aggregation
    - Store result in Redis with 5-minute TTL
    - Invalidate on relevant user actions
    - _Requirements: 1.4_

  - [ ]* 4.3 Write property test for dashboard caching
    - **Property 4: Dashboard Aggregation Caching**
    - **Validates: Requirements 1.4**
    - Verify cache hit on subsequent requests within TTL

  - [x] 4.4 Update dashboard endpoint to use cached aggregation
    - File: `src/routes/dashboard-routes.js`
    - Replace individual queries with aggregation service call
    - Measure response time improvement
    - _Requirements: 1.4_

- [x] 5. Remove AI features and dependencies
  - [x] 5.1 Delete AI service files
    - Delete: `src/services/ai-service.js`
    - Delete: `src/routes/ai-routes.js`
    - Delete: `src/models/ai-model.js`
    - _Requirements: 1.5_

  - [x] 5.2 Remove AI imports from controllers
    - File: `src/controllers/product-controller.js`
    - File: `src/controllers/recommendation-controller.js`
    - Remove all `require('ai-service')` statements
    - _Requirements: 1.5_

  - [x] 5.3 Remove AI middleware from app initialization
    - File: `src/app.js`
    - Remove AI middleware registration
    - Remove AI route mounting
    - _Requirements: 1.5_

  - [x] 5.4 Remove AI dependencies from package.json
    - File: `package.json`
    - Remove AI-related npm packages
    - Run `npm install` to update lock file
    - _Requirements: 1.5_

- [x] 6. Checkpoint - Phase 1 Complete
  - Run setupDatabase.js and verify all 8 indexes created
  - Verify batch fetching reduces queries
  - Confirm badge queue is operational
  - Test dashboard caching works correctly
  - Verify AI code is completely removed
  - Ensure all tests pass, ask the user if questions arise.


## Phase 2: E-Commerce Payment Fixes (Days 2-3, parallel with Phase 1)

- [x] 7. Fix payment signature verification
  - [x] 7.1 Identify all webhook signature verification calls
    - File: `src/controllers/payment-controller.js`
    - Search for `validateWebhookSignature` calls
    - Document all locations
    - _Requirements: 3.1_

  - [x] 7.2 Add await to signature verification calls
    - File: `src/controllers/payment-controller.js`
    - Update all `validateWebhookSignature` calls to use await
    - Ensure proper async/await handling
    - _Requirements: 3.1_

  - [ ]* 7.3 Write property test for signature validation
    - **Property 9: Payment Signature Validation**
    - **Validates: Requirements 3.1**
    - Test valid signatures pass, invalid signatures fail

  - [x] 7.4 Test payment webhook processing
    - File: `tests/payment-webhook.test.js`
    - Create test webhook payloads
    - Verify signature validation works correctly
    - _Requirements: 3.1_

- [x] 8. Standardize amount unit handling
  - [x] 8.1 Create amount conversion utility
    - File: `src/utils/amount-converter.js`
    - Implement `toSmallestUnit(amount, currency)` function
    - Implement `fromSmallestUnit(amount, currency)` function
    - Handle rounding and precision correctly
    - _Requirements: 3.2_

  - [ ]* 8.2 Write property test for amount conversion
    - **Property 10: Amount Unit Conversion Round Trip**
    - **Validates: Requirements 3.2**
    - Verify round-trip conversion maintains precision

  - [x] 8.3 Update payment creation to use standardized amounts
    - File: `src/services/payment-service.js`
    - Replace all amount conversions with utility functions
    - Ensure consistency across payment flows
    - _Requirements: 3.2_

  - [x] 8.4 Update payment verification to use standardized amounts
    - File: `src/services/payment-service.js`
    - Update webhook amount validation
    - Ensure amounts match after conversion
    - _Requirements: 3.2_

- [x] 9. Centralize Razorpay instance
  - [x] 9.1 Create Razorpay service wrapper
    - File: `src/services/razorpay-service.js`
    - Initialize single Razorpay instance
    - Export methods for order creation, signature validation, refunds
    - _Requirements: 3.3_

  - [x] 9.2 Replace all Razorpay direct calls
    - File: `src/controllers/payment-controller.js`
    - File: `src/services/payment-service.js`
    - Replace direct Razorpay calls with service methods
    - _Requirements: 3.3_

  - [x] 9.3 Update environment configuration
    - File: `.env.example`
    - Document Razorpay credentials
    - Ensure service reads from environment
    - _Requirements: 3.3_

- [-] 10. Implement transaction rollback on failure
  - [x] 10.1 Create database transaction wrapper
    - File: `src/utils/transaction-wrapper.js`
    - Implement `startTransaction()` and `commit()`/`rollback()` methods
    - Handle connection pooling
    - _Requirements: 3.3_

  - [x] 10.2 Update order creation with transaction support
    - File: `src/services/order-service.js`
    - Wrap order creation in transaction
    - Create order record
    - Create payment record
    - Commit on success, rollback on failure
    - _Requirements: 3.3_

  - [ ]* 10.3 Write property test for transaction rollback
    - **Property 11: Transaction Rollback Completeness**
    - **Validates: Requirements 3.3**
    - Verify all changes rolled back on failure

  - [x] 10.4 Test rollback scenarios
    - File: `tests/transaction-rollback.test.js`
    - Test payment failure rollback
    - Test stock allocation rollback
    - Test coupon usage rollback
    - _Requirements: 3.3_

- [x] 11. Implement multi-brand context handling
  - [x] 11.1 Add brand context to payment flow
    - File: `src/middleware/brand-context.js`
    - Extract brand from request headers or session
    - Attach to request object
    - _Requirements: 3.4_

  - [x] 11.2 Update order creation to preserve brand context
    - File: `src/services/order-service.js`
    - Store brand_id in order record
    - Pass brand context through payment flow
    - _Requirements: 3.4_

  - [ ]* 11.3 Write property test for brand context preservation
    - **Property 12: Multi-Brand Context Preservation**
    - **Validates: Requirements 3.4**
    - Verify brand context consistent throughout flow

  - [x] 11.4 Update transaction record to include brand
    - File: `src/services/payment-service.js`
    - Store brand_id in transaction record
    - Validate brand consistency
    - _Requirements: 3.4_

- [x] 12. Add coupon payment mode filtering
  - [x] 12.1 Add payment_mode column to coupons table
    - File: `db/migrations/002_add_coupon_payment_mode.sql`
    - Add payment_mode column (nullable, supports multiple modes)
    - _Requirements: 3.5_

  - [x] 12.2 Create coupon filtering utility
    - File: `src/utils/coupon-filter.js`
    - Implement `filterCouponsByPaymentMode(coupons, paymentMode)` function
    - _Requirements: 3.5_

  - [ ]* 12.3 Write property test for coupon filtering
    - **Property 13: Coupon Payment Mode Filtering**
    - **Validates: Requirements 3.5**
    - Verify only applicable coupons returned

  - [x] 12.4 Update coupon validation in checkout
    - File: `src/services/checkout-service.js`
    - Apply payment mode filter before coupon validation
    - Ensure coupon is applicable to selected payment method
    - _Requirements: 3.5_

- [x] 13. Implement stock validation service
  - [x] 13.1 Create stock validation service
    - File: `src/services/stock-service.js`
    - Implement `validateStockAvailability(items)` function
    - Check warehouse inventory
    - Return availability status
    - _Requirements: 3.6_

  - [x] 13.2 Integrate stock validation into order creation
    - File: `src/services/order-service.js`
    - Call stock validation before creating order
    - Fail order creation if stock insufficient
    - _Requirements: 3.6_

  - [ ]* 13.3 Write property test for stock validation
    - **Property 14: Stock Validation Prevents Overselling**
    - **Validates: Requirements 3.6**
    - Verify insufficient stock prevents order creation

  - [x] 13.4 Implement stock allocation on order creation
    - File: `src/services/stock-service.js`
    - Implement `allocateStock(items)` function
    - Decrement warehouse inventory
    - Handle allocation failure and rollback
    - _Requirements: 3.6_

- [x] 14. Standardize error handling in checkout
  - [x] 14.1 Create error response formatter
    - File: `src/utils/error-formatter.js`
    - Implement consistent error response structure
    - Include error code, message, details, timestamp
    - _Requirements: 3.7_

  - [x] 14.2 Update checkout controller error handling
    - File: `src/controllers/checkout-controller.js`
    - Replace all error responses with formatter
    - Ensure consistent error codes
    - _Requirements: 3.7_

  - [x] 14.3 Update payment controller error handling
    - File: `src/controllers/payment-controller.js`
    - Replace all error responses with formatter
    - Log errors with context
    - _Requirements: 3.7_

  - [x] 14.4 Add error handling tests
    - File: `tests/error-handling.test.js`
    - Test various error scenarios
    - Verify error response format
    - _Requirements: 3.7_

- [x] 15. Checkpoint - Phase 2 Complete
  - Ensure payment signature verification works with await
  - Verify amount conversions maintain precision
  - Test Razorpay service centralization
  - Confirm transaction rollback on failures
  - Verify brand context preserved throughout flow
  - Test coupon filtering by payment mode
  - Ensure stock validation prevents overselling
  - Verify error responses are standardized
  - Ensure all tests pass, ask the user if questions arise.


## Phase 3: Medium Backend Optimizations (Days 4-5)

- [x] 16. Implement Redis caching service
  - [x] 16.1 Create Redis connection manager
    - File: `src/services/redis-service.js`
    - Initialize Redis client with connection pooling
    - Handle connection errors and reconnection
    - _Requirements: 2.1_

  - [x] 16.2 Create cache manager with TTL support
    - File: `src/services/cache-manager.js`
    - Implement `set(key, value, ttl)` method
    - Implement `get(key)` method with expiration check
    - Implement `invalidate(pattern)` method
    - _Requirements: 2.1_

  - [ ]* 16.3 Write property test for cache round trip
    - **Property 5: Redis Cache Round Trip**
    - **Validates: Requirements 2.1**
    - Verify stored data retrieved exactly

  - [ ]* 16.4 Write property test for cache invalidation
    - **Property 6: Cache Invalidation Removes Data**
    - **Validates: Requirements 2.2**
    - Verify invalidated keys return null

  - [x] 16.5 Integrate cache manager into services
    - File: `src/services/product-service.js`
    - File: `src/services/category-service.js`
    - Add caching for frequently accessed data
    - _Requirements: 2.1_

- [x] 17. Implement batch create operations
  - [x] 17.1 Create batch insert utility
    - File: `src/utils/batch-insert.js`
    - Implement `batchInsert(table, records, batchSize)` function
    - Use INSERT ... VALUES syntax for multiple rows
    - _Requirements: 2.3_

  - [x] 17.2 Update order item creation to use batch insert
    - File: `src/services/order-service.js`
    - Replace individual item inserts with batch insert
    - Measure query reduction
    - _Requirements: 2.3_

  - [ ]* 17.3 Write property test for batch operations
    - **Property 7: Batch Operations Reduce Queries**
    - **Validates: Requirements 2.3**
    - Verify 50%+ query reduction vs individual operations

  - [x] 17.4 Update badge creation to use batch insert
    - File: `src/services/badge-service.js`
    - Replace individual badge inserts with batch insert
    - _Requirements: 2.3_

- [x] 18. Add pagination to API endpoints
  - [x] 18.1 Create pagination utility
    - File: `src/utils/pagination.js`
    - Implement `paginate(query, page, limit)` function
    - Calculate offset and limit
    - Return paginated results with metadata
    - _Requirements: 2.4_

  - [ ]* 18.2 Write property test for pagination correctness
    - **Property 8: Pagination Correctness**
    - **Validates: Requirements 2.4**
    - Verify correct items returned with no gaps/duplicates

  - [x] 18.3 Add pagination to product list endpoint
    - File: `src/routes/product-routes.js`
    - Add page and limit query parameters
    - Apply pagination utility
    - Return pagination metadata
    - _Requirements: 2.4_

  - [x] 18.4 Add pagination to order history endpoint
    - File: `src/routes/order-routes.js`
    - Add page and limit query parameters
    - Apply pagination utility
    - _Requirements: 2.4_

  - [x] 18.5 Add pagination to transaction history endpoint
    - File: `src/routes/transaction-routes.js`
    - Add page and limit query parameters
    - Apply pagination utility
    - _Requirements: 2.4_

- [x] 19. Reduce production logging verbosity
  - [x] 19.1 Create logging configuration
    - File: `src/config/logging.js`
    - Set log level to 'warn' in production
    - Set log level to 'debug' in development
    - _Requirements: 2.5_

  - [x] 19.2 Remove debug logs from critical paths
    - File: `src/services/order-service.js`
    - File: `src/services/payment-service.js`
    - Remove console.log statements
    - Keep only error and warning logs
    - _Requirements: 2.5_

  - [x] 19.3 Update logger initialization
    - File: `src/app.js`
    - Initialize logger with environment-based config
    - Apply logging config to all services
    - _Requirements: 2.5_

  - [x] 19.4 Test logging in production mode
    - File: `tests/logging.test.js`
    - Verify debug logs not output in production
    - Verify error logs still output
    - _Requirements: 2.5_

- [x] 20. Checkpoint - Phase 3 Complete
  - Verify Redis connection and caching works
  - Test batch insert reduces queries
  - Confirm pagination works correctly
  - Verify logging is reduced in production
  - Ensure all tests pass, ask the user if questions arise.


## Phase 4: Frontend Optimizations (Days 5-6)

- [ ] 21. Update frontend cache TTLs
  - [ ] 21.1 Create frontend cache configuration
    - File: `src/frontend/config/cache-config.js`
    - Define TTL values: dashboard (5m), products (30m), cart (24h), profile (15m)
    - _Requirements: 4.1_

  - [ ] 21.2 Implement frontend cache manager
    - File: `src/frontend/services/cache-manager.js`
    - Implement `set(key, value, ttl)` method
    - Implement `get(key)` method with expiration check
    - Use localStorage or IndexedDB for persistence
    - _Requirements: 4.1_

  - [ ]* 21.3 Write property test for frontend cache TTL
    - **Property 15: Frontend Cache TTL Expiration**
    - **Validates: Requirements 4.1**
    - Verify cached items expire after TTL

  - [ ] 21.4 Update dashboard component to use cache
    - File: `src/frontend/components/Dashboard.jsx`
    - Check cache before API call
    - Store response in cache with 5m TTL
    - _Requirements: 4.1_

  - [ ] 21.5 Update product list component to use cache
    - File: `src/frontend/components/ProductList.jsx`
    - Check cache before API call
    - Store response in cache with 30m TTL
    - _Requirements: 4.1_

- [ ] 22. Reduce API timeout configuration
  - [ ] 22.1 Update API client timeout settings
    - File: `src/frontend/services/api-client.js`
    - Reduce timeout from 30s to 15s for most endpoints
    - Keep 30s for long-running operations (checkout)
    - _Requirements: 4.2_

  - [ ] 22.2 Add timeout error handling
    - File: `src/frontend/services/api-client.js`
    - Implement retry logic for timeout errors
    - Show user-friendly timeout messages
    - _Requirements: 4.2_

  - [ ]* 22.3 Write property test for API timeout reliability
    - **Property 16: API Timeout Reliability**
    - **Validates: Requirements 4.2**
    - Verify legitimate requests complete without timeout

  - [ ] 22.4 Test timeout behavior
    - File: `tests/frontend/api-timeout.test.js`
    - Test timeout error handling
    - Test retry logic
    - _Requirements: 4.2_

- [ ] 23. Remove AI endpoint calls from frontend
  - [ ] 23.1 Identify all AI endpoint calls
    - File: `src/frontend/services/api-client.js`
    - Search for AI-related API calls
    - Document all locations
    - _Requirements: 4.3_

  - [ ] 23.2 Remove AI recommendation component
    - Delete: `src/frontend/components/AIRecommendations.jsx`
    - Remove from dashboard
    - _Requirements: 4.3_

  - [ ] 23.3 Remove AI API calls from services
    - File: `src/frontend/services/recommendation-service.js`
    - Remove all AI endpoint calls
    - Replace with static recommendations if needed
    - _Requirements: 4.3_

  - [ ] 23.4 Update imports and references
    - File: `src/frontend/components/Dashboard.jsx`
    - Remove AI component imports
    - Remove AI service calls
    - _Requirements: 4.3_

- [ ] 24. Implement dashboard skeleton loading
  - [ ] 24.1 Create dashboard skeleton component
    - File: `src/frontend/components/DashboardSkeleton.jsx`
    - Create placeholder UI matching dashboard layout
    - Use CSS animations for loading effect
    - _Requirements: 4.4_

  - [ ] 24.2 Update dashboard component with skeleton
    - File: `src/frontend/components/Dashboard.jsx`
    - Show skeleton while loading
    - Replace with actual content when loaded
    - _Requirements: 4.4_

  - [ ] 24.3 Create product list skeleton component
    - File: `src/frontend/components/ProductListSkeleton.jsx`
    - Create placeholder UI for product grid
    - _Requirements: 4.4_

  - [ ] 24.4 Update product list component with skeleton
    - File: `src/frontend/components/ProductList.jsx`
    - Show skeleton while loading
    - Replace with actual content when loaded
    - _Requirements: 4.4_

- [ ] 25. Add performance monitoring to frontend
  - [ ] 25.1 Create performance monitoring service
    - File: `src/frontend/services/performance-monitor.js`
    - Implement `trackMetric(endpoint, responseTime, cacheHit)` function
    - Send metrics to analytics backend
    - _Requirements: 4.5_

  - [ ]* 25.2 Write property test for performance metrics accuracy
    - **Property 17: Performance Metrics Accuracy**
    - **Validates: Requirements 4.5**
    - Verify metrics within 10% of actual time

  - [ ] 25.3 Integrate performance monitoring into API client
    - File: `src/frontend/services/api-client.js`
    - Track response time for each request
    - Track cache hit/miss
    - Send metrics to monitoring service
    - _Requirements: 4.5_

  - [ ] 25.4 Create performance dashboard
    - File: `src/frontend/components/PerformanceDashboard.jsx`
    - Display API response times
    - Display cache hit rates
    - Display performance trends
    - _Requirements: 4.5_

- [ ] 26. Checkpoint - Phase 4 Complete
  - Verify frontend cache TTLs are working
  - Test API timeout configuration
  - Confirm AI endpoints removed from frontend
  - Verify dashboard skeleton displays correctly
  - Test performance monitoring is collecting data
  - Ensure all tests pass, ask the user if questions arise.


## Phase 5: Testing & Verification (Days 6-7)

- [ ] 27. Unit tests for database layer
  - [ ] 27.1 Test database index creation
    - File: `tests/database/indexes.test.js`
    - Verify all 8 indexes exist
    - Verify index columns are correct
    - Verify indexes are queryable
    - _Requirements: 1.1_

  - [ ] 27.2 Test batch fetch utility
    - File: `tests/database/batch-fetch.test.js`
    - Test fetching multiple products
    - Test fetching multiple variations
    - Verify query count is reduced
    - _Requirements: 1.2_

  - [ ] 27.3 Test batch insert utility
    - File: `tests/database/batch-insert.test.js`
    - Test inserting multiple records
    - Test transaction handling
    - Verify query count is reduced
    - _Requirements: 2.3_

  - [ ] 27.4 Test pagination utility
    - File: `tests/database/pagination.test.js`
    - Test various page/limit combinations
    - Verify correct items returned
    - Verify no gaps or duplicates
    - _Requirements: 2.4_

- [ ] 28. Unit tests for cache layer
  - [ ] 28.1 Test Redis connection
    - File: `tests/cache/redis-connection.test.js`
    - Test connection establishment
    - Test connection error handling
    - Test reconnection logic
    - _Requirements: 2.1_

  - [ ] 28.2 Test cache manager operations
    - File: `tests/cache/cache-manager.test.js`
    - Test set/get operations
    - Test TTL expiration
    - Test cache invalidation
    - _Requirements: 2.1, 2.2_

  - [ ] 28.3 Test cache with various data types
    - File: `tests/cache/cache-data-types.test.js`
    - Test caching strings, objects, arrays
    - Test serialization/deserialization
    - _Requirements: 2.1_

  - [ ] 28.4 Test concurrent cache access
    - File: `tests/cache/cache-concurrency.test.js`
    - Test multiple simultaneous reads
    - Test multiple simultaneous writes
    - Verify data consistency
    - _Requirements: 2.1_

- [ ] 29. Unit tests for payment layer
  - [ ] 29.1 Test signature verification
    - File: `tests/payment/signature-verification.test.js`
    - Test valid signature acceptance
    - Test invalid signature rejection
    - Test missing signature handling
    - _Requirements: 3.1_

  - [ ] 29.2 Test amount conversion
    - File: `tests/payment/amount-conversion.test.js`
    - Test conversion to smallest unit
    - Test conversion from smallest unit
    - Test rounding and precision
    - Test edge cases (0, very large amounts)
    - _Requirements: 3.2_

  - [ ] 29.3 Test Razorpay service
    - File: `tests/payment/razorpay-service.test.js`
    - Test order creation
    - Test signature validation
    - Test error handling
    - _Requirements: 3.3_

  - [ ] 29.4 Test transaction rollback
    - File: `tests/payment/transaction-rollback.test.js`
    - Test rollback on payment failure
    - Test rollback on stock failure
    - Test rollback on coupon failure
    - Verify all changes reversed
    - _Requirements: 3.3_

  - [ ] 29.5 Test multi-brand context
    - File: `tests/payment/multi-brand-context.test.js`
    - Test brand context extraction
    - Test brand context preservation
    - Test brand isolation
    - _Requirements: 3.4_

  - [ ] 29.6 Test coupon filtering
    - File: `tests/payment/coupon-filtering.test.js`
    - Test filtering by payment mode
    - Test multiple payment modes
    - Test no applicable coupons
    - _Requirements: 3.5_

  - [ ] 29.7 Test stock validation
    - File: `tests/payment/stock-validation.test.js`
    - Test sufficient stock
    - Test insufficient stock
    - Test stock allocation
    - Test stock deallocation on rollback
    - _Requirements: 3.6_

- [ ] 30. Property-based tests for all properties
  - [ ] 30.1 Run all property tests with 100+ iterations
    - File: `tests/properties/all-properties.test.js`
    - Property 1: Database Index Correctness
    - Property 2: Batch Fetching Pattern
    - Property 3: Async Badge Recalculation
    - Property 4: Dashboard Aggregation Caching
    - Property 5: Redis Cache Round Trip
    - Property 6: Cache Invalidation Removes Data
    - Property 7: Batch Operations Reduce Queries
    - Property 8: Pagination Correctness
    - Property 9: Payment Signature Validation
    - Property 10: Amount Unit Conversion Round Trip
    - Property 11: Transaction Rollback Completeness
    - Property 12: Multi-Brand Context Preservation
    - Property 13: Coupon Payment Mode Filtering
    - Property 14: Stock Validation Prevents Overselling
    - Property 15: Frontend Cache TTL Expiration
    - Property 16: API Timeout Reliability
    - Property 17: Performance Metrics Accuracy
    - _Requirements: All_

- [ ] 31. Performance load tests
  - [ ] 31.1 Test dashboard load time
    - File: `tests/performance/dashboard-load.test.js`
    - Measure dashboard response time
    - Verify <300ms target
    - Test with cache hits and misses
    - _Requirements: 1.4_

  - [ ] 31.2 Test product list load time
    - File: `tests/performance/product-list-load.test.js`
    - Measure product list response time
    - Verify <500ms target
    - Test with pagination
    - _Requirements: 2.4_

  - [ ] 31.3 Test cart operations performance
    - File: `tests/performance/cart-operations.test.js`
    - Measure cart update response time
    - Verify <200ms target
    - Test with multiple items
    - _Requirements: 4.1_

  - [ ] 31.4 Test order creation performance
    - File: `tests/performance/order-creation.test.js`
    - Measure order creation response time
    - Verify <2s target
    - Test with batch operations
    - _Requirements: 1.2, 2.3_

  - [ ] 31.5 Test concurrent request handling
    - File: `tests/performance/concurrent-requests.test.js`
    - Simulate 100 concurrent requests
    - Verify system stability
    - Measure response times under load
    - _Requirements: All_

- [ ] 32. Integration tests
  - [ ] 32.1 Test order creation flow
    - File: `tests/integration/order-creation-flow.test.js`
    - Create order with batch fetching
    - Validate stock
    - Process payment
    - Verify transaction record created
    - Verify cache invalidated
    - _Requirements: 1.2, 3.3, 3.6_

  - [ ] 32.2 Test badge recalculation flow
    - File: `tests/integration/badge-recalculation-flow.test.js`
    - Trigger badge recalculation
    - Verify job enqueued
    - Verify job processed
    - Verify badges updated
    - Verify cache invalidated
    - _Requirements: 1.3_

  - [ ] 32.3 Test payment webhook flow
    - File: `tests/integration/payment-webhook-flow.test.js`
    - Receive payment webhook
    - Verify signature
    - Update transaction status
    - Verify order status updated
    - _Requirements: 3.1, 3.2_

  - [ ] 32.4 Test multi-brand checkout flow
    - File: `tests/integration/multi-brand-checkout.test.js`
    - Create order for brand A
    - Create order for brand B
    - Verify brand isolation
    - Verify transactions associated correctly
    - _Requirements: 3.4_

- [ ] 33. End-to-end testing
  - [ ] 33.1 Test complete user journey
    - File: `tests/e2e/user-journey.test.js`
    - User views dashboard
    - User browses products
    - User adds to cart
    - User proceeds to checkout
    - User completes payment
    - User views order confirmation
    - Verify all performance targets met
    - _Requirements: All_

  - [ ] 33.2 Test error scenarios
    - File: `tests/e2e/error-scenarios.test.js`
    - Test payment failure recovery
    - Test stock unavailability handling
    - Test invalid coupon handling
    - Test network timeout handling
    - _Requirements: 3.7, 4.2_

- [ ] 34. Checkpoint - Phase 5 Complete
  - Verify all unit tests pass
  - Verify all property tests pass with 100+ iterations
  - Verify all performance targets met
  - Verify all integration tests pass
  - Verify end-to-end tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 6: Deployment & Monitoring (Days 7-8)

- [ ] 35. Pre-deployment verification
  - [ ] 35.1 Verify all code changes are committed
    - Ensure no uncommitted changes
    - Verify all branches merged to main
    - _Requirements: All_

  - [ ] 35.2 Run full test suite
    - File: `tests/full-suite.test.js`
    - Run all unit tests
    - Run all property tests
    - Run all integration tests
    - Verify 100% pass rate
    - _Requirements: All_

  - [ ] 35.3 Verify performance targets
    - File: `tests/performance/verify-targets.test.js`
    - Dashboard: <300ms
    - Product list: <500ms
    - Cart operations: <200ms
    - Order creation: <2s
    - Memory usage: <500MB
    - Cache hit rate: >70%
    - _Requirements: All_

  - [ ] 35.4 Verify database migrations
    - File: `db/migrations/verify-migrations.sql`
    - Verify all 8 indexes created
    - Verify no migration errors
    - Verify data integrity
    - _Requirements: 1.1_

  - [ ] 35.5 Verify environment configuration
    - File: `.env.staging`
    - Verify Redis connection settings
    - Verify Razorpay credentials
    - Verify logging configuration
    - _Requirements: All_

  - [ ] 35.6 Create deployment checklist
    - File: `DEPLOYMENT_CHECKLIST.md`
    - Document all pre-deployment steps
    - Document rollback procedures
    - Document monitoring setup
    - _Requirements: All_

- [ ] 36. Deploy to staging environment
  - [ ] 36.1 Deploy backend services
    - Deploy to staging server
    - Verify services start correctly
    - Verify database migrations applied
    - _Requirements: All_

  - [ ] 36.2 Deploy frontend application
    - Build frontend bundle
    - Deploy to staging CDN
    - Verify assets load correctly
    - _Requirements: All_

  - [ ] 36.3 Run smoke tests on staging
    - File: `tests/smoke/staging-smoke-tests.test.js`
    - Test dashboard loads
    - Test product list loads
    - Test checkout flow
    - Test payment processing
    - _Requirements: All_

  - [ ] 36.4 Verify performance on staging
    - File: `tests/performance/staging-performance.test.js`
    - Measure dashboard load time
    - Measure product list load time
    - Measure order creation time
    - Verify targets met
    - _Requirements: All_

  - [ ] 36.5 Monitor staging for 24 hours
    - Monitor error rates
    - Monitor response times
    - Monitor resource usage
    - Verify stability
    - _Requirements: All_

- [ ] 37. Deploy to production environment
  - [ ] 37.1 Create production deployment plan
    - File: `PRODUCTION_DEPLOYMENT_PLAN.md`
    - Document deployment steps
    - Document rollback procedures
    - Document communication plan
    - _Requirements: All_

  - [ ] 37.2 Deploy backend services to production
    - Deploy to production servers
    - Verify services start correctly
    - Verify database migrations applied
    - Monitor for errors
    - _Requirements: All_

  - [ ] 37.3 Deploy frontend to production
    - Build production bundle
    - Deploy to production CDN
    - Verify assets load correctly
    - Verify cache headers set correctly
    - _Requirements: All_

  - [ ] 37.4 Run production smoke tests
    - File: `tests/smoke/production-smoke-tests.test.js`
    - Test dashboard loads
    - Test product list loads
    - Test checkout flow
    - Test payment processing
    - _Requirements: All_

  - [ ] 37.5 Verify production performance
    - File: `tests/performance/production-performance.test.js`
    - Measure dashboard load time
    - Measure product list load time
    - Measure order creation time
    - Verify targets met
    - _Requirements: All_

- [ ] 38. Monitor performance metrics
  - [ ] 38.1 Set up performance monitoring dashboard
    - File: `monitoring/performance-dashboard.js`
    - Display API response times
    - Display cache hit rates
    - Display error rates
    - Display resource usage
    - _Requirements: 4.5_

  - [ ] 38.2 Configure alerting for performance degradation
    - File: `monitoring/alerts.js`
    - Alert if dashboard load time >300ms
    - Alert if product list load time >500ms
    - Alert if error rate >1%
    - Alert if cache hit rate <70%
    - _Requirements: 4.5_

  - [ ] 38.3 Set up log aggregation
    - File: `monitoring/log-aggregation.js`
    - Aggregate logs from all services
    - Filter by severity level
    - Enable searching and filtering
    - _Requirements: 2.5_

  - [ ] 38.4 Create performance report
    - File: `reports/performance-report.md`
    - Document baseline metrics
    - Document improvements achieved
    - Document remaining optimization opportunities
    - _Requirements: All_

  - [ ] 38.5 Monitor for 7 days post-deployment
    - Track all performance metrics
    - Monitor error rates
    - Monitor user feedback
    - Document any issues
    - _Requirements: All_

- [ ] 39. Final checkpoint - Deployment Complete
  - Verify all services running in production
  - Verify all performance targets met
  - Verify no critical errors in logs
  - Verify monitoring and alerting working
  - Verify user experience improved
  - Ensure all tests pass, ask the user if questions arise.

## Summary

This implementation plan covers 39 tasks organized into 6 phases:

- **Phase 1 (Days 1-2)**: Critical backend fixes including database indexes, batch fetching, async badge recalculation, dashboard caching, and AI feature removal
- **Phase 2 (Days 2-3)**: E-commerce payment fixes including signature verification, amount standardization, transaction rollback, and stock validation
- **Phase 3 (Days 4-5)**: Medium backend optimizations including Redis caching, batch operations, pagination, and logging reduction
- **Phase 4 (Days 5-6)**: Frontend optimizations including cache TTLs, API timeouts, AI endpoint removal, and performance monitoring
- **Phase 5 (Days 6-7)**: Comprehensive testing including unit tests, property tests, performance tests, integration tests, and end-to-end tests
- **Phase 6 (Days 7-8)**: Deployment and monitoring including pre-deployment verification, staging deployment, production deployment, and performance monitoring

**Key Features**:
- All 17 correctness properties from the design document are tested
- Property-based tests included as optional sub-tasks (marked with *)
- Performance targets verified at each checkpoint
- Comprehensive error handling and rollback procedures
- Multi-brand context preservation throughout payment flow
- Redis caching with TTL-based invalidation
- Batch operations for query optimization
- Frontend performance monitoring and optimization

**Success Criteria**:
- Dashboard load time: <300ms (75% improvement)
- Product list load time: <500ms (37% improvement)
- Cart operations: <200ms (50% improvement)
- Order creation: <2s (50% improvement)
- Cache hit rate: >70% (133% improvement)
- All property tests pass with 100+ iterations
- Zero payment processing failures
- 100% transaction rollback success on failures

