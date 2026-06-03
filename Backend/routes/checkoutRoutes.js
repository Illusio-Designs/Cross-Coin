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

const initiateSchema = z.object({
  shipping_address_id: z.coerce.number().int().positive(),
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required'),
  payment_type: z.enum(['prepaid', 'razorpay']).optional(),
  coupon_id: z.coerce.number().int().positive().optional().nullable(),
  discount_amount: z.coerce.number().nonnegative().optional(),
  utm_session_id: z.string().trim().max(200).optional(),
  idempotency_key: z.string().trim().max(200).optional(),
}).passthrough();

const retrySchema = z.object({
  order_id: z.coerce.number().int().positive().optional(),
  reservation_id: z.string().trim().min(1).optional(),
}).passthrough().refine((v) => v.order_id || v.reservation_id, {
  message: 'order_id or reservation_id is required',
  path: ['order_id'],
});

const guestInitiateSchema = initiateSchema.merge(z.object({
  guest_info: z.object({
    email: zSchemas.email,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).optional(),
    phone: zSchemas.indianPhone,
  }),
})).passthrough();

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
