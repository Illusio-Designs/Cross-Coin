const express = require('express');
const router = express.Router();
const { sendPhoneOtp, verifyPhoneOtp } = require('../controller/checkoutController.js');

// No auth required — called during guest and logged-in checkout
router.post('/phone-otp/send', sendPhoneOtp);
router.post('/phone-otp/verify', verifyPhoneOtp);

module.exports = router;
