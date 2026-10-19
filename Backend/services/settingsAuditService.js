'use strict';

/**
 * Who changed which setting, and when.
 *
 * One small append-only table shared by the Brand settings page, the Shipping
 * & courier page (fees / free-delivery threshold / COD limit) and the legacy
 * /api/admin/brand-settings endpoints. Secret values are NEVER stored here —
 * only "ends …1234" — so the log itself can be shown to any admin.
 *
 * The table is created lazily, once per process (no Backend/index.js edit).
 */

const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sequelize.query(
      `CREATE TABLE IF NOT EXISTS settings_audit (
         id BIGINT AUTO_INCREMENT PRIMARY KEY,
         brand_id INT NULL,
         area VARCHAR(30) NOT NULL DEFAULT 'brand_settings',
         setting_key VARCHAR(100) NOT NULL,
         action VARCHAR(10) NOT NULL,
         old_value VARCHAR(255) NULL,
         new_value VARCHAR(255) NULL,
         user_id INT NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_sa_brand_created (brand_id, created_at),
         INDEX idx_sa_user_created (user_id, created_at)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ).catch((err) => { schemaReady = null; throw err; });
  }
  return schemaReady;
}

const SECRET_KEY_RE = /SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY|AUTH_KEY|HMAC/i;
const isSecretKey = (key) => SECRET_KEY_RE.test(String(key || ''));

// "••••1234" — enough to recognise which key is saved, never enough to use it.
function maskValue(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (!s) return '';
  return `••••${s.length > 8 ? s.slice(-4) : ''}`;
}

function shown(value, secret) {
  if (value === null || value === undefined || value === '') return null;
  const s = secret ? maskValue(value) : String(value);
  return s.length > 250 ? `${s.slice(0, 247)}…` : s;
}

/**
 * Record one change. Never throws — logging must not break a save.
 * entry: { brandId, area, key, action, oldValue, newValue, userId, secret }
 */
async function record(entry) {
  try {
    await ensureSchema();
    const secret = entry.secret ?? isSecretKey(entry.key);
    await sequelize.query(
      `INSERT INTO settings_audit (brand_id, area, setting_key, action, old_value, new_value, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      { replacements: [
        entry.brandId ?? null, entry.area || 'brand_settings', String(entry.key).slice(0, 100),
        entry.action || 'update', shown(entry.oldValue, secret), shown(entry.newValue, secret), entry.userId ?? null,
      ] }
    );
  } catch (err) {
    logger.warn(`settings_audit write failed (${entry && entry.key}): ${err.message}`);
  }
}

/** Latest changes, newest first, with the person's name. */
async function list({ brandId, area, limit = 20, offset = 0 } = {}) {
  await ensureSchema();
  const where = [];
  const rep = {};
  if (brandId) { where.push('a.brand_id = :brandId'); rep.brandId = Number(brandId); }
  if (area) { where.push('a.area = :area'); rep.area = area; }
  const lim = Math.max(1, Math.min(Number(limit) || 20, 100));
  const off = Math.max(0, Number(offset) || 0);
  const [rows] = await sequelize.query(
    `SELECT a.id, a.brand_id, a.area, a.setting_key, a.action, a.old_value, a.new_value, a.user_id, a.created_at,
            u.username AS user_name
       FROM settings_audit a
       LEFT JOIN users u ON u.id = a.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.id DESC
      LIMIT ${lim} OFFSET ${off}`,
    { replacements: rep }
  );
  return rows;
}

module.exports = { ensureSchema, record, list, maskValue, isSecretKey };
