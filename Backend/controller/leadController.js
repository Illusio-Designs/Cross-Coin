'use strict';

const { LeadCapture } = require('../model/leadCaptureModel.js');
const ContactMessage = require('../model/contactMessageModel.js');
const whatsappService = require('../services/whatsappService.js');
const { logger } = require('../config/logging.js');

const COUPON_CODE = process.env.POPUP_COUPON_CODE || 'PREPAID10';

// Public: contact-form submission (name, email, phone + message).
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, message, brandId } = req.body || {};
    if (!message?.trim() && !email?.trim() && !phone?.trim()) {
      return res.status(400).json({ success: false, message: 'Please add a message and how to reach you.' });
    }
    await ContactMessage.create({
      brand_id: brandId ? Number(brandId) : null,
      name: name?.trim() || null,
      email: email?.trim() || null,
      phone: phone ? String(phone).replace(/\s+/g, '') : null,
      message: message?.trim() || null,
    });
    return res.json({ success: true, message: 'Thanks — we\'ll get back to you soon.' });
  } catch (err) {
    logger.error('submitContact error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// Admin: unified leads list — popup phone leads + contact-form messages.
exports.getLeads = async (req, res) => {
  try {
    const Brand = require('../model/brandModel.js');
    const brands = await Brand.findAll({ attributes: ['id', 'name', 'display_name'], raw: true });
    const bmap = {};
    brands.forEach((b) => { bmap[b.id] = b.display_name || b.name; });
    const brandName = (id) => bmap[id] || (id ? `Brand #${id}` : '—');

    const [popup, contacts] = await Promise.all([
      LeadCapture.findAll({ order: [['createdAt', 'DESC']], raw: true }),
      ContactMessage.findAll({ order: [['createdAt', 'DESC']], raw: true }),
    ]);

    const rows = [
      ...popup.map((l) => ({
        id: `p${l.id}`, type: 'popup', name: null, phone: l.phone, email: null,
        message: null, brand: brandName(l.brand_id), wa_sent: l.wa_sent, createdAt: l.createdAt,
      })),
      ...contacts.map((c) => ({
        id: `c${c.id}`, type: 'contact', name: c.name, phone: c.phone, email: c.email,
        message: c.message, brand: brandName(c.brand_id), wa_sent: null, createdAt: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: rows.length, leads: rows });
  } catch (err) {
    logger.error('getLeads error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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
