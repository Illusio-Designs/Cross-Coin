/**
 * Standalone OpenAPI definitions for the highest-traffic routes.
 *
 * Why a separate file instead of inline JSDoc on each route handler:
 * each route file mounts multiple endpoints, and inlining 200+ lines
 * of swagger JSDoc per file would bury the route signatures. Until
 * we migrate to per-handler JSDoc, this file holds the canonical
 * spec for the ones we want documented today.
 *
 * Five example documented routes — extend as you go.
 */

/**
 * @swagger
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
 * /api/csrf/token:
 *   get:
 *     tags: [System]
 *     summary: Issue a CSRF token cookie + body payload
 *     description: |
 *       Frontend calls this on dashboard load and mirrors the returned
 *       token into the `X-CSRF-Token` header on every state-changing
 *       request. Enforcement is opt-in via the backend env var
 *       `CSRF_REQUIRED=true`.
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
 * /api/orders/check-address-quality:
 *   post:
 *     tags: [Orders]
 *     summary: Pre-checkout address quality probe
 *     description: |
 *       Returns a 0-100 quality score for the supplied address based on
 *       pincode validity, phone validity, completeness, landmark presence,
 *       and historical delivery success at this exact address. The COD
 *       flag tells the frontend whether to surface a COD button.
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
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *
 * /api/shipping-addresses:
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
 *       200:
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { type: object }
 *       401:
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
