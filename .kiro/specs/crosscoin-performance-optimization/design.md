# CrossCoin Performance Optimization - Design Document

## Overview

This design document outlines a comprehensive performance optimization strategy for the CrossCoin e-commerce platform. The optimization targets critical bottlenecks in database queries, payment processing, and frontend operations, with a goal of reducing dashboard load time to <300ms and improving overall system throughput.

The optimization is structured in three phases:
- **Backend Phase 1 (Critical)**: Database indexing, order creation optimization, badge recalculation, dashboard aggregation
- **Backend Phase 2 (Medium)**: Redis caching, batch operations, pagination, logging reduction
- **E-Commerce Fixes**: Payment verification, amount standardization, transaction rollback, multi-brand handling
- **Frontend Optimizations**: Cache TTL increases, API timeout reduction, performance monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Cache Manager    │  │ Request Dedup    │  │ Performance  │  │
│  │ (TTL: 5-30m)     │  │ (In-flight)      │  │ Monitor      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Request Routing, Rate Limiting, Timeout Management       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Service Layer                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Order Service    │  │ Dashboard Svc    │  │ Payment Svc  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Caching & Queue Layer                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Redis Cache      │  │ Job Queue        │  │ Batch Ops    │  │
│  │ (TTL: 5-60m)     │  │ (Badge Recalc)   │  │ (Async)      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Optimized Indexes, Query Patterns, Aggregation Pipeline │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Optimization Layer

#### Critical Indexes (Backend Phase 1)

**Index 1: Orders by User and Date**
```
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC)
```
Rationale: Enables fast retrieval of user's recent orders for dashboard and order history.

**Index 2: Order Items with Product**
```
CREATE INDEX idx_order_items_product ON order_items(order_id, product_id)
```
Rationale: Accelerates product detail lookups during order processing and fulfillment.

**Index 3: Badges by User**
```
CREATE INDEX idx_badges_user ON badges(user_id, badge_type, created_at DESC)
```
Rationale: Supports badge recalculation queries and user badge retrieval.

**Index 4: Transactions by Order**
```
CREATE INDEX idx_transactions_order ON transactions(order_id, status, created_at DESC)
```
Rationale: Enables payment status verification and transaction history queries.

**Index 5: Products by Category**
```
CREATE INDEX idx_products_category ON products(category_id, is_active, created_at DESC)
```
Rationale: Accelerates category browsing and product listing queries.

**Index 6: Variations by Product**
```
CREATE INDEX idx_variations_product ON product_variations(product_id, is_active)
```
Rationale: Speeds up variation lookups during order creation and cart operations.

**Index 7: Coupons by Code and Status**
```
CREATE INDEX idx_coupons_code_status ON coupons(code, is_active, expiry_date)
```
Rationale: Enables fast coupon validation during checkout.

**Index 8: Stock by Product and Warehouse**
```
CREATE INDEX idx_stock_product_warehouse ON stock(product_id, warehouse_id, quantity)
```
Rationale: Supports inventory checks and stock allocation during order creation.

### 2. Caching Layer (Redis Integration)

#### Cache Key Patterns

```
user:{user_id}:dashboard -> Dashboard aggregation data (TTL: 5m)
product:{product_id}:details -> Product with variations (TTL: 30m)
category:{category_id}:products -> Category product list (TTL: 15m)
cart:{user_id}:items -> Shopping cart state (TTL: 24h)
coupon:{code}:details -> Coupon validation data (TTL: 60m)
badge:recalc:queue -> Badge recalculation job queue (TTL: 24h)
order:{order_id}:status -> Order status snapshot (TTL: 10m)
```

#### Cache Invalidation Strategy

- **Write-through**: Payment transactions invalidate order cache immediately
- **TTL-based**: Dashboard data expires after 5 minutes
- **Event-driven**: Badge recalculation triggers cache invalidation
- **Batch invalidation**: Product updates invalidate category caches

### 3. Background Job Queue

#### Badge Recalculation Pattern

