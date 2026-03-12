# CrossCoin Performance Optimization - Requirements Document

## Introduction

This document defines requirements for a comprehensive performance optimization initiative across the CrossCoin backend and frontend systems. The optimization targets a 5-10x overall performance improvement through database indexing, query optimization, caching strategies, and removal of unused AI features. Additionally, critical e-commerce audit findings must be addressed to ensure payment processing reliability and data consistency.

The scope includes Backend Phase 1 (critical fixes) and Phase 2 (medium-impact optimizations), Crosscoin frontend cache and timeout optimizations, and resolution of 3 critical e-commerce issues that impact payment processing and financial accuracy.

---

## Glossary

- **System**: The CrossCoin backend API and Crosscoin frontend application
- **Backend**: Node.js/Express API server handling orders, products, payments, and business logic
- **Crosscoin**: Next.js frontend application for customer-facing e-commerce experience
- **Dashboard**: Admin dashboard displaying order statistics and business metrics
- **Cache**: In-memory data storage (Redis) for frequently accessed data
- **TTL**: Time-To-Live; duration before cached data expires
- **N+1 Query**: Performance anti-pattern where one query triggers multiple additional queries in a loop
- **Batch Fetching**: Retrieving multiple records in a single database query instead of individual queries
- **Aggregation Query**: Database-level computation of statistics (COUNT, SUM) instead of application-level processing
- **Background Job**: Asynchronous task execution outside the request-response cycle
- **Payment Verification**: Cryptographic validation of Razorpay payment signatures
- **Amount Unit**: Standardized representation of currency (paise for internal calculations, rupees for display)
- **Multi-brand Support**: System capability to handle multiple independent brand configurations
- **Coupon Usage Tracking**: Recording and enforcing coupon redemption limits
- **Stock Validation**: Verification that ordered items are available before order creation
- **Response Time**: Duration from request initiation to response completion
- **Memory Usage**: RAM consumed by application processes
- **Cache Hit Rate**: Percentage of requests served from cache vs. database
- **API Timeout**: Maximum duration allowed for API request completion

---

## Requirements

### Requirement 1: Database Query Performance

**User Story:** As a system administrator, I want database queries to execute efficiently, so that the system can handle increased traffic without performance degradation.

#### Acceptance Criteria

1. WHEN the system executes queries on order_items, product_variations, or reviews tables, THE System SHALL use indexed columns to prevent full table scans
2. WHEN filtering orders by status, payment_status, brand_id, or createdAt, THE System SHALL use database indexes to reduce query time by 50-70%
3. WHEN joining tables via foreign keys, THE System SHALL have indexes on all foreign key columns (order_id, productId, session_id, cart_id)
4. THE System SHALL create the following indexes: idx_order_id on order_items, idx_productId on product_variations and reviews, idx_status and idx_payment_status on orders, idx_brand_id on orders, idx_createdAt on orders, idx_session_id on utm_tracking, idx_cart_id on cart_items
5. WHEN a database index is added, THE System SHALL verify the index is used by the query optimizer through EXPLAIN analysis

---

### Requirement 2: Order Creation Performance

**User Story:** As a customer, I want order creation to complete quickly, so that I can proceed through checkout without delays.

#### Acceptance Criteria

1. WHEN creating an order with multiple items, THE System SHALL fetch all required products and variations in a single batch query instead of individual queries per item
2. WHEN processing order items, THE System SHALL reduce order creation time from 5-10 seconds to under 2 seconds
3. WHEN validating order items, THE System SHALL use a Map-based lookup for product data instead of looping with individual database queries
4. WHEN an order is created, THE System SHALL complete the operation within 2000 milliseconds
5. THE System SHALL NOT perform N+1 queries during order item validation or processing

---

### Requirement 3: Badge Recalculation Non-blocking

**User Story:** As a system, I want badge recalculation to not block order responses, so that customers receive immediate confirmation of their orders.

#### Acceptance Criteria

1. WHEN an order is created, THE System SHALL queue badge recalculation as a background job instead of processing synchronously
2. WHEN badge recalculation is queued, THE System SHALL return the order response to the customer immediately without waiting for badge updates
3. WHEN a background job processes badge updates, THE System SHALL reduce order response time by 30-50%
4. WHEN badge recalculation fails, THE System SHALL log the error and retry without affecting the original order

---

### Requirement 4: Dashboard Statistics Performance

**User Story:** As an admin, I want the dashboard to load quickly with current statistics, so that I can monitor business metrics efficiently.

#### Acceptance Criteria

