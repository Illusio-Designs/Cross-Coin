'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { STAFF_ROLES, effectiveRoles } = require('../middleware/authMiddleware.js');

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const PAGE_SIZE = 30;
const METHODS = { POST: 'submit', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

let schemaReady;
function ensureSchema() {
  schemaReady ||= sequelize.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      actor_id INT NOT NULL,
      actor_name VARCHAR(255) NOT NULL,
      roles JSON NOT NULL,
      area VARCHAR(24) NOT NULL,
      action VARCHAR(24) NOT NULL,
      resource VARCHAR(240) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      INDEX idx_admin_audit_date (created_at),
      INDEX idx_admin_audit_actor_date (actor_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch((err) => { schemaReady = null; throw err; });
  return schemaReady;
}

function auditMutation(area, resource) {
  return (req, res, next) => {
    const action = METHODS[req.method];
    const base = req.baseUrl.replace(/^\/api(?:\/v1)?/, '');
    if (action) res.once('finish', () => {
      const actor = req.user;
      const roles = effectiveRoles(actor).filter((role) => STAFF_ROLES.includes(role));
      if (!roles.length || res.statusCode < 200 || res.statusCode >= 300) return;
      const route = typeof req.route?.path === 'string' ? req.route.path : '';
      if (!route) return;
      // Only use the authored route pattern. Numeric IDs help identify the
      // affected record without storing query strings, bodies or filenames.
      const target = route.replace(/:(\w+)/g, (token, key) =>
        /^\d+$/.test(String(req.params?.[key] ?? '')) ? req.params[key] : token);
      const fullPath = (target === base || target.startsWith(base + '/') ? target : base + target).replace(/\/$/, '');
      const detail = resource ? resource + ' · ' + fullPath : fullPath;
      const at = new Date();
      ensureSchema().then(() => sequelize.query(
        `INSERT INTO admin_audit_events (actor_id, actor_name, roles, area, action, resource, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [actor.id, actor.username || `User #${actor.id}`, JSON.stringify(roles), area, action, detail.slice(0, 240), at] },
      )).catch((err) => logger.warn(`Admin audit write failed for ${area}: ${err.message}`));
    });
    next();
  };
}

// The existing logs provide safe summary columns. Free-text remarks,
// conversations, payment details and settings values are excluded.
const SOURCES = [
  { table: 'order_audit_logs', area: 'orders', actor: 'a.performed_by', date: 'a.created_at', action: 'a.action',
    resource: "COALESCE(o.order_number, CONCAT('Order #', a.order_id))", join: 'LEFT JOIN orders o ON o.id = a.order_id',
    condition: "COALESCE(a.role, '') NOT IN ('user', 'guest', 'consumer')" },
  { table: 'exception_events', area: 'problems', actor: 'a.actor_id', date: 'a.created_at', action: "'case_update'",
    resource: "COALESCE(o.order_number, CONCAT(UPPER(a.kind), ' #', a.ref_id))", join: 'LEFT JOIN orders o ON o.id = a.order_id' },
  { table: 'returns', area: 'returns', actor: 'a.reviewed_by', date: 'a.reviewed_at', action: "'return_reviewed'",
    resource: 'a.return_number' },
  { table: 'whatsapp_messages', area: 'whatsapp', actor: 'a.sent_by', date: 'a.createdAt', action: "'whatsapp_reply'",
    resource: "CONCAT('Conversation #', a.conversation_id)", condition: "a.direction = 'outbound'" },
  { table: 'settings_audit', area: 'settings', actor: 'a.user_id', date: 'a.created_at', action: 'a.action',
    resource: 'a.setting_key' },
  { table: 'job_runs', area: 'jobs', actor: 'a.triggered_by', date: 'a.started_at', action: "'manual_job'",
    resource: 'a.job_key' },
  ...['catalogue', 'staff'].map((area) => ({
    table: 'admin_audit_events', area, actor: 'a.actor_id', date: 'a.created_at', action: 'a.action',
    resource: 'a.resource', snapshot: true,
  })),
];

const currentRolesSql = STAFF_ROLES.map((role) => `u.role = '${role}' OR JSON_CONTAINS(u.roles, '"${role}"')`).join(' OR ');
function parseRoles(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function list({ user, role, area, days, page } = {}) {
  const period = [7, 30, 90].includes(Number(days)) ? Number(days) : 7;
  const pageNumber = Math.min(10000, Math.max(1, Number.parseInt(page, 10) || 1));
  const userId = /^\d{1,10}$/.test(String(user || '')) ? Number(user) : null;
  const matchRole = STAFF_ROLES.includes(role) ? role : null;
  const sources = SOURCES.filter((source) => !area || area === source.area);
  const [tables, staff] = await Promise.all([
    select(`SELECT table_name AS name FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN (:tables)`, { tables: [...new Set(SOURCES.map((s) => s.table))] }),
    select(`SELECT u.id, u.username AS name FROM users u WHERE ${currentRolesSql} ORDER BY u.username, u.id`),
  ]);
  const tableNames = new Set(tables.map(({ name }) => name));
  const replacements = {
    since: new Date(Date.now() - period * 86400000), userId, matchRole,
    roleJson: JSON.stringify(matchRole), offset: (pageNumber - 1) * PAGE_SIZE,
  };
  if (tableNames.has('admin_audit_events')) {
    const missing = await select(`
      SELECT e.actor_id AS id, MAX(e.actor_name) AS name
      FROM admin_audit_events e LEFT JOIN users u ON u.id = e.actor_id
      WHERE e.created_at >= :since AND (u.id IS NULL OR NOT COALESCE((${currentRolesSql}), 0))
      GROUP BY e.actor_id ORDER BY name, id
    `, replacements);
    staff.push(...missing);
  }

  const queries = sources.filter((s) => tableNames.has(s.table)).map((s) => {
    const conditions = [
      `${s.date} >= :since`, `${s.actor} IS NOT NULL`, s.condition,
      s.snapshot ? `a.area = '${s.area}'` : `(${currentRolesSql})`,
      userId && `${s.actor} = :userId`,
      matchRole && (s.snapshot ? 'JSON_CONTAINS(a.roles, :roleJson)' : '(u.role = :matchRole OR JSON_CONTAINS(u.roles, :roleJson))'),
    ].filter(Boolean);
    return `SELECT a.id, '${s.area}' AS area, ${s.actor} AS user_id, ${s.date} AS occurred_at,
       CONVERT(${s.action} USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
       CONVERT(${s.resource} USING utf8mb4) COLLATE utf8mb4_unicode_ci AS resource,
       ${s.snapshot ? 'CONVERT(a.actor_name USING utf8mb4) COLLATE utf8mb4_unicode_ci' : 'NULL'} AS recorded_name,
       ${s.snapshot ? 'CAST(a.roles AS CHAR)' : 'NULL'} AS recorded_roles
      FROM ${s.table} a LEFT JOIN users u ON u.id = ${s.actor} ${s.join || ''}
      WHERE ${conditions.join(' AND ')}`;
  });
  if (!queries.length) return { events: [], staff, page: 1, pages: 1, total: 0 };
  const union = queries.join(' UNION ALL ');
  const [rows, [count]] = await Promise.all([
    select(`SELECT e.*, u.username AS current_name, u.role AS primary_staff_role, u.roles AS extra_staff_roles
      FROM (${union}) e LEFT JOIN users u ON u.id = e.user_id
      ORDER BY e.occurred_at DESC, e.area ASC, e.id DESC LIMIT ${PAGE_SIZE} OFFSET :offset`, replacements),
    select(`SELECT COUNT(*) AS total FROM (${union}) e`, replacements),
  ]);
  const total = Number(count.total);
  const events = rows.map((row) => ({
    id: `${row.area}:${row.id}`, area: row.area, at: row.occurred_at, action: row.action, resource: row.resource,
    userId: row.user_id, userName: row.recorded_name || row.current_name || `User #${row.user_id}`,
    roles: [...new Set(row.recorded_roles
      ? parseRoles(row.recorded_roles)
      : [row.primary_staff_role, ...parseRoles(row.extra_staff_roles)])].filter((r) => STAFF_ROLES.includes(r)),
  }));
  return { events, staff, page: pageNumber, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total };
}

module.exports = { auditMutation, list };
