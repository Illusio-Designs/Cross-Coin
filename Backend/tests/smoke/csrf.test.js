/**
 * Smoke tests for the CSRF token endpoint helpers (double-submit cookie
 * pattern). The server-side enforcement middleware was removed as unused;
 * only token issuance remains.
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { issueToken, csrfTokenHandler } = require('../../middleware/csrf.js');

function makeReqRes({ method = 'POST', headers = {}, cookies = {} } = {}) {
  const req = { method, headers, cookies, path: '/api/test' };
  const res = {
    statusCode: 200, body: null, cookies: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(name, value, opts) { this.cookies[name] = { value, opts }; return this; },
  };
  return { req, res };
}

describe('CSRF token issuance', () => {
  test('issueToken sets cookie and returns hex token', () => {
    const { req, res } = makeReqRes();
    const token = issueToken(req, res);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(res.cookies.cc_csrf.value).toBe(token);
  });

  test('csrfTokenHandler returns the token and header name in JSON', () => {
    const { req, res } = makeReqRes({ method: 'GET' });
    csrfTokenHandler(req, res);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    expect(res.cookies.cc_csrf.value).toBe(res.body.data.csrfToken);
  });
});
