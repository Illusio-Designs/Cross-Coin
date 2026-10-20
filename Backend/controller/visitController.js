const crypto = require('crypto');
const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../config/logging.js');
const { isBotUserAgent } = require('../utils/botDetect');
const { classifyChannel, deriveSource, deriveMedium, hostOf } = require('../utils/channel');
const { isOwnHost } = require('../utils/ownHosts');
const { regionName } = require('../utils/indiaRegions');
const { visitKeyOk } = require('../utils/visitKey');

// Server-counted storefront visits (visit_hits). Each storefront's edge
// middleware posts one ping per real page navigation, BEFORE any page
// JavaScript runs, so visitors who leave before the page loads (slow mobile,
// in-app browsers, accidental ad clicks) are still counted. Stored as
// aggregate counts per (brand, IST day, dimensions) only: no IP, no user
// agent, no visitor id.
//   landings = page loads (document requests)
//   sessions = page loads that started a new 30-minute session (no _cv cookie)

const VISIT_HITS_DDL = `CREATE TABLE IF NOT EXISTS visit_hits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL DEFAULT 0,
  day DATE NOT NULL,
  dims_hash CHAR(40) NOT NULL,
  channel VARCHAR(32) NOT NULL DEFAULT '',
  source VARCHAR(100) NOT NULL DEFAULT '',
  medium VARCHAR(60) NOT NULL DEFAULT '',
  campaign VARCHAR(120) NOT NULL DEFAULT '',
  country VARCHAR(2) NOT NULL DEFAULT '',
  region VARCHAR(60) NOT NULL DEFAULT '',
  city VARCHAR(80) NOT NULL DEFAULT '',
  device VARCHAR(10) NOT NULL DEFAULT '',
  landings INT NOT NULL DEFAULT 0,
  sessions INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_visit_brand_day_dims (brand_id, day, dims_hash),
  KEY idx_visit_day (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

// Production doesn't auto-sync models: create the table on first use. Cached
// promise → the DDL runs at most once per process (reset on failure).
let ensured = null;
function ensureVisitHitsTable() {
  if (!ensured) {
    ensured = sequelize.query(VISIT_HITS_DDL).catch((e) => { ensured = null; throw e; });
  }
  return ensured;
}

// Live brand domains, so a referral from any of our own stores counts as
// Direct (same rule the traffic report applies). Cached for 10 minutes.
let hostsCache = { at: 0, set: new Set() };
async function selfHosts() {
  if (Date.now() - hostsCache.at < 10 * 60 * 1000) return hostsCache.set;
  try {
    const rows = await sequelize.query(`SELECT domain FROM brands`, { type: QueryTypes.SELECT });
    const set = new Set(rows
      .map((b) => String(b.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:?#].*$/, '').replace(/^www\./, ''))
      .filter(Boolean));
    hostsCache = { at: Date.now(), set };
  } catch (_) {
    hostsCache = { at: Date.now(), set: hostsCache.set };
  }
  return hostsCache.set;
}

// Business day (IST, +05:30) as YYYY-MM-DD — same anchoring as page_hits.
function istDay() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

// String field: strings only, control characters stripped, trimmed, capped.
function str(v, max) {
  if (typeof v !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function decodeCity(v) {
  const s = str(v, 240);
  if (!/%[0-9a-f]{2}/i.test(s)) return s.slice(0, 80);
  try { return decodeURIComponent(s).trim().slice(0, 80); } catch (_) { return s.slice(0, 80); }
}

const DEVICES = new Set(['mobile', 'tablet', 'desktop']);

// Validate + normalise the posted body into the stored dimensions.
// Returns null when the ping must be dropped (bot / no user agent).
function buildRow(body, hosts) {
  const b = body && typeof body === 'object' ? body : {};
  const ua = str(b.ua, 512);
  if (!ua || isBotUserAgent(ua)) return null;

  const utmSource = str(b.utm_source, 100);
  const utmMedium = str(b.utm_medium, 60);
  const utmCampaign = str(b.utm_campaign, 120);
  // Validated but not stored (the aggregate keeps campaign-level detail only).
  str(b.utm_term, 120); str(b.utm_content, 120); str(b.path, 300);
  let referrer = str(b.referrer, 500);
  // A hop from one of our own stores is an internal navigation → Direct.
  if (referrer && isOwnHost(hostOf(referrer), hosts)) referrer = '';

  const channel = classifyChannel({ utm_source: utmSource, utm_medium: utmMedium, referrer }, hosts);
  const source = (utmSource || deriveSource(referrer)).toLowerCase().slice(0, 100);
  const medium = (utmMedium || (utmSource ? '' : deriveMedium(referrer))).toLowerCase().slice(0, 60);

  const countryRaw = str(b.country, 8).toUpperCase();
  const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : '';
  const region = regionName(country, str(b.region, 16)).slice(0, 60);
  const city = decodeCity(b.city);
  const deviceRaw = str(b.device, 10).toLowerCase();
  const device = DEVICES.has(deviceRaw) ? deviceRaw : '';
  const newSession = b.newSession === true || b.newSession === 'true' || b.newSession === 1 ? 1 : 0;

  const dims = { channel, source, medium, campaign: utmCampaign, country, region, city, device };
  const dims_hash = crypto.createHash('sha1')
    .update([channel, source, medium, utmCampaign, country, region, city, device].join('\u0001'))
    .digest('hex');
  return { ...dims, dims_hash, newSession };
}

async function saveRow(brandId, row) {
  await ensureVisitHitsTable();
  await sequelize.query(
    `INSERT INTO visit_hits
       (brand_id, day, dims_hash, channel, source, medium, campaign, country, region, city, device, landings, sessions)
     VALUES (:brandId, :day, :dims_hash, :channel, :source, :medium, :campaign, :country, :region, :city, :device, 1, :newSession)
     ON DUPLICATE KEY UPDATE landings = landings + 1, sessions = sessions + :newSession`,
    { replacements: { brandId, day: istDay(), ...row }, type: QueryTypes.INSERT }
  );
}

// POST /api/i/v — called server-to-server by each storefront's edge middleware.
// Brand comes from X-Brand-Name (optionalBrand). Always answers 202 at once:
// the write happens after the response so the store's edge never waits on it.
exports.recordVisit = async (req, res) => {
  try {
    if (!visitKeyOk(req)) return res.status(202).json({ ok: true });
    const hosts = await selfHosts();
    const row = buildRow(req.body, hosts);
    if (!row) return res.status(202).json({ ok: true });
    const brandId = (req.brand && req.brand.id) || 0;
    res.status(202).json({ ok: true });
    saveRow(brandId, row).catch((e) => logger.error('recordVisit save failed: ' + e.message));
  } catch (error) {
    logger.error('recordVisit failed: ' + error.message);
    if (!res.headersSent) res.status(202).json({ ok: false });
  }
};

exports.VISIT_HITS_DDL = VISIT_HITS_DDL;
exports.ensureVisitHitsTable = ensureVisitHitsTable;
exports._buildRow = buildRow;
exports._saveRow = saveRow;
