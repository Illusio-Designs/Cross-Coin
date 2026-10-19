const express = require('express');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');
const ndrService = require('../services/ndrService.js');
const { logger } = require('../config/logging.js');

// Dashboard → Failed Deliveries (courier NDR cases).
const router = express.Router();

router.get('/', isAuthenticated, isOrderManager, async (req, res) => {
  try {
    const cases = await ndrService.listCases({
      status: req.query.status === 'all' ? 'all' : 'open',
      orderId: req.query.order_id || null,
    });
    res.json({ success: true, cases });
  } catch (e) {
    logger.error('NDR list failed: ' + e.message);
    res.status(500).json({ success: false, message: 'Failed to load failed deliveries' });
  }
});

// Ask the courier to reattempt delivery or return the parcel (RTO).
router.post('/:id/courier', isAuthenticated, isOrderManager, async (req, res) => {
  const action = req.body.action === 'rto' ? 'rto' : 'reattempt';
  try {
    const c = await ndrService.getCase(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    if (c.status === 'closed') return res.status(400).json({ success: false, message: 'This case is already closed.' });
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.date || '')) ? req.body.date : undefined;
    await ndrService.sendToCourier(c, action, date ? { reattempt_date: date } : {});
    res.json({ success: true, message: action === 'rto' ? 'RTO requested at iThink.' : 'Reattempt requested at iThink.' });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: `iThink did not accept it automatically: ${e.message}. Do it in the iThink panel (NDR section), then press Mark done.`,
    });
  }
});

// Staff handled it in the courier panel (or it needs no action).
router.post('/:id/resolve', isAuthenticated, isOrderManager, async (req, res) => {
  try {
    const c = await ndrService.getCase(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    await ndrService.resolveManually(c.id, req.body.note || 'Updated in iThink panel');
    res.json({ success: true, message: 'Marked done.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update case' });
  }
});

module.exports = router;