```
Queue: badge_recalculation
Message Format:
{
  job_id: UUID,
  user_id: string,
  badge_types: string[],
  priority: 'high' | 'normal' | 'low',
  retry_count: number,
  created_at: timestamp
}

Processing:
1. Dequeue job from queue
2. Fetch user's transaction history
3. Calculate badge eligibility
4. Update badges table
5. Invalidate user dashboard cache
6. Log completion
```

#### Async Operations Pattern

- Order creation triggers async product availability check
- Badge recalculation runs in background queue
- Stock updates trigger inventory sync jobs
- Payment reconciliation runs nightly

### 4. Payment Processing Improvements

#### Signature Verification Fix

```javascript
// BEFORE (Bug: missing await)
const isValid = razorpay.validateWebhookSignature(
  body,
  signature,
  secret
);

// AFTER (Fixed)
const isValid = await razorpay.validateWebhookSignature(
  body,
  signature,
  secret
);
```

#### Amount Unit Standardization

```javascript
// Utility functions for amount handling
const toSmallestUnit = (amount, currency) => {
  // Convert to paise/cents (multiply by 100)
  return Math.round(amount * 100);
};

const fromSmallestUnit = (amount, currency) => {
  // Convert from paise/cents to rupees/dollars
  return amount / 100;
};

// Usage in payment processing
const paymentAmount = toSmallestUnit(order.total, 'INR');
```

#### Razorpay Instance Centralization

```javascript
// razorpay.service.js
class RazorpayService {
  constructor() {
    this.instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  async validateSignature(body, signature, secret) {
    return this.instance.validateWebhookSignature(body, signature, secret);
  }

  async createOrder(amount, currency, receipt) {
    return this.instance.orders.create({
      amount: toSmallestUnit(amount, currency),
      currency,
      receipt
    });
  }
}
```

#### Transaction Rollback on Failure

```javascript
async function createOrderWithPayment(orderData) {
  const session = await db.startTransaction();
  try {
    // Create order
    const order = await Order.create(orderData, { session });
    
    // Process payment
    const payment = await razorpay.createOrder({
      amount: orderData.total,
      currency: 'INR',
      receipt: order.id
    });
    
    // Create transaction record
    await Transaction.create({
      order_id: order.id,
      razorpay_order_id: payment.id,
      status: 'pending'
    }, { session });
    
    await session.commit();
    return { order, payment };
  } catch (error) {
    await session.rollback();
    throw error;
  }
}
```

### 5. Frontend Optimization Layer

#### Cache Management

```javascript
// Cache configuration
const CACHE_CONFIG = {
  dashboard: { ttl: 5 * 60 * 1000 },      // 5 minutes
  productList: { ttl: 30 * 60 * 1000 },   // 30 minutes
  cart: { ttl: 24 * 60 * 60 * 1000 },     // 24 hours
  userProfile: { ttl: 15 * 60 * 1000 }    // 15 minutes
};

class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttl) {
    this.cache.set(key, { value, expiry: Date.now() + ttl });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.match(pattern)) this.cache.delete(key);
    }
  }
}
```

#### Request Deduplication

```javascript
class RequestDeduplicator {
  constructor() {
    this.inFlight = new Map();
  }

  async deduplicate(key, fn) {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}
```

## Data Models & Schemas

### Cache Key Patterns

```
Pattern: {entity}:{id}:{type}
Examples:
  user:12345:dashboard
  product:67890:details
  order:11111:status
  category:22222:products
```

### Queue Message Format

```json
{
  "job_id": "uuid-v4",
  "type": "badge_recalculation|stock_sync|payment_reconciliation",
  "user_id": "string",
  "payload": {},
  "priority": "high|normal|low",
  "retry_count": 0,
  "max_retries": 3,
  "created_at": "ISO-8601",
  "scheduled_for": "ISO-8601"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_VERIFICATION_FAILED",
    "message": "Payment signature verification failed",
    "details": {},
    "timestamp": "ISO-8601"
  }
}
```

### Performance Metrics Schema

