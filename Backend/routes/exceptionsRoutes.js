const express = require('express');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');
const exceptions = require('../services/exceptionsService.js');
const { upload, validateMagicBytes } = require('../middleware/uploadMiddleware.js');
const { logger } = require('../config/logging.js');

// Dashboard → Orders → Problems: failed deliveries, returns and refunds due
// in one queue. Actions use the existing /api/ndr, /api/returns and
// /api/orders/:id/refund endpoints.
const router = express.Router();
router.use(isAuthenticated, isOrderManager);

const brandParam = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// GET /api/admin/exceptions?type=all|ndr|return|refund&brandId=&q=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const data = await exceptions.listQueue({
      type: String(req.query.type || 'all'),
      brandId: brandParam(req.query.brandId),
      search: String(req.query.q || '').slice(0, 80),
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...data });
  } catch (e) {
    logger.error('Exceptions queue failed: ' + e.message);
    res.status(500).json({ success: false, message: 'Couldn’t load the problems queue' });
  }
});

// Return-charge presets used by the refund calculator (per brand).
router.get('/return-charges', async (req, res) => {
  try {
    const brandId = brandParam(req.query.brandId) || 1;
    res.json({ success: true, brandId, charges: await exceptions.getReturnCharges(brandId) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Couldn’t load return charges' });
  }
});

router.put('/return-charges', async (req, res) => {
  try {
    const brandId = brandParam(req.body.brandId);
    if (!brandId) return res.status(400).json({ success: false, message: 'Pick a brand first.' });
    const charges = await exceptions.setReturnCharges(brandId, req.body || {});
    res.json({ success: true, brandId, charges, message: 'Return charges saved for this brand.' });
  } catch (e) {
    res.status(e.status || 500).json({ success: false, message: e.status ? e.message : 'Couldn’t save return charges' });
  }
});

// POST /api/admin/exceptions/:src/:id/clear — clear a refund case by hand
// (src = order | return). Multipart: message + proof (image).
router.post('/:src/:id/clear', upload.single('proof'), validateMagicBytes, async (req, res) => {
  try {
    const [proofPath] = req.file ? await require('../controller/returnController.js').storeUploads([req.file], '/refund-proofs') : [];
    const r = await exceptions.clearRefundCase(req.params.src, req.params.id, {
      message: req.body?.message, proofPath, adminId: req.user?.id,
    });
    res.json({ success: true, ...r });
  } catch (e) {
    if (!e.status) logger.error(`Clear refund case ${req.params.src}/${req.params.id} failed: ${e.message}`);
    res.status(e.status || 500).json({ success: false, message: e.status ? e.message : 'Couldn’t clear this case' });
  }
});

// GET /api/admin/exceptions/:src/:id — src = ndr | return | order (failed refund)
router.get('/:src/:id', async (req, res) => {
  try {
    const d = await exceptions.getDetail(req.params.src, req.params.id);
    if (!d) return res.status(404).json({ success: false, message: 'Not found — it may have been sorted already.' });
    res.json({ success: true, item: d });
  } catch (e) {
    logger.error(`Exception detail ${req.params.src}/${req.params.id} failed: ${e.message}`);
    res.status(500).json({ success: false, message: 'Couldn’t load this item' });
  }
});

module.exports = router;