1. WHEN the dashboard loads statistics, THE System SHALL use database aggregation queries (COUNT, SUM) instead of loading all orders into memory
2. WHEN calculating dashboard stats, THE System SHALL reduce load time from 2-5 seconds to under 300 milliseconds
3. WHEN dashboard statistics are requested, THE System SHALL cache results with a TTL of 1 hour to prevent repeated aggregation queries
4. WHEN dashboard stats are cached, THE System SHALL reduce memory usage by 90% compared to loading all orders into application memory
5. WHEN a new order is created, THE System SHALL invalidate the dashboard stats cache to ensure fresh data on next request

---

### Requirement 5: AI Feature Removal

**User Story:** As a system maintainer, I want to remove unused AI image generation features, so that the system is simpler and uses fewer resources.

#### Acceptance Criteria

1. THE System SHALL delete the following files: aiImageController.js, aiImageRoutes.js, googleAIService.js, imageGenerationService.js, promptGenerator.js, googleAI.js config file
2. WHEN the system starts, THE System SHALL not import or initialize any AI image generation services
3. WHEN the system starts, THE System SHALL not require Google AI API credentials
4. WHEN AI features are removed, THE System SHALL reduce memory footprint by approximately 20MB
5. WHEN AI features are removed, THE System SHALL reduce startup time by eliminating external AI service initialization

---

### Requirement 6: Query Result Caching

**User Story:** As a system, I want to cache frequently accessed data, so that repeated queries don't hit the database.

#### Acceptance Criteria

1. WHEN dashboard statistics are requested, THE System SHALL cache results in Redis with appropriate TTL
2. WHEN product lists are requested, THE System SHALL cache results to reduce database load
3. WHEN category data is requested, THE System SHALL cache results to reduce repeated queries
4. WHEN cached data is used, THE System SHALL reduce database queries by 80-95% for repeated requests
5. WHEN data is modified (order created, product updated), THE System SHALL invalidate relevant cache entries

---

### Requirement 7: Batch Database Operations

**User Story:** As a system, I want bulk operations to execute efficiently, so that batch processing completes quickly.

#### Acceptance Criteria

1. WHEN creating multiple product-brand associations, THE System SHALL use bulkCreate instead of looping with individual creates
2. WHEN performing batch operations, THE System SHALL reduce execution time by 5-10x compared to individual operations
3. WHEN bulk operations are used, THE System SHALL reduce database round-trips and network overhead

---

### Requirement 8: API Pagination

**User Story:** As a system, I want list endpoints to support pagination, so that large datasets don't consume excessive memory.

#### Acceptance Criteria

1. WHEN requesting product lists, THE System SHALL support page and limit query parameters
2. WHEN pagination is used, THE System SHALL return only the requested page of results instead of all records
3. WHEN a list endpoint is called without pagination, THE System SHALL apply a default limit of 20 items
4. WHEN pagination is implemented, THE System SHALL prevent memory overload from loading large datasets
5. WHEN paginated results are returned, THE System SHALL include pagination metadata (total count, current page, total pages)

---

### Requirement 9: Production Logging Optimization

**User Story:** As a system, I want to reduce logging overhead in production, so that I/O performance improves.

#### Acceptance Criteria

1. WHEN the system runs in production, THE System SHALL disable verbose query logging
2. WHEN the system runs in production, THE System SHALL use minimal HTTP request logging instead of comprehensive logging
3. WHEN logging is reduced, THE System SHALL decrease I/O overhead by 10-20%
4. WHEN errors occur, THE System SHALL still log errors for debugging purposes

---

### Requirement 10: Crosscoin Cache TTL Optimization

**User Story:** As a frontend system, I want to increase cache durations for stable data, so that API calls are reduced.

#### Acceptance Criteria

1. WHEN category data is cached, THE System SHALL use a TTL of 30 minutes (increased from 10 minutes)
2. WHEN product data is cached, THE System SHALL use a TTL of 20 minutes (increased from 10 minutes)
3. WHEN slider data is cached, THE System SHALL use a TTL of 30 minutes (increased from 10 minutes)
4. WHEN coupon data is cached, THE System SHALL use a TTL of 15 minutes (increased from 5 minutes)
5. WHEN address data is cached, THE System SHALL use a TTL of 10 minutes (increased from 5 minutes)
6. WHEN SEO data is cached, THE System SHALL use a TTL of 1 hour (increased from 30 minutes)
7. WHEN cache TTLs are increased, THE System SHALL reduce API calls by 40-60%

---

