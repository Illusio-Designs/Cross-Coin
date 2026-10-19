const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../config/logging.js');
const { isBotUserAgent } = require('../utils/botDetect');
const { classifyChannel } = require('../utils/channel');

// Anonymous, cookieless pageview counter (see model/pageHitModel.js). Stores
// ONLY aggregate counts per (brand, day, channel) — no personal data — so it can
// run without cookie consent and give the traffic report real visit volume.

// Production doesn't auto-sync models, so make sure the table exists on first
// use. Guarded by a cached promise → the DDL runs at most once per process.
let ensured = null;
function ensurePageHitsTable() {
  if (!ensured) {
    ensured = sequelize.query(
      `CREATE TABLE IF NOT EXISTS page_hits (
         id INT AUTO_INCREMENT PRIMARY KEY,
         brand_id INT NOT NULL DEFAULT 0,
         day DATE NOT NULL,
         channel VARCHAR(32) NOT NULL,
         count INT NOT NULL DEFAULT 0,
         UNIQUE KEY uniq_brand_day_channel (brand_id, day, channel)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ).catch((e) => { ensured = null; throw e; });
  }
  return ensured;
}

// Business-day (IST, +05:30) as YYYY-MM-DD — matches the report's day anchoring.
function istDay() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

// POST /api/i/pv  — body: { utm_source?, utm_medium?, referrer?, path? }
// Brand comes from the X-Brand-Name header (optionalBrand middleware). Fires for
// EVERY visitor (consent not required) because nothing identifying is stored.
exports.recordPageview = async (req, res) => {
  try {
    // Drop bot/crawler traffic by UA — the UA itself is never stored.
    if (isBotUserAgent(req.headers['user-agent'])) {
      return res.status(200).json({ ok: true, skipped: 'bot' });
    }
    const brandId = (req.brand && req.brand.id) || 0;
    const body = req.body || {};
    const channel = classifyChannel({
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      referrer: body.referrer,
    });

    await ensurePageHitsTable();
    await sequelize.query(
      `INSERT INTO page_hits (brand_id, day, channel, count) VALUES (:b, :d, :c, 1)
       ON DUPLICATE KEY UPDATE count = count + 1`,
      { replacements: { b: brandId, d: istDay(), c: channel }, type: QueryTypes.INSERT }
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    // Never let the counter break a page load — swallow and report ok:false.
    logger.error('recordPageview failed: ' + error.message);
    return res.status(200).json({ ok: false });
  }
};

exports.ensurePageHitsTable = ensurePageHitsTable;
