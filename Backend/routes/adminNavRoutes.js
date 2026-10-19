const express = require('express');
const router = express.Router();
const { authenticate, isStaff, hasAnyRole } = require('../middleware/authMiddleware.js');
const { logger } = require('../config/logging.js');

// Which menu badge each role may see — the same roles the Dashboard menu
// (components/Sidebar/menu.js) uses to show the page the badge sits on.
const BADGE_ROLES = {
  orders:   ['admin', 'order_manager'],   // Orders: COD orders to confirm
  problems: ['admin', 'order_manager'],   // Problems: the Orders → Problems tab total
  reviews:  ['admin', 'order_manager'],   // Reviews waiting for approval
  whatsapp: ['admin', 'whatsapp_manager'], // chats with unread messages
  products: ['admin', 'product_manager'], // sizes out of stock (active products)
  health:   ['admin'],                    // scheduled jobs with a failed run in 24 h
};

// GET /api/admin/nav-counts?brandId= — small numbers for the menu badges.
// Only counts for pages the user can open; brandId absent/'' = all brands.
router.get('/', authenticate, isStaff, async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId, 10) || null;
    const keys = Object.keys(BADGE_ROLES).filter((k) => hasAnyRole(req.user, BADGE_ROLES[k]));
    const counts = await require('../services/homeTodayService.js').getNavCounts({ brandId, keys });
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, counts });
  } catch (error) {
    logger.error('nav counts failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Couldn’t load the menu counts' });
  }
});

module.exports = router;
