const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controller/dashboardController.js");
const { authenticate, isOrderManager } = require("../middleware/authMiddleware.js");

// Dashboard stats = store-wide revenue + order reporting, so it's gated to the
// roles that are allowed to see the financial/order data (admin + order_manager).
// Previously this was open to ALL staff (isStaff), which let WhatsApp / product
// managers pull store revenue via the reporting home. The frontend now only
// calls this for those two roles; this makes the server enforce the same.
router.get("/stats", authenticate, isOrderManager, getDashboardStats);

module.exports = router;
