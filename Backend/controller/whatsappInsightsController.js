'use strict';

// WhatsApp Studio — abandoned carts, analytics and settings endpoints.
// Thin HTTP layer over services/whatsappInsightsService.js.

const svc = require('../services/whatsappInsightsService.js');
const { logger } = require('../config/logging.js');

const fail = (res, err, where) => {
  logger.error(`[wa-insights] ${where} failed: ${err.message}`);
  return res.status(500).json({ success: false, message: err.message });
};

// ── Abandoned carts ──────────────────────────────────────────────────────────
exports.getCarts = async (req, res) => {
  try {
    const data = await svc.getCarts({ days: req.query.days, status: req.query.status, brandId: req.query.brandId });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'getCarts'); }
};

exports.sendCartNow = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid cart id' });
    const { status, body } = await svc.sendCartNow(id);
    res.status(status).json(body);
  } catch (err) { fail(res, err, 'sendCartNow'); }
};

exports.saveCartRules = async (req, res) => {
  try {
    const b = req.body || {};
    if (b.waitHours != null && !(Number(b.waitHours) >= 0 && Number(b.waitHours) <= 23)) {
      return res.status(400).json({ success: false, message: 'Wait time must be between 0 and 23 hours' });
    }
    for (const k of ['quietStart', 'quietEnd']) {
      if (b[k] != null && b[k] !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(b[k])) {
        return res.status(400).json({ success: false, message: 'Quiet hours must look like 21:00' });
      }
    }
    if (b.quietStart && b.quietEnd && b.quietStart === b.quietEnd) {
      return res.status(400).json({ success: false, message: 'Quiet hours can’t start and end at the same time' });
    }
    if (b.minValue != null && !(Number(b.minValue) >= 0)) {
      return res.status(400).json({ success: false, message: 'Minimum cart value must be 0 or more' });
    }
    if (b.coupon != null && !/^[A-Za-z0-9_-]{0,32}$/.test(String(b.coupon).trim())) {
      return res.status(400).json({ success: false, message: 'Coupon code can only have letters, numbers, - and _' });
    }
    if (b.winbackCoupon != null && !/^[A-Za-z0-9_-]{0,32}$/.test(String(b.winbackCoupon).trim())) {
      return res.status(400).json({ success: false, message: 'Win-back code can only have letters, numbers, - and _' });
    }
    const rules = await svc.saveCartRules(b);
    res.json({ success: true, rules });
  } catch (err) { fail(res, err, 'saveCartRules'); }
};

// ── Analytics ────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const data = await svc.getAnalytics({ days: req.query.days, brandId: req.query.brandId });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'getAnalytics'); }
};

// ── Settings (admin) ─────────────────────────────────────────────────────────
exports.getHealth = async (req, res) => {
  try {
    const data = await svc.getHealth({ refresh: req.query.refresh === '1' || req.query.refresh === 'true' });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'getHealth'); }
};

exports.getSettings = async (req, res) => {
  try {
    await svc.ensureSchema();
    const settings = await svc.getInboxSettings();
    res.json({ success: true, ...settings });
  } catch (err) { fail(res, err, 'getSettings'); }
};

exports.saveSettings = async (req, res) => {
  try {
    const { error, settings } = await svc.saveInboxSettings(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    res.json({ success: true, ...settings });
  } catch (err) { fail(res, err, 'saveSettings'); }
};

exports.getFailed = async (req, res) => {
  try {
    const data = await svc.getFailed({ hours: req.query.hours, brandId: req.query.brandId });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'getFailed'); }
};

exports.getOptedOut = async (req, res) => {
  try {
    const data = await svc.getOptedOut({ brandId: req.query.brandId });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'getOptedOut'); }
};

exports.sendTest = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.phone) return res.status(400).json({ success: false, message: 'Phone number is required' });
    const { status, body } = await svc.sendTest({ phone: b.phone, templateName: b.templateName || b.template, brandId: b.brandId, params: b.params });
    res.status(status).json(body);
  } catch (err) { fail(res, err, 'sendTest'); }
};