```json
{
  "metric_id": "uuid",
  "endpoint": "/api/dashboard",
  "response_time_ms": 245,
  "cache_hit": true,
  "database_queries": 3,
  "timestamp": "ISO-8601"
}
```

## Integration Points

### Redis Connection

```javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0
});

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('Redis connected'));
```

### Background Job Queue

```javascript
const Queue = require('bull');
const badgeQueue = new Queue('badge_recalculation', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

badgeQueue.process(async (job) => {
  await recalculateBadges(job.data.user_id, job.data.badge_types);
});
```

### Payment Gateway

```javascript
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
```

### Shipping Service Integration

```javascript
async function validateShippingAddress(address) {
  const response = await shippingService.validateAddress(address);
  return response.is_valid;
}
```

### Analytics Integration

```javascript
function trackPerformanceMetric(endpoint, responseTime, cacheHit) {
  analytics.track('api_performance', {
    endpoint,
    response_time_ms: responseTime,
    cache_hit: cacheHit,
    timestamp: new Date()
  });
}
```

## Error Handling & Recovery

### Retry Strategies

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Fallback Mechanisms

```javascript
async function getDashboardData(userId) {
  try {
    // Try cache first
    const cached = cache.get(`user:${userId}:dashboard`);
    if (cached) return cached;

    // Try database
    const data = await aggregateDashboardData(userId);
    cache.set(`user:${userId}:dashboard`, data, 5 * 60 * 1000);
    return data;
  } catch (error) {
    // Fallback to stale cache or empty state
    return cache.get(`user:${userId}:dashboard:stale`) || getEmptyDashboard();
  }
}
```

### Rollback Procedures

```javascript
async function rollbackOrder(orderId) {
  const order = await Order.findById(orderId);
  
  // Reverse stock allocation
  for (const item of order.items) {
    await Stock.increment(item.product_id, item.quantity);
  }
  
  // Reverse coupon usage
  if (order.coupon_id) {
    await Coupon.decrementUsageCount(order.coupon_id);
  }
  
  // Mark order as cancelled
  await Order.update(orderId, { status: 'cancelled' });
}
```

### Error Logging

```javascript
function logError(error, context) {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date(),
    severity: 'high'
  });
}
```

## Performance Targets

| Metric | Target | Current | Improvement |
|--------|--------|---------|-------------|
| Dashboard Load | <300ms | ~1200ms | 75% reduction |
| Product List | <500ms | ~800ms | 37% reduction |
| Cart Operations | <200ms | ~400ms | 50% reduction |
| Order Creation | <2s | ~4s | 50% reduction |
| Memory Usage | <500MB | ~800MB | 37% reduction |
| Cache Hit Rate | >70% | ~30% | 133% improvement |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Database Index Correctness

*For any* database schema, all 8 required indexes should exist with correct column ordering and be queryable without errors.

**Validates: Requirements 1.1**

### Property 2: Batch Fetching Pattern

*For any* set of orders being created, the number of database queries for product/variation lookups should be constant regardless of order count (batch pattern), not linear.

**Validates: Requirements 1.2**

### Property 3: Async Badge Recalculation

*For any* badge recalculation request, the operation should be enqueued to the job queue and return immediately without blocking the main request thread.

**Validates: Requirements 1.3**

### Property 4: Dashboard Aggregation Caching

*For any* dashboard query, the result should be retrieved from cache on subsequent requests within the TTL window, reducing database queries to zero.

**Validates: Requirements 1.4**

### Property 5: Redis Cache Round Trip

*For any* data stored in Redis cache, retrieving it should return the exact same value that was stored, preserving data integrity.

**Validates: Requirements 2.1**

### Property 6: Cache Invalidation Removes Data

*For any* cached key that is invalidated, subsequent retrieval attempts should return null/miss, confirming the data was removed.

**Validates: Requirements 2.2**

### Property 7: Batch Operations Reduce Queries

*For any* batch create operation, the number of database queries should be significantly less than performing the same operations individually (at least 50% reduction).

**Validates: Requirements 2.3**

### Property 8: Pagination Correctness

