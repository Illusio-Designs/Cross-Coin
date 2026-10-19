const express = require('express');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');
const ndrService = require('../services/ndrService.js');
const { logger } = require('../config/logging.js');

// Failed deliveries (courier NDR cases). The Dashboard reads them through
// /api/admin/exceptions (Orders → Problems); the actions live here.
const router = express.Router();

router.get('/', isAuthenticated, isOrderManager, async (req, res) => {
  try {
    const cases = await ndrService.listCases({
      status: req.query.status === 'all' ? 'all' : 'open',
      orderId: req.query.order_id || null,
      brandId: req.query.brandId || req.query.brand_id || null,
    });
    res.json({ success: true, cases });
  } catch (e) {
    logger.error('NDR list failed: ' + e.message);
    res.status(500).json({ success: false, message: 'Failed to load failed deliveries' });
  }
});

const validDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : undefined);

// Ask the courier to reattempt delivery or return the parcel (RTO).
router.post('/:id/courier', isAuthenticated, isOrderManager, async (req, res) => {
  const action = req.body.action === 'rto' ? 'rto' : 'reattempt';
  try {
    const c = await ndrService.getCase(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    if (c.status === 'closed') return res.status(400).json({ success: false, message: 'This case is already closed.' });
    const date = validDate(req.body.date);
    await ndrService.sendToCourier(c, action, date ? { reattempt_date: date } : {}, req.user.id);
    res.json({
      success: true,
      message: action === 'rto'
        ? 'RTO requested at iThink. It stays here until the courier confirms.'
        : 'Reattempt requested at iThink. It stays here until the courier’s next attempt.',
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: `iThink did not accept it automatically: ${e.message}. Do it in the iThink panel (NDR section), then press Mark done.`,
    });
  }
});

// Staff typed (or confirmed) a new delivery address. Creates a new address
// row for the order; with reattempt=true also asks the courier to try again.
router.post('/:id/address', isAuthenticated, isOrderManager, async (req, res) => {
  try {
    const c = await ndrService.getCase(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    if (c.status === 'closed') return res.status(400).json({ success: false, message: 'This case is already closed.' });
    const text = String(req.body.address || '').trim();
    let saved = null;
    // Re-sending the address the customer already gave (and that is already
    // on the order) must not create another copy.
    if (!(req.body.useSaved && c.new_shipping_address_id)) {
      saved = await ndrService.setCaseAddress(c, text, { actorId: req.user.id, source: 'staff' });
      if (!saved.ok) return res.status(400).json({ success: false, message: saved.message });
    }
    const note = saved && saved.flag ? ` ${saved.flag}` : '';
    if (req.body.reattempt) {
      const date = validDate(req.body.date);
      try {
        await ndrService.sendToCourier(await ndrService.getCase(c.id), 'reattempt', date ? { reattempt_date: date } : {}, req.user.id);
      } catch (e) {
        return res.status(400).json({
          success: false,
          addressSaved: true,
          message: `Address saved on the order, but iThink did not accept the reattempt: ${e.message}. Do it in the iThink panel, then press Mark done.${note}`,
        });
      }
      return res.json({
        success: true,
        message: `Reattempt requested. Also update the address in the iThink panel (NDR → edit address) — their API can’t change it.${note}`,
      });
    }
    res.json({ success: true, message: `New address saved on the order.${note}` });
  } catch (e) {
    logger.error('NDR address failed: ' + e.message);
    res.status(500).json({ success: false, message: 'Failed to save the address' });
  }
});

// Staff handled it in the courier panel (or it needs no action).
router.post('/:id/resolve', isAuthenticated, isOrderManager, async (req, res) => {
  try {
    const c = await ndrService.getCase(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    await ndrService.resolveManually(c.id, req.body.note || 'Updated in iThink panel', req.user.id);
    res.json({ success: true, message: 'Marked done.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update case' });
  }
});

module.exports = router;
