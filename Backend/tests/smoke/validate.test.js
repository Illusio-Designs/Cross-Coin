/**
 * Smoke tests for the Zod-backed request validation middleware.
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { validate, validateBody, z, schemas } = require('../../middleware/validate.js');

function makeReqResNext(body = {}, query = {}, params = {}) {
  const req = { body, query, params, method: 'POST', path: '/api/test' };
  const res = {
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  test('passes valid body through and replaces with parsed value', () => {
    const schema = z.object({
      name: z.string().trim().min(1),
      age: z.coerce.number().int().positive(),
    });
    const { req, res, next } = makeReqResNext({ name: '  Alice  ', age: '30' });
    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.name).toBe('Alice');
    expect(req.body.age).toBe(30); // coerced from string
  });

  test('rejects missing required field with 400 + envelope', () => {
    const schema = z.object({ email: schemas.email });
    const { req, res, next } = makeReqResNext({});
    validateBody(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  test('indianPhone schema accepts 10-digit numbers + 91-prefixed', () => {
    expect(schemas.indianPhone.safeParse('9876543210').success).toBe(true);
    expect(schemas.indianPhone.safeParse('919876543210').success).toBe(true);
    expect(schemas.indianPhone.safeParse('+919876543210').success).toBe(true);
    expect(schemas.indianPhone.safeParse('12345').success).toBe(false);
  });

  test('indianPincode schema enforces 6 digits exactly', () => {
    expect(schemas.indianPincode.safeParse('395006').success).toBe(true);
    expect(schemas.indianPincode.safeParse('12345').success).toBe(false);
    expect(schemas.indianPincode.safeParse('abcdef').success).toBe(false);
  });

  test('validate handles body + query + params together', () => {
    const mw = validate({
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.coerce.number().int() }),
      params: z.object({ id: z.coerce.number().int() }),
    });
    const { req, res, next } = makeReqResNext({ name: 'x' }, { page: '5' }, { id: '42' });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.page).toBe(5);
    expect(req.params.id).toBe(42);
  });

  test('first error message is bubbled to error.message for UX', () => {
    const schema = z.object({
      email: schemas.email,
      pincode: schemas.indianPincode,
    });
    const { req, res, next } = makeReqResNext({ email: 'not-an-email', pincode: '12' });
    validateBody(schema)(req, res, next);
    expect(res.statusCode).toBe(400);
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.error.message.length).toBeGreaterThan(0);
  });
});
