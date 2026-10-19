const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isOrderManager } = require('../middleware/authMiddleware');
const { logger } = require('../config/logging.js');
const { listCustomers, streamCustomersCsv } = require('../services/customerListService');

// GET /api/admin/customers?q=&brandId=&segment=all|repeat|vip|lapsed|risky|leads&sort=spent|recent|newest&page=&limit=25
// One row per shopper (registered, guest or lead) with orders / spend / RTO,
// plus the six segment counts for the same brand + search.
router.get('/', authenticate, isOrderManager, async (req, res) => {
  try {
    const data = await listCustomers(req.query);
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, ...data });
  } catch (error) {
    logger.error('Customer list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load customers' });
  }
});

// GET /api/admin/customers/export?<same filters> — CSV of the whole filtered
// list (all pages, capped at 50,000 rows). Admin only: it carries full
// phone numbers and emails.
router.get('/export', authenticate, isAdmin, async (req, res) => {
  try {
    await streamCustomersCsv(req.query, res);
  } catch (error) {
    logger.error('Customer export error:', error);
    if (!res.headersSent) return res.status(500).json({ success: false, message: 'Failed to export customers' });
    return res.end();
  }
});

module.exports = router;
