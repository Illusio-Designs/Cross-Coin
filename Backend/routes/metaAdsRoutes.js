const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');
const { logger } = require('../config/logging.js');
const metaAds = require('../services/metaAdsService.js');

// Meta ad spend connection (Reports → Ads). Admin only: spend is money data.
// The token is never sent back — only where it comes from and "••••1234".

// GET /api/admin/meta-ads/connection[?refresh=1]
router.get('/connection', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const data = await metaAds.getConnection({ refresh: req.query.refresh === '1' || req.query.refresh === 'true' });
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, ...data });
  } catch (error) {
    logger.error('Meta ads connection error: ' + metaAds.scrub(error.message));
    return res.status(500).json({ success: false, message: 'Couldn’t load the Meta connection' });
  }
});

// PUT /api/admin/meta-ads/connection  { token?, mapping?: [{ accountId, brandId|null }] }
router.put('/connection', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const out = { success: true };
    if (body.token !== undefined && body.token !== null && String(body.token).trim() !== '') {
      const t = await metaAds.saveToken(body.token, req.user?.id);
      if (!t.ok) return res.status(400).json({ success: false, field: 'token', message: t.message });
      out.token = { saved: true, accounts: t.accounts, message: t.message };
    }
    if (body.mapping !== undefined) {
      const m = await metaAds.saveMapping(body.mapping, req.user?.id);
      if (!m.ok) return res.status(400).json({ success: false, field: 'mapping', message: m.message });
      out.mapping = { changed: m.changed };
    }
    const data = await metaAds.getConnection({ refresh: !!out.token });
    return res.json({ ...out, ...data });
  } catch (error) {
    logger.error('Meta ads connection save error: ' + metaAds.scrub(error.message));
    return res.status(500).json({ success: false, message: 'Couldn’t save the Meta connection' });
  }
});

// POST /api/admin/meta-ads/sync  { days? } — runs the sync now, through the
// same logged, locked wrapper as the 3-hourly job (System health shows it).
router.post('/sync', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const days = req.body && req.body.days ? Number.parseInt(req.body.days, 10) : null;
    const { runLogged } = require('../services/jobRunService.js');
    let detail = null;
    const run = await runLogged('meta-ads-sync', async () => {
      detail = await metaAds.syncAll({ days });
      return detail;
    }, { lockMinutes: 30, triggeredBy: req.user?.id || null });
    if (run && run.busy) return res.status(409).json({ success: false, message: 'A sync is running right now. Try again in a minute.' });
    return res.json({
      success: true,
      status: run.status,
      summary: run.summary,
      error: run.error || null,
      rateLimited: !!detail?.rateLimited,
      accounts: (detail?.accounts || []).map((a) => ({
        accountId: a.accountId, brandId: a.brandId, since: a.since || null, until: a.until || null, kind: a.kind || null,
        rows: a.rows ?? null, removed: a.removed ?? null, spend: a.spend ?? null, currency: a.currency || null, error: a.error || null,
      })),
    });
  } catch (error) {
    logger.error('Meta ads sync error: ' + metaAds.scrub(error.message));
    return res.status(500).json({ success: false, message: 'The sync failed to start' });
  }
});

module.exports = router;
