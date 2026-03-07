# API Endpoints Reference - CrossCoin Backend

**Last Updated:** March 7, 2026  
**Base URL:** `https://api.crosscoin.in/api`  
**Required Header:** `X-Brand-Name: crosscoin`

---

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. USER MANAGEMENT

### Public Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/users/register` | Register new user | No |
| POST | `/users/login` | User login | No |
| POST | `/users/admin-login` | Admin login | No |
| POST | `/users/forgot-password` | Request password reset | No |
| POST | `/users/reset-password` | Reset password with token | No |
| POST | `/users/verify-email` | Verify email address | No |

### Protected Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get current user profile | Yes (User) |
| PUT | `/users/profile` | Update user profile | Yes (User) |
| PUT | `/users/change-password` | Change password | Yes (User) |
| GET | `/users` | Get all users | Yes (Admin) |
| PUT | `/users/:id` | Update user | Yes (Admin) |
| DELETE | `/users/:id` | Delete user | Yes (Admin) |

---

## 2. PRODUCTS

### Public Endpoints

| Method | Endpoint | Description | Params |
|--------|----------|-------------|--------|
| GET | `/products/public` | Get all active products | `?page=1&limit=20&sort=createdAt` |
| GET | `/products/public/:slug` | Get product by slug | - |
| GET | `/products/featured` | Get featured products | `?limit=10` |
| GET | `/products/new-arrivals` | Get new products | `?limit=10` |
| GET | `/products/best-sellers` | Get best selling products | `?limit=10` |
| GET | `/products/search` | Search products | `?q=keyword&category=1` |
| GET | `/products/category/:categoryId` | Get products by category | `?page=1&limit=20` |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Get all products (admin) | Yes (Admin) |
| GET | `/products/:id` | Get product by ID | Yes (Admin) |
| POST | `/products` | Create new product | Yes (Admin) |
| PUT | `/products/:id` | Update product | Yes (Admin) |
| DELETE | `/products/:id` | Delete product | Yes (Admin) |
| POST | `/products/:id/images` | Upload product images | Yes (Admin) |
| DELETE | `/products/:id/images/:imageId` | Delete product image | Yes (Admin) |

---

## 3. CATEGORIES

### Public Endpoints

| Method | Endpoint | Description | Params |
|--------|----------|-------------|--------|
| GET | `/categories/public` | Get all active categories | - |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/categories` | Get all categories | Yes (Admin) |
| GET | `/categories/:id` | Get category by ID | Yes (Admin) |
| POST | `/categories` | Create category | Yes (Admin) |
| PUT | `/categories/:id` | Update category | Yes (Admin) |
| DELETE | `/categories/:id` | Delete category | Yes (Admin) |

---

## 4. CART

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/cart` | Get user cart | Yes (User) |
| POST | `/cart/add` | Add item to cart | Yes (User) |
| PUT | `/cart/update/:itemId` | Update cart item quantity | Yes (User) |
| DELETE | `/cart/remove/:itemId` | Remove item from cart | Yes (User) |
| DELETE | `/cart/clear` | Clear entire cart | Yes (User) |

**Request Body (Add to Cart):**
```json
{
  "product_id": 123,
  "variation_id": 456,
  "quantity": 2
}
```

---

## 5. ORDERS

### Customer Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/orders` | Create order (authenticated) | Yes (User) |
| POST | `/orders/guest` | Create order (guest) | No |
| GET | `/orders/user` | Get user orders | Yes (User) |
| GET | `/orders/:id` | Get order details | Yes (User) |
| GET | `/orders/guest/track` | Track guest order | No |
| PUT | `/orders/:id/cancel` | Cancel order | Yes (User) |

**Create Order Request:**
```json
{
  "shipping_address_id": 123,
  "items": [
    {
      "product_id": 255,
      "variation_id": 485,
      "quantity": 1
    }
  ],
  "payment_type": "cod",
  "coupon_id": null,
  "discount_amount": 0,
  "notes": ""
}
```

**Create Guest Order Request:**
```json
{
  "guest_info": {
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "1234567890"
  },
  "shipping_address": {
    "fullName": "John Doe",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "1234567890"
  },
  "items": [...],
  "payment_type": "cod",
  "coupon_id": null,
  "discount_amount": 0
}
```

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/orders` | Get all orders | Yes (Admin) |
| PUT | `/orders/:id/status` | Update order status | Yes (Admin) |
| PUT | `/orders/:id/cancel` | Admin cancel order | Yes (Admin) |
| POST | `/orders/sync-fship` | Sync orders with FShip | Yes (Admin) |
| GET | `/orders/export/delivered` | Export delivered orders | Yes (Admin) |
| POST | `/orders/labels/download` | Download shipping labels | Yes (Admin) |
| GET | `/orders/labels/pending` | Get pending labels | Yes (Admin) |
| POST | `/orders/webhook/fship` | FShip webhook | No (Webhook) |

---

## 6. PAYMENTS

### Razorpay Integration

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/razorpay/create-order` | Create Razorpay order | Yes (User) |
| POST | `/payments/razorpay/verify` | Verify payment | Yes (User) |
| POST | `/payments/razorpay/callback` | Payment callback | No (Webhook) |

**Create Razorpay Order:**
```json
{
  "amount": 999,
  "currency": "INR",
  "order_id": 123
}
```

