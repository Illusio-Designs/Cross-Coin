#!/usr/bin/env node
/**
 * One-time backfill: write a `created` row into order_audit_logs for
 * every order that doesn't already have one.
 *
 * Why: audit-log call sites were added to controllers recently. Orders
 * placed before that date have no audit trail at all — finance can't
 * tell when they were created without joining to orders.createdAt and
 * guessing. This script gives every historical order a baseline entry.
 *
 * Safe to re-run: skips any order that already has a `created` row.
 *
 * Usage:
 *   node Backend/scripts/backfillAuditLogs.js
 *   node Backend/scripts/backfillAuditLogs.js --dry-run
 *   node Backend/scripts/backfillAuditLogs.js --batch=2000
 */

require('dotenv').config();
const { sequelize } = require('../config/db.js');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const BATCH_SIZE = (() => {
  const m = args.find((a) => a.startsWith('--batch='));
  if (!m) return 1000;
  const n = parseInt(m.split('=')[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 1000;
})();

async function main() {
  console.log(`[backfill] starting ${DRY_RUN ? '(DRY RUN)' : ''} batch=${BATCH_SIZE}`);
  await sequelize.authenticate();

  // Pre-count what needs to happen so the operator sees the impact.
  const [[totalRow]] = await sequelize.query(`SELECT COUNT(*) AS n FROM orders`);
  const [[needRow]] = await sequelize.query(`
    SELECT COUNT(*) AS n
    FROM orders o
    WHERE NOT EXISTS (
      SELECT 1 FROM order_audit_logs a
      WHERE a.order_id = o.id AND a.action = 'created'
    )
  `);
  console.log(`[backfill] total orders: ${totalRow.n}`);
  console.log(`[backfill] orders missing a 'created' audit row: ${needRow.n}`);

  if (needRow.n === 0) {
    console.log('[backfill] nothing to do.');
    await sequelize.close();
    return;
  }

  if (DRY_RUN) {
    // Show a sample of what would be inserted, then exit.
    const [sample] = await sequelize.query(`
      SELECT o.id, o.order_number, o.user_id, o.createdAt, o.status, o.payment_type, o.final_amount
      FROM orders o
      WHERE NOT EXISTS (SELECT 1 FROM order_audit_logs a WHERE a.order_id = o.id AND a.action = 'created')
      ORDER BY o.id ASC
      LIMIT 10
    `);
    console.log('[backfill] sample (first 10):');
    for (const r of sample) {
      console.log(`  - id=${r.id} ${r.order_number} user=${r.user_id} ${r.payment_type} ₹${r.final_amount} @ ${r.createdAt}`);
    }
    await sequelize.close();
    return;
  }

  let inserted = 0;
  let lastId = 0;
  // Loop in chunks so we don't lock the table or blow out memory on
  // databases with millions of rows. INSERT ... SELECT lets MySQL
  // handle the data movement entirely server-side.
  /* eslint-disable no-await-in-loop */
  while (true) {
    const [result] = await sequelize.query(`
      INSERT INTO order_audit_logs (order_id, action, performed_by, role, metadata, created_at)
      SELECT
        o.id,
        'created',
        o.user_id,
        IF(o.user_id IS NULL, 'guest', 'user'),
        JSON_OBJECT(
          'order_number', o.order_number,
          'payment_type', o.payment_type,
          'final_amount', o.final_amount,
          'status', o.status,
          'backfilled', 1
        ),
        o.createdAt
      FROM orders o
      WHERE o.id > :lastId
        AND NOT EXISTS (
          SELECT 1 FROM order_audit_logs a
          WHERE a.order_id = o.id AND a.action = 'created'
        )
      ORDER BY o.id ASC
      LIMIT :batch
    `, { replacements: { lastId, batch: BATCH_SIZE } });

    const affected = result.affectedRows || 0;
    if (affected === 0) break;
    inserted += affected;

    const [[edge]] = await sequelize.query(`
      SELECT MAX(o.id) AS max_id
      FROM orders o
      JOIN order_audit_logs a ON a.order_id = o.id AND a.action = 'created'
      WHERE JSON_EXTRACT(a.metadata, '$.backfilled') = 1
    `);
    if (!edge || !edge.max_id || edge.max_id <= lastId) break;
    lastId = edge.max_id;
    console.log(`[backfill] inserted ${inserted} so far (lastId=${lastId})`);
  }
  /* eslint-enable no-await-in-loop */

  console.log(`[backfill] done. inserted ${inserted} 'created' rows.`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error('[backfill] FAILED:', err.message);
  try { await sequelize.close(); } catch {}
  process.exit(1);
});