*For any* paginated query with page N and limit L, the returned results should contain exactly items from offset (N-1)*L to N*L-1, with no duplicates or gaps.

**Validates: Requirements 2.4**

### Property 9: Payment Signature Validation

*For any* payment webhook, valid signatures should pass verification and invalid signatures should fail verification, preventing unauthorized payment processing.

**Validates: Requirements 3.1**

### Property 10: Amount Unit Conversion Round Trip

*For any* monetary amount, converting to smallest unit and back should return the original amount with no precision loss.

**Validates: Requirements 3.2**

### Property 11: Transaction Rollback Completeness

*For any* failed transaction, all database changes (orders, stock, coupons) should be rolled back to their pre-transaction state.

**Validates: Requirements 3.3**

### Property 12: Multi-Brand Context Preservation

*For any* payment flow, the brand context should remain consistent throughout all operations and be correctly associated with the final transaction record.

**Validates: Requirements 3.4**

### Property 13: Coupon Payment Mode Filtering

*For any* coupon query filtered by payment mode, only coupons applicable to that payment mode should be returned.

**Validates: Requirements 3.5**

### Property 14: Stock Validation Prevents Overselling

*For any* order creation attempt with insufficient stock, the operation should fail and stock should remain unchanged.

**Validates: Requirements 3.6**

### Property 15: Frontend Cache TTL Expiration

*For any* cached item with TTL, accessing it after the TTL expires should return null/miss, confirming expiration is enforced.

**Validates: Requirements 4.1**

### Property 16: API Timeout Reliability

*For any* API request with the new timeout configuration, legitimate requests should complete successfully without timeout errors.

**Validates: Requirements 4.2**

### Property 17: Performance Metrics Accuracy

*For any* API request, the recorded performance metrics should match the actual request execution time within a 10% margin of error.

**Validates: Requirements 4.4**

## Testing Strategy

### Unit Testing Approach

Unit tests focus on specific examples, edge cases, and error conditions:

**Database Layer Tests**
- Verify each index exists with correct columns
- Test index query performance improvements
- Validate index creation doesn't break existing queries

**Cache Layer Tests**
- Test cache set/get operations with various data types
- Verify TTL expiration behavior
- Test cache invalidation patterns
- Validate concurrent access to cache

**Payment Processing Tests**
- Test signature validation with valid/invalid signatures
- Test amount conversion edge cases (rounding, precision)
- Test transaction rollback on various failure scenarios
- Test multi-brand context isolation

**Frontend Tests**
- Test cache manager TTL enforcement
- Test request deduplication with concurrent requests
- Test performance metric collection accuracy

### Property-Based Testing Configuration

Property-based tests use randomized input generation to verify universal properties:

**Database Properties**
```javascript
// Feature: crosscoin-performance-optimization, Property 1: Database Index Correctness
test.prop([fc.array(fc.object())], (orders) => {
  const indexes = getIndexes();
  expect(indexes).toContainEqual(expect.objectContaining({
    name: 'idx_orders_user_date',
    columns: ['user_id', 'created_at']
  }));
  // ... verify all 8 indexes
});

// Feature: crosscoin-performance-optimization, Property 2: Batch Fetching Pattern
test.prop([fc.array(fc.integer({ min: 1, max: 100 }))], (orderIds) => {
  const queryCount = trackQueries(() => {
    batchFetchProducts(orderIds);
  });
  expect(queryCount).toBeLessThan(orderIds.length);
});
```

**Cache Properties**
```javascript
// Feature: crosscoin-performance-optimization, Property 5: Redis Cache Round Trip
test.prop([fc.anything()], (data) => {
  cache.set('test_key', data);
  const retrieved = cache.get('test_key');
  expect(retrieved).toEqual(data);
});

// Feature: crosscoin-performance-optimization, Property 6: Cache Invalidation Removes Data
test.prop([fc.string()], (key) => {
  cache.set(key, 'value');
  cache.invalidate(new RegExp(key));
  expect(cache.get(key)).toBeNull();
});
```

