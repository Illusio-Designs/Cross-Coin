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

// OTP endpoints — mounted under /auth
router.post('/otp/send', sendPhoneOtp);
router.post('/otp/verify', verifyPhoneOtp);

// Payment-first checkout (prepaid)
router.post('/initiate', isAuthenticated, initiateCheckout);
router.post('/retry', isAuthenticated, retryCheckout);
router.post('/guest/initiate', initiateGuestCheckout);

module.exports = router;
