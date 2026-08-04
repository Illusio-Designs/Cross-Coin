const express = require('express');
const router = express.Router();
const {
  sendPhoneOtp,
  verifyPhoneOtp,
  initiateCheckout,
  retryCheckout,
  initiateGuestCheckout,
} = require('../controller/checkoutController.js');
const { isAuthenticated } = require('../middleware/authMiddleware.js');
const { validateBody, z, schemas: zSchemas } = require('../middleware/validate.js');

// ── Zod schemas ────────────────────────────────────────────────────
// initiateCheckout takes a heavy payload (items, address ID, coupons,
// UTM session, idempotency key). passthrough() keeps it flexible while
// still rejecting empty bodies and obviously-bad shapes.
const checkoutItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  variation_id: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
}).passthrough();

// shared base; the authenticated /initiate endpoint extends this with
// a required shipping_address_id, the guest endpoint allows either an
// id or an inline shipping_address object.
const initiateBaseSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required'),
  payment_type: z.enum(['prepaid', 'razorpay']).optional(),
  coupon_id: z.coerce.number().int().positive().optional().nullable(),
  discount_amount: z.coerce.number().nonnegative().optional(),
  utm_session_id: z.string().trim().max(200).optional(),
  idempotency_key: z.string().trim().max(200).optional(),
}).passthrough();

const initiateSchema = initiateBaseSchema.merge(z.object({
  shipping_address_id: z.coerce.number().int().positive(),
}));

const retrySchema = z.object({
  order_id: z.coerce.number().int().positive().optional(),
  reservation_id: z.string().trim().min(1).optional(),
}).passthrough().refine((v) => v.order_id || v.reservation_id, {
  message: 'order_id or reservation_id is required',
  path: ['order_id'],
});

// Guests don't have saved shipping addresses, so they POST an inline
// `shipping_address` object that the controller turns into a row
// before continuing. The shipping_address_id is therefore optional
// here; the .refine() at the end ensures at least one of the two
// shapes is present so we still reject empty/malformed bodies.
const guestShippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().trim().min(4).max(10),
  phone: z.string().trim().min(10).max(20).optional(),
  country: z.string().trim().max(100).optional(),
}).passthrough();

const guestInitiateSchema = initiateBaseSchema.merge(z.object({
  guest_info: z.object({
    email: zSchemas.email,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).optional(),
    phone: zSchemas.indianPhone,
  }),
  shipping_address_id: z.coerce.number().int().positive().optional(),
  shipping_address: guestShippingAddressSchema.optional(),
})).passthrough().refine(
  (v) => v.shipping_address_id || v.shipping_address,
  { message: 'shipping_address_id or shipping_address is required', path: ['shipping_address'] }
);

const otpSendSchema = z.object({
  phone: zSchemas.indianPhone,
});

const otpVerifySchema = z.object({
  phone: zSchemas.indianPhone,
  otp: z.string().trim().regex(/^\d{4,8}$/, 'OTP must be 4-8 digits'),
});

// OTP endpoints — mounted under /auth
router.post('/otp/send', validateBody(otpSendSchema), sendPhoneOtp);
router.post('/otp/verify', validateBody(otpVerifySchema), verifyPhoneOtp);

// Payment-first checkout (prepaid)
router.post('/initiate', isAuthenticated, validateBody(initiateSchema), initiateCheckout);
router.post('/retry', isAuthenticated, validateBody(retrySchema), retryCheckout);
router.post('/guest/initiate', validateBody(guestInitiateSchema), initiateGuestCheckout);

module.exports = router;