**Payment Properties**
```javascript
// Feature: crosscoin-performance-optimization, Property 9: Payment Signature Validation
test.prop([fc.string(), fc.string()], (validSig, invalidSig) => {
  const validResult = validateSignature(validSig, validSecret);
  const invalidResult = validateSignature(invalidSig, validSecret);
  expect(validResult).toBe(true);
  expect(invalidResult).toBe(false);
});

// Feature: crosscoin-performance-optimization, Property 10: Amount Unit Conversion Round Trip
test.prop([fc.float({ min: 0.01, max: 1000000 })], (amount) => {
  const converted = toSmallestUnit(amount);
  const reverted = fromSmallestUnit(converted);
  expect(reverted).toBeCloseTo(amount, 2);
});
```

**Pagination Properties**
```javascript
// Feature: crosscoin-performance-optimization, Property 8: Pagination Correctness
test.prop([fc.integer({ min: 1, max: 100 }), fc.integer({ min: 1, max: 10 })], 
  (page, limit) => {
    const results = paginate(allItems, page, limit);
    const expectedStart = (page - 1) * limit;
    const expectedEnd = page * limit;
    expect(results).toEqual(allItems.slice(expectedStart, expectedEnd));
  }
);
```

### Test Configuration

- **Minimum iterations**: 100 per property test
- **Timeout**: 30 seconds per test
- **Seed**: Fixed seed for reproducibility
- **Shrinking**: Enabled to find minimal failing examples

### Performance Testing

Load tests verify performance targets:

```javascript
// Dashboard load time < 300ms
test('dashboard loads in under 300ms', async () => {
  const start = Date.now();
  await getDashboardData(userId);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(300);
});

// Product list < 500ms
test('product list loads in under 500ms', async () => {
  const start = Date.now();
  await getProductList(categoryId);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(500);
});

// Cart operations < 200ms
test('cart operations complete in under 200ms', async () => {
  const start = Date.now();
  await updateCart(userId, items);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(200);
});

// Order creation < 2s
test('order creation completes in under 2s', async () => {
  const start = Date.now();
  await createOrder(orderData);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(2000);
});
```

### Integration Testing

Integration tests verify component interactions:

- Payment flow: Order creation → Payment processing → Transaction recording
- Badge recalculation: User action → Queue job → Badge update → Cache invalidation
- Stock management: Order creation → Stock check → Stock allocation → Inventory update
- Multi-brand handling: Brand context → Payment processing → Transaction association

## Implementation Phases

### Backend Phase 1 (Critical) - Week 1-2

1. Create all 8 database indexes
2. Implement batch fetching for order creation
3. Set up badge recalculation job queue
4. Implement dashboard aggregation with caching
5. Remove AI-related code and imports

**Files to delete:**
- `src/services/ai-service.js`
- `src/routes/ai-routes.js`
- `src/models/ai-model.js`

**Imports to remove:**
- All references to `ai-service` in controllers
- AI-related middleware from app.js

### Backend Phase 2 (Medium) - Week 3-4

1. Implement Redis caching service
2. Add batch create operations
3. Implement pagination
4. Reduce logging verbosity

### E-Commerce Fixes - Week 2-3 (Parallel)

1. Fix payment signature verification (add await)
2. Implement amount unit standardization
3. Centralize Razorpay instance
4. Add transaction rollback on failure
5. Implement multi-brand context handling
6. Add coupon payment mode filtering
7. Implement stock validation service
8. Standardize error handling

### Frontend Optimizations - Week 4-5

1. Increase cache TTLs
2. Reduce API timeouts
3. Remove AI endpoint calls
4. Implement dashboard skeleton
5. Add performance monitoring

## Success Criteria

- Dashboard load time: <300ms (75% improvement)
- Product list load time: <500ms (37% improvement)
- Cart operations: <200ms (50% improvement)
- Order creation: <2s (50% improvement)
- Memory usage: <500MB (37% improvement)
- Cache hit rate: >70% (133% improvement)
- All property-based tests pass with 100+ iterations
- Zero payment processing failures due to signature verification
- 100% transaction rollback success on failures
