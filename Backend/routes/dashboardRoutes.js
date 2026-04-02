const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controller/dashboardController.js");
const { authenticate, isAdmin, isStaff } = require("../middleware/authMiddleware.js");

// Dashboard stats — accessible to all staff roles
router.get("/stats", authenticate, isStaff, getDashboardStats);

module.exports = router;
