'use strict';

const { LeadCapture } = require('../model/leadCaptureModel.js');
const whatsappService = require('../services/whatsappService.js');
const { logger } = require('../config/logging.js');

const COUPON_CODE = process.env.POPUP_COUPON_CODE || 'PREPAID10';

exports.capturePhoneLead = async (req, res) => {
  try {
    const { phone, brandId = 1 } = req.body;

    if (!phone?.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Normalize: strip non-digits, ensure 10-digit Indian number
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length !== 10) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    }

    // Prevent duplicate leads per brand
    const [lead, created] = await LeadCapture.findOrCreate({
      where: { phone: digits, brand_id: brandId },
      defaults: { coupon_code: COUPON_CODE, source: 'popup', wa_sent: false },
    });

    if (!created) {
      // Already captured — just return the coupon
      return res.json({ success: true, coupon: lead.coupon_code, alreadyClaimed: true });
    }

    // Send WhatsApp message with coupon
    let waSent = false;
    try {
      await whatsappService.sendTemplate(digits, 'popup_coupon', [COUPON_CODE], brandId);
      waSent = true;
      await lead.update({ wa_sent: true });
    } catch (waErr) {
      logger.warn(`Popup coupon WA send failed for ${digits}: ${waErr.message}`);
    }

    logger.info(`Lead captured: ${digits}, WA sent: ${waSent}`);
    return res.json({ success: true, coupon: COUPON_CODE, waSent });
  } catch (err) {
    logger.error('Lead capture error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};
