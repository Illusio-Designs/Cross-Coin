const express = require("express");
const router = express.Router();
const { authenticate, isOrderManager } = require("../middleware/authMiddleware.js");

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

module.exports = router;
