const express = require('express');
const router = express.Router();
const ctrl = require('../controller/customCheckoutController.js');
const { authenticate, isAdmin } = require('../middleware/authMiddleware.js');

// Storefront calls: the store must be named — X-Brand-Name header (e.g. `X-Brand-Name: velmique`),
// or ?brand=<slug> where a header can't be set. A missing or unknown store is
// an error — never another store's catalog or orders.
function brandRequired(req, res, next) {
  if (req.brand && req.brandId) return next();
  const sent = req.headers['x-brand-name'] || req.query.brand;
  return res.status(400).json({
    success: false,
    message: sent
      ? `Unknown store "${String(sent).slice(0, 40)}" in X-Brand-Name`
      : 'Send the store in the X-Brand-Name header, e.g. X-Brand-Name: velmique',
  });
}

// Calls FROM Shiprocket (catalog pulls, order webhook) must carry the store's
// own Shiprocket keys, saved per brand in Brand settings → Custom checkout:
//   X-Api-Key: <API key>                      (required)
//   X-Api-Secret: <secret>                    (or, instead of sending it,)
//   X-Api-HMAC-SHA256: base64 HMAC-SHA256 of the raw body (query string for
//                      a GET) keyed with the secret
// The store comes from X-Brand-Name / ?brand=, or — when neither is sent —
// from whichever brand the API key belongs to.
const crypto = require('crypto');
const { Brand } = require('../model/associations.js');
const svc = require('../services/customCheckoutService.js');

const same = (a, b) => {
  const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmacOf = (secret, data) => crypto.createHmac('sha256', secret).update(data, 'utf8').digest('base64');

async function providerAuth(req, res, next) {
  try {
    const key = String(req.headers['x-api-key'] || '').trim();
    if (!req.brand && key) {
      // No store named: find the brand this API key belongs to.
      const brands = await Brand.findAll({ where: { status: 'active' }, attributes: ['id', 'slug', 'name'] });
      for (const b of brands) {
        const cfg = await svc.getPushConfig(b.id);
        if (cfg && same(cfg.apiKey, key)) { req.brand = b; req.brandId = b.id; break; }
      }
    }
    if (!req.brand || !req.brandId) {
      const sent = req.headers['x-brand-name'] || req.query.brand;
      return res.status(sent ? 400 : 401).json({
        success: false,
        message: sent ? `Unknown store "${String(sent).slice(0, 40)}" in X-Brand-Name`
          : 'Send X-Api-Key (and X-Brand-Name, e.g. velmique)',
      });
    }
    const cfg = await svc.getPushConfig(req.brandId);
    if (!cfg) {
      return res.status(403).json({ success: false, message: 'Shiprocket keys are not saved for this store (Brand settings → Custom checkout)' });
    }
    if (!same(cfg.apiKey, key)) {
      return res.status(401).json({ success: false, message: key ? 'Wrong X-Api-Key for this store' : 'X-Api-Key is required' });
    }
    const secretHdr = String(req.headers['x-api-secret'] || '').trim();
    const sig = String(req.headers['x-api-hmac-sha256'] || '').trim();
    const raw = req.rawBody ? req.rawBody.toString('utf8') : '';
    const query = (req.originalUrl || '').split('?')[1] || '';
    const sigOk = sig && [raw, query, ''].some((d) => same(hmacOf(cfg.secret, d), sig));
    if (!(secretHdr && same(cfg.secret, secretHdr)) && !sigOk) {
      return res.status(401).json({ success: false, message: (secretHdr || sig) ? 'Wrong secret / signature for this store' : 'X-Api-Secret (or X-Api-HMAC-SHA256) is required' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not check the Shiprocket keys' });
  }
}

// ── Seller catalog URLs the checkout provider pulls (store's keys required) ─
router.get('/products', providerAuth, ctrl.listProducts);
router.get('/collections', providerAuth, ctrl.listCollections);
router.get('/collection-products', providerAuth, ctrl.listCollectionProducts);
router.get('/points', providerAuth, ctrl.getPoints);

// ── Storefront: create a checkout access token (secret stays server-side) ──
router.get('/status', brandRequired, ctrl.status);
router.post('/token', brandRequired, ctrl.createToken);

// ── Provider → seller: order webhook (store's keys required) ──────────────
router.post('/order-webhook', providerAuth, ctrl.orderWebhook);

// ── Storefront: back from the provider's page → confirm + Purchase ────────
router.post('/confirm', brandRequired, ctrl.confirmReturn);

// ── Admin utilities ────────────────────────────────────────────────────────
router.get('/orders', authenticate, isAdmin, ctrl.orderList);
router.get('/orders/:orderId', authenticate, isAdmin, ctrl.orderDetails);
router.post('/sync/product/:id', authenticate, isAdmin, ctrl.syncProduct);
router.post('/sync/collection/:id', authenticate, isAdmin, ctrl.syncCollection);
router.post('/refund/initiate', authenticate, isAdmin, ctrl.refundInitiate);
router.post('/refund/reports', authenticate, isAdmin, ctrl.refundReports);

module.exports = router;
