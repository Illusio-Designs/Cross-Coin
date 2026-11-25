const express = require("express");
const router = express.Router();
const { authenticate, isOrderManager, isAdmin } = require("../middleware/authMiddleware.js");

// Store-wide order and money data, so admin + order managers only.
// Home "today": work queues, pipeline, headline numbers and recent activity.
router.get("/today", authenticate, isOrderManager, async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId, 10) || null;
    const data = await require("../services/homeTodayService.js").getToday({ brandId });
    res.json({ success: true, ...data });
  } catch (error) {
    require("../config/logging.js").logger.error("dashboard today failed: " + error.message);
    res.status(500).json({ success: false, message: "Failed to load today's dashboard" });
  }
});

async function walletBalances(req, res) {
  const wallet = require('../services/providerWalletService.js');
  try {
    if (req.method === 'PUT') {
      await wallet.saveBalance(req.body || {}, req.user?.id);
      return res.json({ success: true });
    }
    const balances = await wallet.listBalances(req.query.brandId);
    res.json({ success: true, balances });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    require('../config/logging.js').logger.error('Dashboard wallet balances failed: ' + error.message);
    res.status(500).json({ message: 'Wallet balances could not be loaded or saved.' });
  }
}

router.route('/wallet-balances').all(authenticate, isAdmin).get(walletBalances).put(walletBalances);

module.exports = router;