### Requirement 11: API Request Timeout Optimization

**User Story:** As a frontend system, I want to reduce API timeouts for faster failure detection, so that users don't wait unnecessarily.

#### Acceptance Criteria

1. WHEN order creation requests are made, THE System SHALL use a timeout of 15 seconds (reduced from 30 seconds)
2. WHEN the backend completes order creation in under 2 seconds, THE System SHALL return the response before timeout
3. WHEN a timeout occurs, THE System SHALL display an error message to the user
4. WHEN timeout is reduced, THE System SHALL improve perceived performance for failed requests

---

### Requirement 12: Crosscoin AI Endpoint Removal

**User Story:** As a frontend system, I want to remove AI image generation endpoints, so that the system is simpler.

#### Acceptance Criteria

1. WHEN the frontend initializes, THE System SHALL not call any AI image generation endpoints
2. WHEN the frontend loads, THE System SHALL not import any AI image generation functions
3. WHEN AI endpoints are removed, THE System SHALL reduce API call overhead

---

### Requirement 13: Dashboard Loading State Optimization

**User Story:** As a user, I want the dashboard skeleton to display briefly, so that the actual content loads quickly.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE System SHALL display a skeleton/loading state for a minimum of 300 milliseconds (reduced from 1000 milliseconds)
2. WHEN dashboard stats load in under 300 milliseconds, THE System SHALL display actual content instead of skeleton
3. WHEN the skeleton display time is reduced, THE System SHALL improve perceived performance

---

### Requirement 14: Performance Monitoring

**User Story:** As a system, I want to track API performance metrics, so that I can identify performance regressions.

#### Acceptance Criteria

1. WHEN API requests complete, THE System SHALL record the response time
2. WHEN performance data is collected, THE System SHALL send metrics to analytics/monitoring service
3. WHEN performance monitoring is enabled, THE System SHALL track endpoint-specific response times
4. WHEN performance data is available, THE System SHALL enable identification of slow endpoints

---

### Requirement 15: Payment Signature Verification

**User Story:** As a payment system, I want to verify payment signatures correctly, so that only legitimate payments are processed.

#### Acceptance Criteria

1. WHEN a payment callback is received, THE System SHALL await the async payment signature verification function
2. WHEN payment signature verification completes, THE System SHALL validate the signature cryptographically
3. IF the signature is invalid, THEN THE System SHALL reject the payment and log the verification failure
4. WHEN signature verification is fixed, THE System SHALL enable prepaid order processing

---

### Requirement 16: Amount Unit Standardization

**User Story:** As a payment system, I want to standardize amount representations, so that payment amounts are always accurate.

#### Acceptance Criteria

1. WHEN amounts are stored internally, THE System SHALL use paise (smallest currency unit) for all calculations
2. WHEN amounts are displayed to users, THE System SHALL convert paise to rupees
3. WHEN amounts are sent to payment gateways, THE System SHALL use the correct unit expected by the gateway
4. WHEN amount conversions occur, THE System SHALL use a centralized utility function to prevent inconsistencies
5. WHEN an amount is converted, THE System SHALL maintain precision without rounding errors

---

### Requirement 17: Razorpay Instance Centralization

**User Story:** As a system, I want to centralize Razorpay instance creation, so that configuration is consistent across the application.

#### Acceptance Criteria

1. WHEN Razorpay instance is needed, THE System SHALL use a centralized helper function instead of duplicating instance creation code
2. WHEN Razorpay credentials are missing, THE System SHALL return a descriptive error from the centralized helper
3. WHEN the centralized helper is used, THE System SHALL ensure both payment and magic checkout controllers use identical Razorpay configuration

---

### Requirement 18: Transaction Rollback on Payment Failure

**User Story:** As a payment system, I want to rollback transactions when payment verification fails, so that orders are not created for failed payments.

#### Acceptance Criteria

1. WHEN payment signature verification fails, THE System SHALL rollback any order creation that occurred
2. WHEN payment amount doesn't match, THE System SHALL rollback the order and log the discrepancy
3. WHEN payment verification fails, THE System SHALL return an error response without creating an order
4. WHEN a transaction is rolled back, THE System SHALL ensure no partial orders exist in the database

---

### Requirement 19: Multi-brand Magic Checkout Support

**User Story:** As a multi-brand system, I want Magic Checkout to work with different brand configurations, so that each brand can process payments independently.

#### Acceptance Criteria

