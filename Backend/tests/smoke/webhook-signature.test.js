/**
 * Smoke tests for webhook HMAC verification middleware.
 *
 * These don't spin up Express — they call the middleware with
 * synthetic req/res/next and assert correct accept/reject paths.
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const crypto = require('crypto');
const { verifyWebhookSignature } = require('../../middleware/webhookSignature.js');

function makeReqResNext(headers = {}, rawBody = Buffer.from('{}', 'utf8')) {
  const req = { headers, rawBody };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    body: null,
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('verifyWebhookSignature', () => {
  afterEach(() => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    delete process.env.FSHIP_WEBHOOK_SECRET;
  });

  test('throws on unknown source', () => {
    expect(() => verifyWebhookSignature('not-a-real-source')).toThrow(/Unknown webhook source/);
  });

  test('accepts request when no secret is configured (transitional fail-open)', () => {
    const mw = verifyWebhookSignature('whatsapp');
    const { req, res, next } = makeReqResNext();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejects with 401 when signature header is missing AND a secret is set', () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'super-secret';
    const mw = verifyWebhookSignature('whatsapp');
    const { req, res, next } = makeReqResNext();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test('rejects with 401 on signature mismatch', () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'super-secret';
    const mw = verifyWebhookSignature('whatsapp');
    const { req, res, next } = makeReqResNext({ 'x-hub-signature-256': 'sha256=deadbeef' });
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test('accepts request when computed HMAC matches header', () => {
    const secret = 'super-secret';
    const body = Buffer.from(JSON.stringify({ ok: true }), 'utf8');
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    process.env.WHATSAPP_WEBHOOK_SECRET = secret;
    const mw = verifyWebhookSignature('whatsapp');
    const { req, res, next } = makeReqResNext({ 'x-hub-signature-256': sig }, body);
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('FShip variant uses bare hex (no sha256= prefix)', () => {
    const secret = 'fship-secret';
    const body = Buffer.from('{"order":"1"}', 'utf8');
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    process.env.FSHIP_WEBHOOK_SECRET = secret;
    const mw = verifyWebhookSignature('fship');
    const { req, res, next } = makeReqResNext({ 'x-fship-signature': sig }, body);
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
