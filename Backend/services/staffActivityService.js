'use strict';

/**
 * Staff page (Dashboard → Staff): last sign-in and "did this week".
 *
 * users.last_login_at is added lazily (once per process) and stamped by the
 * staff login (userController.adminLogin → recordLogin). Weekly counts come
 * only from tables that really record who did something:
 *   order_audit_logs.performed_by   confirm / cancel / refund / AWB actions
 *   whatsapp_messages.sent_by       outbound WhatsApp replies
 *   exception_events.actor_id       Problems-desk actions
 *   returns.reviewed_by/reviewed_at returns reviewed
 *   job_runs.triggered_by           jobs run by hand (System health)
 *   settings_audit.user_id          settings changed
 * A source table that doesn't exist on this database is skipped.
 */

const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../config/logging.js');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const [col] = await q(
        `SELECT COUNT(*) AS n FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'last_login_at'`
      );
      if (!Number(col?.n)) await sequelize.query('ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL');
    })().catch((err) => { schemaReady = null; throw err; });
  }
  return schemaReady;
}

// Fire-and-forget from the login handler; never blocks or fails a sign-in.
function recordLogin(userId) {
  if (!userId) return;
  ensureSchema()
    .then(() => sequelize.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', { replacements: [userId] }))
    .catch((err) => logger.warn(`last_login_at update skipped: ${err.message}`));
}

async function tableExists(name) {
  const [r] = await q(
    'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :name',
    { name }
  );
  return Number(r?.n) > 0;
}

// Each source: [table, SQL returning (user_id, label, n)].
const SOURCES = [
  ['order_audit_logs', `SELECT performed_by AS user_id, action AS label, COUNT(*) AS n FROM order_audit_logs
     WHERE performed_by IN (:ids) AND created_at >= :since GROUP BY performed_by, action`],
  ['whatsapp_messages', `SELECT sent_by AS user_id, 'wa_reply' AS label, COUNT(*) AS n FROM whatsapp_messages
     WHERE sent_by IN (:ids) AND createdAt >= :since GROUP BY sent_by`],
  ['exception_events', `SELECT actor_id AS user_id, 'desk' AS label, COUNT(*) AS n FROM exception_events
     WHERE actor_id IN (:ids) AND created_at >= :since GROUP BY actor_id`],
  ['returns', `SELECT reviewed_by AS user_id, 'return_reviewed' AS label, COUNT(*) AS n FROM returns
     WHERE reviewed_by IN (:ids) AND reviewed_at >= :since GROUP BY reviewed_by`],
  ['job_runs', `SELECT triggered_by AS user_id, 'job' AS label, COUNT(*) AS n FROM job_runs
     WHERE triggered_by IN (:ids) AND started_at >= :since GROUP BY triggered_by`],
  ['settings_audit', `SELECT user_id, 'setting' AS label, COUNT(*) AS n FROM settings_audit
     WHERE user_id IN (:ids) AND created_at >= :since GROUP BY user_id`],
];

// Plain-English phrase for each counted thing.
const PHRASES = {
  confirm: (n) => `confirmed ${n} order${n === 1 ? '' : 's'}`,
  cancel: (n) => `cancelled ${n} order${n === 1 ? '' : 's'}`,
  refund: (n) => `refunded ${n} order${n === 1 ? '' : 's'}`,
  awb_update: (n) => `updated ${n} tracking number${n === 1 ? '' : 's'}`,
  wa_reply: (n) => `sent ${n} WhatsApp repl${n === 1 ? 'y' : 'ies'}`,
  desk: (n) => `${n} Problems-desk action${n === 1 ? '' : 's'}`,
  return_reviewed: (n) => `reviewed ${n} return${n === 1 ? '' : 's'}`,
  job: (n) => `ran ${n} job${n === 1 ? '' : 's'} by hand`,
  setting: (n) => `changed ${n} setting${n === 1 ? '' : 's'}`,
};
const ORDER = Object.keys(PHRASES);

/** Activity in the last 7 days for these user ids → { [id]: [{ key, n, text }] } */
async function weekActivity(ids) {
  const out = {};
  if (!ids.length) return out;
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  for (const [table, sql] of SOURCES) {
    try {
      if (!(await tableExists(table))) continue;
      const rows = await q(sql, { ids, since });
      for (const r of rows) {
        const key = PHRASES[r.label] ? r.label : 'other_order';
        const list = (out[r.user_id] = out[r.user_id] || []);
        const hit = list.find((x) => x.key === key);
        if (hit) hit.n += Number(r.n); else list.push({ key, n: Number(r.n) });
      }
    } catch (err) {
      logger.warn(`staff activity: ${table} skipped (${err.message})`);
    }
  }
  for (const list of Object.values(out)) {
    const rank = (k) => (PHRASES[k] ? ORDER.indexOf(k) : ORDER.length);
    list.sort((a, b) => rank(a.key) - rank(b.key));
    for (const x of list) x.text = PHRASES[x.key] ? PHRASES[x.key](x.n) : `${x.n} other order action${x.n === 1 ? '' : 's'}`;
  }
  return out;
}

/** last_login_at for these ids → { [id]: Date|null } */
async function lastLogins(ids) {
  if (!ids.length) return {};
  try {
    await ensureSchema();
    const rows = await q('SELECT id, last_login_at FROM users WHERE id IN (:ids)', { ids });
    return Object.fromEntries(rows.map((r) => [r.id, r.last_login_at]));
  } catch (err) {
    logger.warn(`staff last_login_at read failed: ${err.message}`);
    return {};
  }
}

module.exports = { ensureSchema, recordLogin, weekActivity, lastLogins };
