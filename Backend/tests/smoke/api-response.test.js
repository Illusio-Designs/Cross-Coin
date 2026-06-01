/**
 * Smoke tests for the standard API response envelope.
 *
 * These guard the contract that the frontend relies on:
 *   - .success boolean is always present
 *   - error responses are uniform across all helpers
 */

const apiResponse = require('../../utils/apiResponse.js');

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('apiResponse', () => {
  test('ok() sends success=true with data', () => {
    const res = makeRes();
    apiResponse.ok(res, { hello: 'world' });
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ hello: 'world' });
    expect(res.body.error).toBeNull();
  });

  test('created() returns 201', () => {
    const res = makeRes();
    apiResponse.created(res, { id: 7 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('badRequest() returns 400 with success=false', () => {
    const res = makeRes();
    apiResponse.badRequest(res, 'Missing field');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Missing field');
  });

  test('notFound() returns 404', () => {
    const res = makeRes();
    apiResponse.notFound(res, 'Order not found');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  test('conflict() returns 409', () => {
    const res = makeRes();
    apiResponse.conflict(res, 'Duplicate SKU');
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('serverError() returns 500', () => {
    const res = makeRes();
    apiResponse.serverError(res, 'DB down');
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('every helper includes success boolean', () => {
    const helpers = ['ok', 'created', 'badRequest', 'unauthorized', 'forbidden', 'notFound', 'conflict', 'serverError'];
    for (const name of helpers) {
      const res = makeRes();
      apiResponse[name](res, 'msg');
      expect(typeof res.body.success).toBe('boolean');
    }
  });
});
