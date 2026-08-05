/**
 * One-off production index migration.
 *
 * Production never runs sync({ alter:true }), so indexes added to a model file
 * do NOT reach the live DB automatically. Run this once after deploy:
 *
 *   cd Backend && node scripts/add-perf-indexes.js
 *
 * It adds the indexes that eliminate the product-listing filesort (2–12s slow
 * queries seen in the cPanel log) and is idempotent — re-running skips indexes
 * that already exist.
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

(async () => {
  try {
    await sequelize.authenticate();
    for (const [table, defs] of Object.entries(INDEXES)) {
      for (const def of defs) {
        if (await indexExists(table, def.name)) {
          logger.info(`[perf-index] ${def.name} already exists — skipping`);
          continue;
        }
        const cols = def.columns.map((c) => `\`${c}\``).join(', ');
        await sequelize.query(`CREATE INDEX \`${def.name}\` ON \`${table}\` (${cols})`);
        logger.info(`[perf-index] created ${def.name} on ${table} (${def.columns.join(', ')})`);
      }
    }
    logger.info('[perf-index] done');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    logger.error(`[perf-index] failed: ${err.message}`);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