**Verify Payment:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx",
  "order_id": 123
}
```

### Magic Checkout

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/magic-checkout/create` | Create magic checkout | No |
| POST | `/payments/magic-checkout/verify` | Verify magic checkout | No |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/payments` | Get all payments | Yes (Admin) |
| GET | `/payments/user/:userId` | Get user payments | Yes (Admin) |
| POST | `/payments/refund` | Process refund | Yes (Admin) |

---

## 7. SHIPPING

### Shipping Addresses

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/shipping-addresses` | Get user addresses | Yes (User) |
| POST | `/shipping-addresses` | Create address | Yes (User) |
| PUT | `/shipping-addresses/:id` | Update address | Yes (User) |
| DELETE | `/shipping-addresses/:id` | Delete address | Yes (User) |
| PUT | `/shipping-addresses/:id/default` | Set default address | Yes (User) |

**Create Address Request:**
```json
{
  "full_name": "John Doe",
  "phone": "1234567890",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "country": "India",
  "is_default": false
}
```

### Shipping Fees

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/shipping-fees` | Get shipping fees | No |
| PUT | `/shipping-fees/:id` | Update shipping fee | Yes (Admin) |

---

## 8. COUPONS

### Public Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/coupons/validate` | Validate coupon code | No |

**Validate Coupon:**
```json
{
  "code": "SAVE10",
  "cart_total": 1000,
  "user_id": 123
}
```

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/coupons` | Get all coupons | Yes (Admin) |
| POST | `/coupons` | Create coupon | Yes (Admin) |
| PUT | `/coupons/:id` | Update coupon | Yes (Admin) |
| DELETE | `/coupons/:id` | Delete coupon | Yes (Admin) |

---

## 9. REVIEWS

### Public Endpoints

| Method | Endpoint | Description | Params |
|--------|----------|-------------|--------|
| GET | `/reviews/product/:productId/public` | Get product reviews | `?page=1&limit=10` |
| POST | `/reviews/public` | Create review (guest) | - |

**Create Review:**
```json
{
  "productId": 123,
  "rating": 5,
  "comment": "Great product!",
  "images": ["url1", "url2"]
}
```

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/reviews` | Get all reviews | Yes (Admin) |
| PUT | `/reviews/:id/moderate` | Moderate review | Yes (Admin) |
| DELETE | `/reviews/:id` | Delete review | Yes (Admin) |

---

## 10. WISHLIST

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/wishlist` | Get user wishlist | Yes (User) |
| POST | `/wishlist/add` | Add to wishlist | Yes (User) |
| DELETE | `/wishlist/remove/:productId` | Remove from wishlist | Yes (User) |
| POST | `/wishlist/move-to-cart/:productId` | Move to cart | Yes (User) |

---

## 11. SEO

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/seo/product/:productId` | Get product SEO | No |
| PUT | `/seo/product/:productId` | Update product SEO | Yes (Admin) |
| GET | `/seo/default` | Get default SEO data | No |

**Update SEO:**
```json
{
  "metaTitle": "Product Name - CrossCoin",
  "metaDescription": "Product description...",
  "metaKeywords": "keyword1, keyword2",
  "ogTitle": "Product Name",
  "ogDescription": "Description...",
  "ogImage": "https://...",
  "canonicalUrl": "https://..."
}
```

---

## 12. SLIDERS

### Public Endpoints

| Method | Endpoint | Description | Params |
|--------|----------|-------------|--------|
| GET | `/sliders/public` | Get active sliders | - |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/sliders` | Get all sliders | Yes (Admin) |
| POST | `/sliders` | Create slider | Yes (Admin) |
| PUT | `/sliders/:id` | Update slider | Yes (Admin) |
| DELETE | `/sliders/:id` | Delete slider | Yes (Admin) |

---

## 13. POLICIES

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/policies/public/:type` | Get policy by type | No |
| PUT | `/policies/:type` | Update policy | Yes (Admin) |

**Policy Types:** `privacy`, `terms`, `shipping`, `returns`, `refund`

---

## 14. DASHBOARD

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard/stats` | Get dashboard statistics | Yes (Admin) |

**Response:**
```json
{
  "totalOrders": 1234,
  "totalRevenue": 123456.78,
  "totalUsers": 567,
  "totalProducts": 89,
  "recentOrders": [...],
  "topProducts": [...]
}
```

---

## 15. BRAND MANAGEMENT

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/brands` | Get all brands | Yes (Admin) |
| POST | `/brands` | Create brand | Yes (Admin) |
| PUT | `/brands/:id` | Update brand | Yes (Admin) |
| DELETE | `/brands/:id` | Delete brand | Yes (Admin) |
| GET | `/brand-settings/:brandId` | Get brand settings | Yes (Admin) |
| PUT | `/brand-settings/:brandId` | Update brand settings | Yes (Admin) |

---

## 16. UTM TRACKING

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/utm/track` | Track UTM parameters | No |
| GET | `/utm/session/:sessionId` | Get UTM session | No |

**Track UTM:**
```json
{
  "session_id": "uuid",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "summer_sale",
  "utm_term": "shoes",
  "utm_content": "ad1"
}
```

---

## 17. AI IMAGE GENERATION

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/ai-images/generate` | Generate AI image | Yes (Admin) |
| GET | `/ai-images/history` | Get generation history | Yes (Admin) |

---

## ERROR RESPONSES

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (dev mode only)"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## PAGINATION

List endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field (e.g., `createdAt`, `-price`)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## RATE LIMITING

**Limits:**
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Payment endpoints: 10 requests per 15 minutes

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## WEBHOOKS

### FShip Webhook
```
POST /api/orders/webhook/fship
```

### Razorpay Webhook
```
POST /api/payments/razorpay/callback
```

---

**For detailed implementation examples, see the main optimization report.**
