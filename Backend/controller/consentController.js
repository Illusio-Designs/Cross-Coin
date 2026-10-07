const { ConsentLog } = require('../model/consentLogModel.js');
const { logger } = require('../config/logging.js');

const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

// POST /api/consent — record a consent decision (DPDP S6). Public; optionalAuth
// attaches user_id when logged in, optionalBrand attaches the brand. The
// session_id comes from the shared cookie (or the body as a fallback).
exports.recordConsent = async (req, res) => {
  try {
    const b = req.body || {};
    const sessionId = clip(b.session_id || req.cookies?.session_id, 255);
    const ipRaw = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;

    const row = await ConsentLog.create({
      user_id: req.user?.id || null,
      session_id: sessionId,
      brand_id: req.brand?.id || null,
      essential: true,
      analytics: !!b.analytics,
      marketing: !!b.marketing,
      action: clip(b.action || 'update', 24),
      source: clip(b.source || 'banner', 24),
      notice_version: clip(b.notice_version, 40),
      ip_address: clip(ipRaw, 45),
      user_agent: clip(req.headers['user-agent'], 2000),
    });

    res.status(201).json({ success: true, id: row.id });
  } catch (err) {
    // Never let a consent-logging failure break the storefront.
    logger.error('recordConsent error:', err);
    res.status(200).json({ success: false });
  }
};

// GET /api/consent/me — the current visitor's latest consent record, so the
// account / banner can reflect what's on file. By user when logged in, else
// by session cookie.
exports.getMyConsent = async (req, res) => {
  try {
    const where = {};
    if (req.user?.id) where.user_id = req.user.id;
    else if (req.cookies?.session_id) where.session_id = req.cookies.session_id;
    else return res.json({ consent: null });

    const row = await ConsentLog.findOne({ where, order: [['created_at', 'DESC']] });
    res.json({ consent: row });
  } catch (err) {
    logger.error('getMyConsent error:', err);
    res.json({ consent: null });
  }
};

// GET /api/consent/user/:id — admin: a user's full consent history.
exports.getUserConsentHistory = async (req, res) => {
  try {
    const rows = await ConsentLog.findAll({
      where: { user_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    res.json({ history: rows });
  } catch (err) {
    logger.error('getUserConsentHistory error:', err);
    res.status(500).json({ message: err.message });
  }
};
