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
const { validateBody, z, schemas } = require("../middleware/validate.js");

const router = express.Router();

// ── Validation schemas ───────────────────────────────────────────────
// Shared address shape used by both authenticated and guest POSTs.
const shippingAddressBase = {
  address: z.string().trim().min(10, 'Address is too short (min 10 chars)').max(500),
  landmark: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(2, 'City is too short').max(100),
  state: z.string().trim().min(2).max(100),
  postal_code: schemas.indianPincode,
  country: z.string().trim().max(100).default('India'),
  phone_number: schemas.indianPhone,
};

const createAddressSchema = z.object({
  ...shippingAddressBase,
  full_name: z.string().trim().min(2).max(255).optional(),
  is_default: z.coerce.boolean().optional(),
});

const updateAddressSchema = z.object({
  address: z.string().trim().min(10).max(500).optional(),
  landmark: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  postal_code: schemas.indianPincode.optional(),
  country: z.string().trim().max(100).optional(),
  phone_number: schemas.indianPhone.optional(),
  is_default: z.coerce.boolean().optional(),
});

const guestAddressSchema = z.object({
  ...shippingAddressBase,
  guest_info: z.object({
    email: schemas.email,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).optional(),
  }),
});

// ── Routes ───────────────────────────────────────────────────────────
// Guest routes (no authentication required)
router.post("/guest", validateBody(guestAddressSchema), createGuestShippingAddress);
router.get("/guest", getGuestShippingAddresses);

// Authenticated routes
router.post("/", isAuthenticated, validateBody(createAddressSchema), createShippingAddress);
router.get("/", isAuthenticated, getUserShippingAddresses);
router.get("/:id", isAuthenticated, getShippingAddressById);
router.put("/:id", isAuthenticated, validateBody(updateAddressSchema), updateShippingAddress);
router.delete("/:id", isAuthenticated, deleteShippingAddress);
router.put("/:id/default", isAuthenticated, setDefaultShippingAddress);

module.exports = router;
