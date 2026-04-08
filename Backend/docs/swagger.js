'use strict';

/**
 * Swagger/OpenAPI 3.0 documentation.
 * Serves interactive docs at /api/docs
 *
 * Setup: mount in index.js with:
 *   require('./docs/swagger.js')(app);
 */

module.exports = function mountSwagger(app) {
  const { logger } = require('../config/logging.js');
  // Inline spec — no external YAML file needed
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'CrossCoin API',
      version: '1.0.0',
      description: 'E-commerce REST API for CrossCoin platform. Handles users, orders, payments, products, shipping, loyalty, and admin dashboard.',
      contact: { email: 'info@illusiodesigns.agency' },
    },
    servers: [
      { url: 'https://api.crosscoin.in/api/v1', description: 'Production' },
      { url: 'http://localhost:5000/api/v1', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'ORDER_INVALID_STATE' },
                message: { type: 'string', example: 'Cannot cancel shipped order' },
                details: { type: 'object', nullable: true },
              },
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_number: { type: 'string', example: 'ORD-20260408-1234' },
            status: { type: 'string', enum: ['awaiting_confirmation','confirmed','processing','booked','shipped','delivered','cancelled'] },
            payment_type: { type: 'string', enum: ['cod','razorpay'] },
            payment_status: { type: 'string', enum: ['pending','paid','failed','refunded','cancelled'] },
            total_amount: { type: 'number', example: 1299.00 },
            final_amount: { type: 'number', example: 1249.00 },
            rto_risk_level: { type: 'string', enum: ['LOW','MEDIUM','HIGH'] },
          },
        },
        CheckoutRequest: {
          type: 'object',
          required: ['guest_info','shipping_address','items','payment_type'],
          properties: {
            guest_info: {
              type: 'object',
              required: ['phone','email','firstName'],
              properties: {
                phone: { type: 'string', example: '9876543210' },
                email: { type: 'string', example: 'user@example.com' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
              },
            },
            shipping_address: {
              type: 'object',
              properties: {
                fullName: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string', example: '380001' },
                phone: { type: 'string' },
              },
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_id: { type: 'integer' },
                  variation_id: { type: 'integer', nullable: true },
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
            payment_type: { type: 'string', enum: ['cod','razorpay'] },
            coupon_id: { type: 'integer', nullable: true },
            discount_amount: { type: 'number', nullable: true },
            idempotency_key: { type: 'string', description: 'Prevents duplicate orders on retry' },
          },
        },
        CancelRequest: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 5, maxLength: 500, example: 'Changed my mind about the purchase' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['admin','product_manager','order_manager','whatsapp_manager','consumer'] },
            loyalty_points: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & user management' },
      { name: 'Orders', description: 'Order lifecycle management' },
      { name: 'Payments', description: 'Razorpay payment processing' },
      { name: 'Products', description: 'Product catalog' },
      { name: 'Cart', description: 'Shopping cart' },
      { name: 'Addresses', description: 'Shipping addresses' },
      { name: 'Admin', description: 'Admin-only operations' },
    ],
    paths: {
      // ── Auth ────────────────────────────────────────────────────────────
      '/users/login': {
        post: {
          tags: ['Auth'],
          summary: 'OTP phone login',
          description: 'Login with phone number. Auto-creates consumer account if not found. Links any guest orders by email.',
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['phone'], properties: { phone: { type: 'string', example: '9876543210' } } } } } },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, refreshToken: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            400: { description: 'Invalid phone', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/users/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register consumer account',
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['username','email','password'], properties: { username: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 8 } } } } } },
          responses: { 201: { description: 'User created' }, 400: { description: 'Validation error' } },
        },
      },
      '/users/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'User profile' }, 401: { description: 'Unauthorized' } },
        },
      },
      '/users/delete': {
        delete: {
          tags: ['Auth'],
          summary: 'Soft delete account',
          description: 'Anonymises PII and sets deleted_at. Orders preserved.',
          security: [{ BearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } },
          responses: { 200: { description: 'Account deleted' } },
        },
      },

      // ── Orders ──────────────────────────────────────────────────────────
      '/orders/checkout': {
        post: {
          tags: ['Orders'],
          summary: 'Create order (unauthenticated)',
          description: 'Auto-creates consumer account from guest_info. Returns X-Auth-Token header for auto-login. No GuestUser created.',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutRequest' } } } },
          responses: {
            201: { description: 'Order created', headers: { 'X-Auth-Token': { schema: { type: 'string' }, description: 'JWT token for auto-login' } } },
            200: { description: 'Duplicate order (idempotency key match)' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/orders': {
        post: {
          tags: ['Orders'],
          summary: 'Create order (authenticated)',
          security: [{ BearerAuth: [] }],
          description: 'Creates order with status awaiting_confirmation. FShip sync only after admin confirms.',
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['shipping_address_id','items','payment_type'], properties: { shipping_address_id: { type: 'integer' }, items: { type: 'array', items: { type: 'object', properties: { product_id: { type: 'integer' }, variation_id: { type: 'integer' }, quantity: { type: 'integer' } } } }, payment_type: { type: 'string', enum: ['cod','razorpay'] }, idempotency_key: { type: 'string' } } } } } },
          responses: { 201: { description: 'Order created' }, 400: { description: 'Validation error' } },
        },
        get: {
          tags: ['Admin'],
          summary: 'List all orders (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Orders list with rto_risk_level' } },
        },
      },
      '/orders/my-orders': {
        get: {
          tags: ['Orders'],
          summary: 'Get current user orders',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'User orders with rto_risk_level' } },
        },
      },
      '/orders/{id}/confirm': {
        put: {
          tags: ['Admin'],
          summary: 'Confirm order (admin)',
          description: 'Transitions awaiting_confirmation → confirmed. Triggers FShip sync. Uses row lock to prevent race conditions.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Order confirmed' }, 400: { description: 'Invalid state transition' } },
        },
      },
      '/orders/{id}/cancel': {
        put: {
          tags: ['Orders'],
          summary: 'Cancel order (user)',
          description: 'Allowed up to processing status. Reason required. Restores stock, refunds loyalty, cancels FShip.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelRequest' } } } },
          responses: { 200: { description: 'Order cancelled' }, 400: { description: 'Cannot cancel', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
        },
      },
      '/orders/{id}/status': {
        put: {
          tags: ['Admin'],
          summary: 'Update order status (admin)',
          description: 'State machine validated. Emits lifecycle events.',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string' }, notes: { type: 'string' } } } } } },
          responses: { 200: { description: 'Status updated' }, 400: { description: 'Invalid transition' } },
        },
      },

      // ── Payments ────────────────────────────────────────────────────────
      '/payments/razorpay/create': {
        post: {
          tags: ['Payments'],
          summary: 'Create Razorpay order',
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['amount','currency'], properties: { amount: { type: 'number' }, currency: { type: 'string', default: 'INR' }, receipt: { type: 'string' } } } } } },
          responses: { 200: { description: 'Razorpay order created with id, amount, currency' } },
        },
      },
      '/payments/razorpay/verify': {
        post: {
          tags: ['Payments'],
          summary: 'Verify Razorpay payment',
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['orderId','razorpayPaymentId','razorpayOrderId','razorpaySignature'], properties: { orderId: { type: 'integer' }, razorpayPaymentId: { type: 'string' }, razorpayOrderId: { type: 'string' }, razorpaySignature: { type: 'string' } } } } } },
          responses: { 200: { description: 'Payment verified' }, 400: { description: 'Signature mismatch' } },
        },
      },

      // ── Products ────────────────────────────────────────────────────────
      '/products/public': {
        get: {
          tags: ['Products'],
          summary: 'List products (public)',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest','price_asc','price_desc','featured'] } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Product list' } },
        },
      },

      // ── Cart ────────────────────────────────────────────────────────────
      '/cart': {
        get: { tags: ['Cart'], summary: 'Get user cart', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Cart items' } } },
      },
      '/cart/add': {
        post: { tags: ['Cart'], summary: 'Add item to cart', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Item added' } } },
      },

      // ── Addresses ───────────────────────────────────────────────────────
      '/shipping-addresses': {
        get: { tags: ['Addresses'], summary: 'Get user addresses', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Address list' } } },
        post: { tags: ['Addresses'], summary: 'Create address', security: [{ BearerAuth: [] }], responses: { 201: { description: 'Address created' } } },
      },

      // ── Health ──────────────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Admin'],
          summary: 'Health check',
          responses: { 200: { description: 'Service healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, uptime: { type: 'number' }, database: { type: 'object' }, memory: { type: 'object' } } } } } } },
        },
      },
    },
  };

  // ── Serve Swagger UI via CDN (no npm dependency) ────────────────────────
  app.get('/api/docs/spec.json', (req, res) => res.json(spec));

  app.get('/api/docs', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head>
  <title>CrossCoin API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head><body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: '/api/docs/spec.json', dom_id: '#swagger-ui', deepLinking: true });</script>
</body></html>`);
  });

  logger.info('✓ Swagger docs available at /api/docs');
};