1. WHEN a Magic Checkout request is received, THE System SHALL extract the brand ID from the request context
2. WHEN brand ID is extracted, THE System SHALL use the correct Razorpay credentials for that brand
3. WHEN Magic Checkout processes a payment, THE System SHALL apply the correct brand's configuration
4. WHEN multiple brands use Magic Checkout, THE System SHALL ensure payment credentials don't cross between brands

---

### Requirement 20: Coupon Payment Mode Filtering

**User Story:** As a coupon system, I want to filter coupons by payment method, so that only applicable coupons are offered.

#### Acceptance Criteria

1. WHEN coupons are retrieved for checkout, THE System SHALL filter by the selected payment method (COD, prepaid, etc.)
2. WHEN a coupon is restricted to specific payment methods, THE System SHALL exclude it from other payment methods
3. WHEN coupons are filtered, THE System SHALL prevent validation errors from inapplicable coupons

---

### Requirement 21: Stock Validation Before Order Creation

**User Story:** As an order system, I want to validate stock availability before creating orders, so that overselling is prevented.

#### Acceptance Criteria

1. WHEN an order is about to be created, THE System SHALL validate that all items are in stock
2. WHEN an item is out of stock, THE System SHALL reject the order and inform the user
3. WHEN stock is partially available, THE System SHALL inform the user of available quantity
4. WHEN stock validation occurs, THE System SHALL prevent orders for unavailable items

---

### Requirement 22: Guest Checkout Validation

**User Story:** As a checkout system, I want to validate guest checkout data thoroughly, so that invalid orders are not created.

#### Acceptance Criteria

1. WHEN a guest checkout is submitted, THE System SHALL validate email format
2. WHEN a guest checkout is submitted, THE System SHALL validate phone number format
3. WHEN a guest checkout is submitted, THE System SHALL validate postal code format
4. WHEN validation fails, THE System SHALL return specific error messages for each invalid field
5. WHEN guest data is invalid, THE System SHALL prevent order creation

---

### Requirement 23: Checkout Error Handling

**User Story:** As a checkout system, I want comprehensive error handling, so that users see helpful messages instead of blank screens.

#### Acceptance Criteria

1. WHEN checkout data loading fails, THE System SHALL catch the error and display a user-friendly message
2. WHEN order placement fails, THE System SHALL catch the error and display the reason
3. WHEN address saving fails, THE System SHALL catch the error and allow retry
4. WHEN any checkout operation fails, THE System SHALL log the error for debugging
5. WHEN errors occur, THE System SHALL prevent the user from being stuck in a broken state

---

### Requirement 24: Coupon Usage Tracking

**User Story:** As a coupon system, I want to track coupon usage after payment, so that usage limits are enforced.

#### Acceptance Criteria

1. WHEN a payment is verified successfully, THE System SHALL check if the order used a coupon
2. WHEN a coupon was used, THE System SHALL increment the coupon usage count
3. WHEN coupon usage is incremented, THE System SHALL create a CouponUsage record linking the coupon to the order
4. WHEN coupon usage limits are reached, THE System SHALL prevent further redemptions

---

## Performance Targets

### API Response Times
- Dashboard statistics: < 300ms (baseline: 2-5s)
- Product list: < 500ms (baseline: 1-3s)
- Cart operations: < 200ms (baseline: 500-1000ms)
- Coupon validation: < 300ms (baseline: 1-2s)
- Order creation: < 2000ms (baseline: 5-10s)

### Resource Usage
- Memory consumption: < 500MB (baseline: 1GB+)
- CPU utilization: < 30% average (baseline: 60%+)
- Active database connections: < 5 (baseline: 10+)
- API calls per minute: < 30 (baseline: 100+)

### Cache Performance
- Cache hit rate: > 70% (baseline: 40%)
- Cache miss penalty: < 200ms (baseline: 1-2s)
- Duplicate request prevention: 100% (baseline: 0%)

### Query Performance
- Indexed query execution: 50-70% faster than baseline
- Batch fetch operations: 10-50x faster than individual queries
- Dashboard aggregation: 100-1000x faster than in-memory processing

---

## Scope

### In Scope

**Backend Phase 1 (Critical):**
- Add 8 database indexes for query optimization
- Fix order creation N+1 queries with batch fetching
- Move badge recalculation to background jobs
- Optimize dashboard with database aggregation
- Remove AI image generation features

**Backend Phase 2 (Medium):**
- Implement Redis query result caching
- Batch create operations for bulk inserts
- Add pagination to list endpoints
- Reduce production logging overhead

**Crosscoin Frontend:**
- Increase cache TTLs by 2-3x
- Reduce API timeout from 30s to 15s
- Remove AI image endpoints
- Update dashboard skeleton display time
- Add performance monitoring

