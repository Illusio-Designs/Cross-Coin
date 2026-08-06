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
    // Best-sellers filters WHERE total_sold>0 and ORDER BY total_sold DESC —
    // without this it filesorts the whole table every call.
    { name: 'idx_products_total_sold', columns: ['total_sold'] },
    // Category page (getProductsByCategory) filters WHERE categoryId=?.
    { name: 'idx_products_category', columns: ['categoryId'] },
  ],
  // Review listings filter by product (and often status); the reviews table had
  // no indexes at all. One composite covers WHERE productId=? and
  // WHERE productId=? AND status=? (productId is the leading column).
  reviews: [
    { name: 'idx_reviews_product_status', columns: ['productId', 'status'] },
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
  // Storefront product listing (getAllProducts) joins these child/junction
  // tables on every page. The models DECLARE these indexes, but they were added
  // after the tables already existed in prod — and prod never runs sync({alter}),
  // so the live DB can be missing them, forcing full scans on each join (the
  // 2s "SELECT Product … JOIN Category" slow-queries in the log). The leading-
  // column check below skips any that already exist under another name.
  product_brands: [
    { name: 'idx_pb_brand_product', columns: ['brand_id', 'product_id'] },
  ],
  product_images: [
    { name: 'idx_pi_product', columns: ['product_id'] },
    { name: 'idx_pi_variation', columns: ['product_variation_id'] },
  ],
  product_seo: [
    { name: 'idx_pseo_product', columns: ['product_id'] },
  ],
  product_variations: [
    { name: 'idx_pv_product', columns: ['productId'] },
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

// True if some existing index already LEADS with this column (seq_in_index = 1).
// A different-named index (e.g. Sequelize's auto-named model index) that starts
// with the same column already serves the same lookups, so we skip creating a
// duplicate. Guards against redundant indexes when the model-declared index is
// already present under another name.
async function columnAlreadyLeadIndexed(table, column) {
  const [rows] = await sequelize.query(
    'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? AND seq_in_index = 1 LIMIT 1',
    { replacements: [table, column] }
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
          // Skip if an index already leads with the same first column — an
          // equivalent index (often the model's auto-named one) already exists.
          if (await columnAlreadyLeadIndexed(table, def.columns[0])) continue;
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
