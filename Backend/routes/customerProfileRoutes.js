const express = require('express');
const router = express.Router();
const { authenticate, isOrderManager } = require('../middleware/authMiddleware');
const { logger } = require('../config/logging.js');
const { getCustomerProfile } = require('../services/customerProfileService');

// GET /api/customers/profile?kind=user|guest|phone&id=&phone=
// Everything about one shopper for the Dashboard customer page.
router.get('/profile', authenticate, isOrderManager, async (req, res) => {
  try {
    const kind = String(req.query.kind || '').toLowerCase();
    if (!['user', 'guest', 'phone'].includes(kind)) {
      return res.status(400).json({ success: false, message: 'kind must be user, guest or phone' });
    }
    // Guest ids from the Consumers list come as "g12" — keep the digits.
    const id = parseInt(String(req.query.id || '').replace(/\D/g, ''), 10);
    const phone = String(req.query.phone || '');
    if (kind !== 'phone' && !id) return res.status(400).json({ success: false, message: 'id is required' });
    if (kind === 'phone' && phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'A 10-digit phone is required' });
    }
    const profile = await getCustomerProfile({ kind, id, phone });
    if (!profile) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, ...profile });
  } catch (error) {
    logger.error('Customer profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load customer profile' });
  }
});

module.exports = router;
