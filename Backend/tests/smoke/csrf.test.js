/**
 * Smoke tests for CSRF middleware (double-submit cookie pattern).
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { issueToken, requireCsrf } = require('../../middleware/csrf.js');

function makeReqResNext({ method = 'POST', headers = {}, cookies = {} } = {}) {
  const req = { method, headers, cookies, path: '/api/test' };
  const res = {
    statusCode: 200, body: null, cookies: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(name, value, opts) { this.cookies[name] = { value, opts }; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('CSRF middleware', () => {
  afterEach(() => { delete process.env.CSRF_REQUIRED; });

  test('issueToken sets cookie and returns hex token', () => {
    const { req, res } = makeReqResNext();
    const token = issueToken(req, res);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(res.cookies.cc_csrf.value).toBe(token);
  });

  test('requireCsrf is a no-op for GET requests', () => {
    process.env.CSRF_REQUIRED = 'true';
    const { req, res, next } = makeReqResNext({ method: 'GET' });
    requireCsrf(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('requireCsrf is a no-op when CSRF_REQUIRED is not set', () => {
    const { req, res, next } = makeReqResNext({ method: 'POST' });
    requireCsrf(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('requireCsrf rejects when header missing and enforcement is on', () => {
    process.env.CSRF_REQUIRED = 'true';
    const { req, res, next } = makeReqResNext({
      method: 'POST',
      cookies: { cc_csrf: 'a'.repeat(64) },
    });
    requireCsrf(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  test('requireCsrf rejects on token mismatch', () => {
    process.env.CSRF_REQUIRED = 'true';
    const { req, res, next } = makeReqResNext({
      method: 'POST',
      cookies: { cc_csrf: 'a'.repeat(64) },
      headers: { 'x-csrf-token': 'b'.repeat(64) },
    });
    requireCsrf(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  test('requireCsrf accepts when cookie + header match', () => {
    process.env.CSRF_REQUIRED = 'true';
    const t = 'c'.repeat(64);
    const { req, res, next } = makeReqResNext({
      method: 'POST',
      cookies: { cc_csrf: t },
      headers: { 'x-csrf-token': t },
    });
    requireCsrf(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