**E-Commerce Critical Fixes:**
- Fix payment signature verification (missing await)
- Standardize amount units (paise/rupees)
- Centralize Razorpay instance creation

---

### Out of Scope

- Backend Phase 3 (long-term optimizations like cron job optimization, session cleanup, connection pool monitoring)
- Advanced caching strategies (Redis clustering, cache warming)
- Database query rewriting or schema changes beyond indexing
- Frontend framework upgrades or major refactoring
- Load balancing or infrastructure scaling
- Advanced monitoring and alerting systems
- Payment gateway migration or integration changes
- Non-critical e-commerce audit issues (medium/low priority)

---

## Constraints and Dependencies

### Technical Constraints
- Database indexes must be added without downtime (online DDL)
- Redis must be available for caching implementation
- Background job queue must be implemented before badge recalculation can be moved
- Payment verification changes must not break existing payment processing
- Cache invalidation must be coordinated across multiple services

### Organizational Constraints
- Changes must be backward compatible with existing API clients
- Payment processing changes require thorough testing before production deployment
- Database changes must be reviewed by database administrator
- Frontend changes must be tested across supported browsers

### Dependencies
- Redis service must be deployed and accessible
- Background job queue service must be available
- Database must support online index creation
- Razorpay API must be accessible for payment verification testing
- Monitoring/analytics service must be available for performance tracking

---

## Success Criteria

The optimization initiative is successful when:

1. Dashboard loads in < 300ms (5-10x improvement)
2. Product list loads in < 500ms (2-5x improvement)
3. Order creation completes in < 2s (2.5-5x improvement)
4. API response time averages < 200ms (3-5x improvement)
5. Memory usage is < 500MB (50% reduction)
6. Cache hit rate exceeds 70% (75% improvement)
7. Database queries are 50-70% faster with indexes
8. All payment verification tests pass
9. All e-commerce critical issues are resolved
10. No performance regressions in existing functionality
11. All tests pass (unit, integration, end-to-end)
12. Error rate remains < 1%

---

## Acceptance Criteria Testing Strategy

### Property-Based Testing

1. **Invariant: Cache Consistency**
   - FOR ALL cached data, the cached value SHALL match the database value when cache is fresh
   - FOR ALL cache invalidations, subsequent queries SHALL return fresh data from database

2. **Round-Trip Property: Payment Verification**
   - FOR ALL valid payments, signature verification SHALL succeed
   - FOR ALL invalid payments, signature verification SHALL fail consistently

3. **Idempotence: Dashboard Stats**
   - FOR ALL dashboard stat requests within cache TTL, results SHALL be identical
   - FOR ALL dashboard stat requests after cache expiration, results SHALL reflect current data

4. **Metamorphic Property: Query Performance**
   - FOR ALL indexed queries, execution time SHALL be less than non-indexed baseline
   - FOR ALL batch operations, execution time SHALL be less than N individual operations

5. **Error Condition: Payment Failures**
   - FOR ALL invalid signatures, the system SHALL reject payment and log error
   - FOR ALL amount mismatches, the system SHALL reject payment and rollback order
   - FOR ALL network errors, the system SHALL retry with exponential backoff

---

## Implementation Phases

### Phase 1: Critical Backend Optimizations (1-2 hours)
- Add database indexes
- Fix order creation batch fetching
- Move badge recalculation to background
- Optimize dashboard aggregation
- Remove AI features

### Phase 2: Medium Backend Optimizations (2-4 hours)
- Implement Redis caching
- Batch create operations
- Add pagination
- Reduce logging

### Phase 3: Frontend Optimizations (2 hours)
- Update cache TTLs
- Reduce API timeout
- Remove AI endpoints
- Update dashboard skeleton
- Add performance monitoring

### Phase 4: E-Commerce Critical Fixes (3-4 hours)
- Fix payment verification
- Standardize amount units
- Centralize Razorpay instance
- Add transaction rollback
- Add multi-brand support
- Add coupon filtering
- Add stock validation
- Add error handling

---

## Monitoring and Validation

### Metrics to Monitor
- API response times (per endpoint)
- Database query execution times
- Cache hit rates
- Memory usage
- CPU utilization
- Error rates
- Payment processing success rate

### Validation Approach
- Performance testing before and after each optimization
- Load testing with 100+ concurrent users
- End-to-end testing of critical flows
- Payment processing verification with test credentials
- Cache effectiveness measurement
- Error handling verification

