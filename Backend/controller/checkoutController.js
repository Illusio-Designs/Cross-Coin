'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logging.js');

const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_KEY = (phone) => `otp:checkout:${phone}`;

// Generate a 6-digit OTP
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * POST /api/checkout/phone-otp/send
 * Generates a 6-digit OTP, stores it in Redis, and sends via WhatsApp.
 */
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(String(phone).replace(/\D/g, '').slice(-10))) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    const normalised = String(phone).replace(/\D/g, '').slice(-10);
    const otp = generateOtp();

    // Store in Redis with TTL
    const redisService = require('../services/redisService.js');
    await redisService.set(OTP_KEY(normalised), otp, 'EX', OTP_TTL_SECONDS);

    // Send via WhatsApp (fire-and-forget — don't block response on delivery)
    setImmediate(async () => {
      try {
        const whatsappService = require('../services/whatsappService.js');
        const e164 = `91${normalised}`;
        await whatsappService.sendTextMessage(
          e164,
          `Your Cross Coin verification code is *${otp}*. Valid for 10 minutes. Do not share this with anyone.`,
          1
        );
        logger.info(`OTP sent to ${normalised}`);
      } catch (err) {
        logger.warn(`OTP WhatsApp send failed for ${normalised}: ${err.message}`);
      }
    });

    res.json({ success: true, message: 'OTP sent to your WhatsApp number.' });
  } catch (error) {
    logger.error('sendPhoneOtp error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

/**
 * POST /api/checkout/phone-otp/verify
 * Verifies the OTP and returns a short-lived signed token on success.
 */
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Phone and code are required.' });
    }

    const normalised = String(phone).replace(/\D/g, '').slice(-10);
    const redisService = require('../services/redisService.js');
    const stored = await redisService.get(OTP_KEY(normalised));

    if (!stored) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }

    if (String(code).trim() !== stored) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // Delete OTP after successful verification (one-time use)
    await redisService.del(OTP_KEY(normalised));

    // Issue a short-lived token (10 min) so the backend can optionally validate it on order creation
    const secret = process.env.JWT_SECRET || 'crosscoin-otp-secret';
    const otp_token = jwt.sign({ phone: normalised, purpose: 'cod_checkout' }, secret, { expiresIn: '10m' });

    res.json({ success: true, otp_token });
  } catch (error) {
    logger.error('verifyPhoneOtp error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify OTP. Please try again.' });
  }
};
