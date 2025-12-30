const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controller/dashboardController.js");
const { authenticate, isAdmin } = require("../middleware/authMiddleware.js");

// Get dashboard statistics (admin only)
router.get("/stats", authenticate, isAdmin, getDashboardStats);

module.exports = router;
