/**
 * DPDP retention limitation (S8(7) + Rule 8 — erase personal data once the
 * purpose is served). A daily sweep drops stale rows per data class. Order and
 * invoice data is never touched here (kept, anonymised on erasure, to the tax
 * horizon). Each class is independent and best-effort: one failing class is
 * logged and does not stop the others.
 *
 * Default windows (months) — override via env if policy changes:
 *   RETAIN_FUNNEL_MONTHS=14   funnel_events (view/cart/checkout analytics)
 *   RETAIN_UTM_MONTHS=14      utm_tracking (ip, ua, referrer by session)
 *   RETAIN_LEADS_MONTHS=12    lead_captures (popup phone leads)
 *   RETAIN_CONTACT_MONTHS=24  contact_messages (contact-form submissions)
 *   RETAIN_GUEST_MONTHS=18    abandoned guest_users with NO orders
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

const DAY = 24 * 60 * 60 * 1000;
const monthsAgo = (m) => new Date(Date.now() - m * 30 * DAY);
const envMonths = (key, def) => {
  const n = parseInt(process.env[key], 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

async function runRetention() {
  const summary = {};

  const UTMTracking = require('../model/utmModel.js');
  const { LeadCapture } = require('../model/leadCaptureModel.js');
  const ContactMessage = require('../model/contactMessageModel.js');

  // funnel_events — raw (no model); column is created_at.
  try {
    const [, meta] = await sequelize.query(
      'DELETE FROM funnel_events WHERE created_at < ?',
      { replacements: [monthsAgo(envMonths('RETAIN_FUNNEL_MONTHS', 14))] },
    );
    summary.funnel_events = meta?.affectedRows ?? 0;
  } catch (e) { logger.error('retention funnel_events: ' + e.message); summary.funnel_events = 'error'; }

  try {
    summary.utm_tracking = await UTMTracking.destroy({
      where: { createdAt: { [Op.lt]: monthsAgo(envMonths('RETAIN_UTM_MONTHS', 14)) } },
    });
  } catch (e) { logger.error('retention utm_tracking: ' + e.message); summary.utm_tracking = 'error'; }

  try {
    summary.lead_captures = await LeadCapture.destroy({
      where: { createdAt: { [Op.lt]: monthsAgo(envMonths('RETAIN_LEADS_MONTHS', 12)) } },
    });
  } catch (e) { logger.error('retention lead_captures: ' + e.message); summary.lead_captures = 'error'; }

  try {
    summary.contact_messages = await ContactMessage.destroy({
      where: { createdAt: { [Op.lt]: monthsAgo(envMonths('RETAIN_CONTACT_MONTHS', 24)) } },
    });
  } catch (e) { logger.error('retention contact_messages: ' + e.message); summary.contact_messages = 'error'; }

  // Abandoned guests: never ordered, not converted, older than the window.
  // A JOIN delete so we never remove a guest that has an order (those are
  // financial records and stay). guest_users column is created_at.
  try {
    const [, meta] = await sequelize.query(
      `DELETE g FROM guest_users g
       LEFT JOIN orders o ON o.guest_user_id = g.id
       WHERE o.id IS NULL
         AND (g.status IS NULL OR g.status <> 'converted')
         AND g.created_at < ?`,
      { replacements: [monthsAgo(envMonths('RETAIN_GUEST_MONTHS', 18))] },
    );
    summary.guest_users = meta?.affectedRows ?? 0;
  } catch (e) { logger.error('retention guest_users: ' + e.message); summary.guest_users = 'error'; }

  logger.info('DPDP retention sweep complete: ' + JSON.stringify(summary));
  return summary;
}

module.exports = { runRetention };
