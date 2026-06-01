/**
 * Zod-backed request validation middleware.
 *
 * Replaces the per-controller `if (!field) return 400` pattern with a
 * declarative schema applied at the route layer. Three flavours:
 *
 *   validate({ body, query, params })   — validate any subset
 *   validateBody(schema)                 — shorthand for body-only
 *   validateQuery(schema)                — shorthand for query-only
 *
 * Behavior:
 *   - On success: replaces req.body / req.query / req.params with the
 *     PARSED (= coerced + defaulted) value so downstream code reads
 *     typed fields instead of strings.
 *   - On failure: 400 with the standard envelope
 *       { success: false, error: { code: 'VALIDATION_ERROR', message,
 *         details: [{ path, message }] } }
 *
 * Why Zod and not Joi: smaller bundle, native TS support if we ever
 * port a service, schema reuse between frontend + backend is trivial.
 */

const { z } = require('zod');
const { logger } = require('../config/logging.js');

function formatIssues(err) {
  if (!err || !err.issues) return [];
  return err.issues.map((i) => ({
    path: Array.isArray(i.path) ? i.path.join('.') : String(i.path || ''),
    message: i.message,
    code: i.code,
  }));
}

function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) req.query = schemas.query.parse(req.query ?? {});
      if (schemas.params) req.params = schemas.params.parse(req.params ?? {});
      return next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const details = formatIssues(err);
        logger.debug(`[validate] rejected ${req.method} ${req.path}: ${JSON.stringify(details)}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: details[0]?.message || 'Request payload is invalid',
            details,
          },
        });
      }
      logger.error('[validate] non-Zod error:', err.message);
      return res.status(500).json({ success: false, message: 'Validation pipeline failure' });
    }
  };
}

const validateBody = (schema) => validate({ body: schema });
const validateQuery = (schema) => validate({ query: schema });
const validateParams = (schema) => validate({ params: schema });

// ── Reusable atomic schemas ───────────────────────────────────────────
const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?91)?\d{10}$/, 'Phone must be a 10-digit Indian number');

const indianPincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits');

const emailSchema = z.string().trim().toLowerCase().email('Email is not valid');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

const positiveIntSchema = z.coerce.number().int().positive();
const nonNegativeIntSchema = z.coerce.number().int().nonnegative();

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  z,
  schemas: {
    indianPhone: indianPhoneSchema,
    indianPincode: indianPincodeSchema,
    email: emailSchema,
    password: passwordSchema,
    positiveInt: positiveIntSchema,
    nonNegativeInt: nonNegativeIntSchema,
  },
};
