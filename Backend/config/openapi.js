/**
 * OpenAPI 3.0 spec generator + Swagger UI mount.
 *
 * Generates a live spec from JSDoc `@swagger` blocks on route files
 * (or the central component definitions below) and exposes it at:
 *   GET  /api/docs.json   — raw OpenAPI JSON
 *   GET  /api/docs        — Swagger UI
 *
 * Locked behind ADMIN_METRICS_TOKEN when set (the same gate as /api/metrics)
 * so the spec doesn't leak admin route shapes publicly.
 *
 * Adding a new documented route:
 *
 *   `@swagger
 *    /api/orders/check-address-quality:
 *      post:
 *        summary: ...
 *        ...`
 *
 * The JSDoc lives on the route file. swagger-jsdoc walks the file
 * globs listed in `apis` below and stitches them into one spec.
 */

const swaggerJSDoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'CrossCoin API',
    version: '1.0.0',
    description: 'REST API for the CrossCoin e-commerce platform.',
    contact: { email: 'info@illusiodesigns.agency' },
  },
  servers: [
    { url: 'https://api.crosscoin.in', description: 'Production' },
    { url: 'http://localhost:5000', description: 'Local dev' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      brandHeader: { type: 'apiKey', in: 'header', name: 'X-Brand-Name' },
      csrfHeader: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      AddressQualityRequest: {
        type: 'object',
        required: ['line1', 'pincode'],
        properties: {
          line1: { type: 'string', example: 'A-203, Maple Heights' },
          line2: { type: 'string' },
          landmark: { type: 'string', example: 'Near VR Mall' },
          city: { type: 'string', example: 'Surat' },
          state: { type: 'string', example: 'Gujarat' },
          pincode: { type: 'string', pattern: '^\\d{6}$', example: '395007' },
          phone: { type: 'string', example: '9876543210' },
        },
      },
      AddressQualityResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          score: { type: 'integer', minimum: 0, maximum: 100, example: 85 },
          factors: {
            type: 'object',
            properties: {
              pincodeValid: { type: 'boolean' },
              phoneValid: { type: 'boolean' },
              addressComplete: { type: 'boolean' },
              landmarkProvided: { type: 'boolean' },
              historicalDeliverySuccess: { type: 'integer' },
            },
          },
          recommendation: { type: 'string', enum: ['cod', 'prepaid', 'either'] },
          cod_allowed: { type: 'boolean' },
          cod_min_quality: { type: 'integer' },
        },
      },
    },
  },
};

const options = {
  definition,
  apis: [
    './routes/*.js',
    './controller/*.js',
    './config/openapi-routes.js',
  ],
};

const spec = swaggerJSDoc(options);

function mountSwagger(app) {
  const swaggerUi = require('swagger-ui-express');

  // Token gate (only when ADMIN_METRICS_TOKEN is set).
  const gate = (req, res, next) => {
    const required = process.env.ADMIN_METRICS_TOKEN;
    if (!required) return next();
    const presented = (req.headers['x-metrics-token'] || req.query.token || '').toString();
    if (presented !== required) return res.status(401).json({ success: false, message: 'Unauthorized' });
    next();
  };

  app.get('/api/docs.json', gate, (req, res) => res.json(spec));
  app.use('/api/docs', gate, swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'CrossCoin API Docs',
    swaggerOptions: { tryItOutEnabled: true, persistAuthorization: true },
  }));
}

module.exports = { spec, mountSwagger };
