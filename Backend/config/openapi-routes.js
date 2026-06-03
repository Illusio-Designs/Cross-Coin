/**
 * Standalone OpenAPI definitions for the highest-traffic routes.
 *
 * Why a separate file instead of inline JSDoc on each route handler:
 * each route file mounts multiple endpoints, and inlining 200+ lines
 * of swagger JSDoc per file would bury the route signatures. This file
 * holds the canonical spec for the documented routes today. Migrate
 * to per-handler JSDoc incrementally.
 *
 * Order: system → auth → orders → addresses → coupons → products
 *       → shipping
 */

/**
 * @swagger
 * tags:
 *   - name: System
 *     description: Health, CSRF, metrics
 *   - name: Auth
 *     description: Login, register, password
 *   - name: Orders
 *     description: Customer + admin order operations
 *   - name: Addresses
 *     description: Saved shipping addresses
 *   - name: Coupons
 *     description: Validate + apply discount codes
 *   - name: Products
 *     description: Catalog + search
 *   - name: Shipping
 *     description: Provider-agnostic shipping ops (iThink / FShip)
 *
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Liveness + dependency health check
 *     responses:
 *       200:
 *         description: All systems OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, enum: [ok, degraded] }
 *                 uptime: { type: integer }
 *                 services:
 *                   type: object
 *                   properties:
 *                     database: { type: string }
 *                     redis: { type: string }
 *
 * /api/metrics:
 *   get:
 *     tags: [System]
 *     summary: Operator metrics (memory, queue, uptime)
 *     description: |
 *       Gated by `X-Metrics-Token` header when `ADMIN_METRICS_TOKEN` is set.
 *     responses:
 *       200: { description: OK }
 *       401: { description: Token missing or wrong }
 *
 * /api/csrf/token:
 *   get:
 *     tags: [System]
 *     summary: Issue a CSRF token cookie + body payload
 *     description: |
 *       Frontend calls this on dashboard load and mirrors the returned
 *       token into the `X-CSRF-Token` header on every state-changing
 *       request. Enforcement is opt-in via `CSRF_REQUIRED=true`.
 *     responses:
 *       200:
 *         description: Token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     csrfToken: { type: string }
 *                     headerName: { type: string }
 *
 * /api/client-errors:
 *   post:
 *     tags: [System]
 *     summary: Sink for storefront error reports
 *     description: |
 *       Receives drained entries from `utils/errorReporter.js`
 *       (ErrorBoundary catches + unhandled rejections + window errors).
 *       Logs at WARN. Always returns 204 — never throws.
 *     responses:
 *       204: { description: Logged }
 *
 * /api/users/login:
 *   post:
 *     tags: [Auth]
 *     summary: Email/username + password login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               email: { type: string }
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Authenticated }
 *       401:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/users/register:
 *   post:
 *     tags: [Auth]
 *     summary: New user registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201: { description: User created }
 *       400:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/users/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password-reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Reset link emailed (always 200 to avoid leaking which emails exist) }
 *
 * /api/users/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Complete a password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Password updated }
 *       400:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create an order (authenticated)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shipping_address_id, items, payment_type]
 *             properties:
 *               shipping_address_id: { type: integer }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id: { type: integer }
 *                     variation_id: { type: integer }
 *                     quantity: { type: integer }
 *               payment_type: { type: string, enum: [cod, razorpay, prepaid] }
 *               coupon_id: { type: integer }
 *               idempotency_key: { type: string }
 *     responses:
 *       201: { description: Order created }
 *       400:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/orders/check-address-quality:
 *   post:
 *     tags: [Orders]
 *     summary: Pre-checkout address quality probe
 *     description: |
 *       Returns a 0-100 quality score based on pincode validity, phone
 *       validity, completeness, landmark presence, and historical
 *       delivery success. The COD flag tells the frontend whether to
 *       surface a COD button.
 *
 *       **Response shape**: dual envelope — `{ success, data: {...}, ...flat }`
 *       for backwards compat. Read either `response.data.score` or
 *       `response.data.data.score`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AddressQualityRequest' }
 *     responses:
 *       200:
 *         description: Score computed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AddressQualityResponse' }
 *       400:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/orders/track/awb:
 *   get:
 *     tags: [Orders]
 *     summary: Public order tracking by AWB number
 *     parameters:
 *       - in: query
 *         name: awb
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tracking history }
 *
 * /api/orders/track/{order_number}:
 *   get:
 *     tags: [Orders]
 *     summary: Public order tracking by order number
 *     parameters:
 *       - in: path
 *         name: order_number
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tracking history }
 *
 * /api/shipping-addresses:
 *   get:
 *     tags: [Addresses]
 *     summary: List saved addresses for the authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of addresses }
 *   post:
 *     tags: [Addresses]
 *     summary: Create a saved shipping address
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address, city, state, postal_code, country, phone_number]
 *             properties:
 *               full_name: { type: string }
 *               address: { type: string }
 *               landmark: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               postal_code: { type: string }
 *               country: { type: string, default: 'India' }
 *               phone_number: { type: string }
 *               is_default: { type: boolean }
 *     responses:
 *       201: { description: Created }
 *       400:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/coupons/validate:
 *   post:
 *     tags: [Coupons]
 *     summary: Check whether a coupon code applies to the current cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *               cart_total: { type: number }
 *               user_id: { type: integer }
 *     responses:
 *       200: { description: Coupon valid }
 *       400:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/coupons/listing:
 *   get:
 *     tags: [Coupons]
 *     summary: List public coupons currently active
 *     responses:
 *       200: { description: Coupon list }
 *
 * /api/products/catalog:
 *   get:
 *     tags: [Products]
 *     summary: Public product catalog
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200: { description: Paginated catalog }
 *
 * /api/products/by-slug/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Product detail by slug (used by /products/[slug] SSR)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product object with variations }
 *       404: { description: Not found }
 *
 * /api/products/search:
 *   get:
 *     tags: [Products]
 *     summary: Full-text product search
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Search results }
 *
 * /api/orders/shipping/sync:
 *   post:
 *     tags: [Shipping]
 *     summary: Bulk sync pending orders to the active shipping provider
 *     description: |
 *       Provider-agnostic. Reads `SHIPPING_PROVIDER` per brand and
 *       dispatches via `services/shippingService.js`. Legacy alias:
 *       `/api/orders/fship/sync`.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sync result }
 *
 * /api/orders/shipping/webhook:
 *   post:
 *     tags: [Shipping]
 *     summary: Inbound webhook from the active shipping provider
 *     description: |
 *       HMAC-SHA256 verified against either `ITHINK_WEBHOOK_SECRET` or
 *       `FSHIP_WEBHOOK_SECRET` (whichever matches). Provider-agnostic so
 *       brands can toggle `SHIPPING_PROVIDER` without re-routing webhooks.
 *     responses:
 *       200: { description: Event processed }
 *       401: { description: Signature missing / invalid }
 */
