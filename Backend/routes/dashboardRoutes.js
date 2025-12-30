const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controller/dashboardController.js");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware.js");

// Get dashboard statistics (admin only)
router.get("/stats", authenticateToken, requireAdmin, getDashboardStats);

module.exports = router;
