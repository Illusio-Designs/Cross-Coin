/**
 * Performance index migration — runs automatically at boot.
 *
 * Production never runs sync({ alter:true }), so indexes added to a model file
 * do NOT reach the live DB automatically. `ensureIndexes()` is called from
 * index.js on every startup: it is idempotent (checks information_schema and
 * skips indexes that already exist), so it's safe and cheap to run each boot —
 * any newly-added index in the map below is created on the next deploy with no
 * manual step.
 *
 * Still runnable manually if you want to apply indexes without a restart:
 *
 *   cd Backend && node scripts/add-perf-indexes.js
 */

const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

// table → [{ name, columns }]
const INDEXES = {
  products: [
    { name: 'idx_products_created_at', columns: ['createdAt'] },
    { name: 'idx_products_status', columns: ['status'] },
  ],
  // WhatsApp inbox: the conversation list sorts by last_message_at DESC (loaded
  // on open AND on every long-poll reconnect), messages load by conversation_id,
  // and webhooks look up by phone / wa_message_id. All were full scans + filesort
  // before — the cause of the slow WhatsApp loading. Mirrors the `indexes` in
  // model/whatsappConversationModel.js.
  whatsapp_conversations: [
    { name: 'idx_wa_conv_brand_status_lastmsg', columns: ['brand_id', 'status', 'last_message_at'] },
    { name: 'idx_wa_conv_status_lastmsg', columns: ['status', 'last_message_at'] },
    { name: 'idx_wa_conv_lastmsg', columns: ['last_message_at'] },
    { name: 'idx_wa_conv_phone_brand', columns: ['customer_phone', 'brand_id'] },
  ],
  whatsapp_messages: [
    { name: 'idx_wa_msg_conv_id', columns: ['conversation_id', 'id'] },
    { name: 'idx_wa_msg_wa_msg_id', columns: ['wa_message_id'] },
  ],
};

async function indexExists(table, name) {
  const [rows] = await sequelize.query(
    'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1',
    { replacements: [table, name] }
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const [rows] = await sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
    { replacements: [table] }
  );
  return rows.length > 0;
}

/**
 * Create any missing performance indexes. Idempotent — safe to call on every
 * boot. Never throws: a failure to add an index must not take the server down,
 * so errors are logged and swallowed.
 */
async function ensureIndexes() {
  let created = 0;
  for (const [table, defs] of Object.entries(INDEXES)) {
    try {
      if (!(await tableExists(table))) continue; // table not created yet — skip
      for (const def of defs) {
        try {
          if (await indexExists(table, def.name)) continue;
          const cols = def.columns.map((c) => `\`${c}\``).join(', ');
          await sequelize.query(`CREATE INDEX \`${def.name}\` ON \`${table}\` (${cols})`);
          created++;
          logger.info(`[perf-index] created ${def.name} on ${table} (${def.columns.join(', ')})`);
        } catch (err) {
          logger.error(`[perf-index] failed to create ${def.name} on ${table}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`[perf-index] check failed for ${table}: ${err.message}`);
    }
  }
  if (created > 0) logger.info(`[perf-index] added ${created} index(es)`);
  return created;
}

module.exports = { ensureIndexes, INDEXES };

// Allow running standalone: `node scripts/add-perf-indexes.js`
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await ensureIndexes();
      logger.info('[perf-index] done');
      await sequelize.close();
      process.exit(0);
    } catch (err) {
      logger.error(`[perf-index] failed: ${err.message}`);
      try { await sequelize.close(); } catch {}
      process.exit(1);
    }
  })();
}
