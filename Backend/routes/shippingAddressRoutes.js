const express = require("express");
const {
  createShippingAddress,
  getUserShippingAddresses,
  getShippingAddressById,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultShippingAddress,
  createGuestShippingAddress,
  getGuestShippingAddresses,
} = require("../controller/shippingAddressController.js");
const { isAuthenticated } = require("../middleware/authMiddleware.js");

const router = express.Router();

// Guest routes (no authentication required)
// POST /api/shipping-addresses/guest - Create guest address
router.post("/guest", createGuestShippingAddress);
// GET /api/shipping-addresses/guest - Get guest addresses
router.get("/guest", getGuestShippingAddresses);

// Authenticated routes
// POST /api/shipping-addresses - Create new address
router.post("/", isAuthenticated, createShippingAddress);
// GET /api/shipping-addresses - Get all addresses for user
router.get("/", isAuthenticated, getUserShippingAddresses);
// GET /api/shipping-addresses/:id - Get address by ID
router.get("/:id", isAuthenticated, getShippingAddressById);
// PUT /api/shipping-addresses/:id - Update address
router.put("/:id", isAuthenticated, updateShippingAddress);
// DELETE /api/shipping-addresses/:id - Delete address
router.delete("/:id", isAuthenticated, deleteShippingAddress);
// PUT /api/shipping-addresses/:id/default - Set default address
router.put("/:id/default", isAuthenticated, setDefaultShippingAddress);

module.exports = router;
