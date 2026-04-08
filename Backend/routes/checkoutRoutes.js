const express = require('express');
const router = express.Router();
const { sendPhoneOtp, verifyPhoneOtp } = require('../controller/checkoutController.js');

// OTP endpoints — mounted under /auth
router.post('/otp/send', sendPhoneOtp);
router.post('/otp/verify', verifyPhoneOtp);

module.exports = router;
