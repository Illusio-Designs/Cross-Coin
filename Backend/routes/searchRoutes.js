const express = require('express');
const router = express.Router();
const { authenticate, isStaff, hasAnyRole } = require('../middleware/authMiddleware.js');
const { globalSearch } = require('../services/globalSearchService.js');

// GET /api/search?q= — Dashboard "Search everything" (Ctrl/Cmd+K).
// Only the groups the caller's roles may open are searched and returned:
//   orders / returns / customers → admin + order_manager
//   WhatsApp chats               → admin + whatsapp_manager
router.get('/', authenticate, isStaff, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const scope = {
    orders: hasAnyRole(req.user, ['admin', 'order_manager']),
    chats: hasAnyRole(req.user, ['admin', 'whatsapp_manager']),
  };
  res.set('Cache-Control', 'no-store');
  try {
    const result = await globalSearch(q, scope);
    res.json({ success: true, q: result.q, scope, groups: result.groups });
  } catch (error) {
    require('../config/logging.js').logger.error('global search failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

module.exports = router;
