const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const WhatsappConversation = sequelize.define('WhatsappConversation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  customer_phone: { type: DataTypes.STRING(20), allowNull: false },
  customer_name: { type: DataTypes.STRING(100), allowNull: true },
  wa_contact_id: { type: DataTypes.STRING(50), allowNull: true },
  last_message: { type: DataTypes.TEXT, allowNull: true },
  last_message_at: { type: DataTypes.DATE, allowNull: true },
  unread_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('open', 'resolved'), defaultValue: 'open' },
  // Agent assignment
  assigned_to: { type: DataTypes.INTEGER, allowNull: true, comment: 'User ID of assigned agent' },
  // Customer tags (comma-separated: vip,cod_risk,first_time)
  tags: { type: DataTypes.STRING(255), allowNull: true },
  // Opt-out flag — never send marketing messages if true
  opted_out: { type: DataTypes.BOOLEAN, defaultValue: false },
  // SLA: first response time in seconds
  first_response_at: { type: DataTypes.DATE, allowNull: true },
  // User ID link (if customer is a registered user)
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  // COD flow: set to the order number when we've asked the customer to send a
  // NEW delivery address (after they tapped "Wrong Address"). Their next text
  // message is then captured as the corrected address for that order.
  awaiting_address_for: { type: DataTypes.STRING(50), allowNull: true },
  // Private internal note an agent keeps on a conversation (shown in the Notes
  // tab). Never sent to the customer.
  agent_notes: { type: DataTypes.TEXT, allowNull: true },
  // Keyed hash of the last 10 phone digits (utils/encryption.phoneHash) so the
  // inbox can join a chat to the customer's orders (shipping/guest phones are
  // encrypted and only searchable by hash). Set on create; backfilled at boot.
  phone_hash: { type: DataTypes.STRING(64), allowNull: true },
  // Denormalised timestamps for the inbox filters (no per-request aggregate
  // over whatsapp_messages): the customer's last message (24-hour reply
  // window) and the last reply a PERSON sent (automatic messages don't count,
  // so "waiting for a reply" stays true until staff actually answer).
  last_inbound_at: { type: DataTypes.DATE, allowNull: true },
  last_reply_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'whatsapp_conversations',
  timestamps: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  // Inbox list queries filter by brand_id/status and always sort by
  // last_message_at DESC (getConversations + the live long-poll stream, which
  // re-runs on every reconnect). The webhook routes inbound messages by phone.
  // Without these the DB does a full scan + filesort every time — the main
  // cause of slow inbox loading. NOTE: production runs migrations, not
  // sync({alter}), so these are also mirrored in scripts/add-perf-indexes.js.
  indexes: [
    { name: 'idx_wa_conv_brand_status_lastmsg', fields: ['brand_id', 'status', 'last_message_at'] },
    { name: 'idx_wa_conv_status_lastmsg',       fields: ['status', 'last_message_at'] },
    { name: 'idx_wa_conv_lastmsg',              fields: ['last_message_at'] },
    // UNIQUE on customer_phone enforces the "one thread per customer" invariant
    // the findOrCreate({ where:{ customer_phone } }) calls rely on — otherwise
    // two near-simultaneous first-ever messages create two rows for one number
    // and split the thread. (Production applies this via the guarded migration
    // in index.js, which merges existing duplicates first.)
    { name: 'uniq_wa_conv_phone',               fields: ['customer_phone'], unique: true },
    { name: 'idx_wa_conv_phone_hash',           fields: ['phone_hash'] },
  ],
  hooks: {
    beforeCreate(conv) {
      if (!conv.phone_hash && conv.customer_phone) {
        try { conv.phone_hash = require('../utils/encryption.js').phoneHash(conv.customer_phone); } catch (_) { /* optional */ }
      }
    },
  },
});

const WhatsappMessage = sequelize.define('WhatsappMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conversation_id: { type: DataTypes.INTEGER, allowNull: false },
  wa_message_id: { type: DataTypes.STRING(100), allowNull: true },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
  type: { type: DataTypes.ENUM('text', 'template', 'image', 'document', 'audio', 'video', 'sticker', 'location', 'contacts', 'reaction', 'button'), defaultValue: 'text' },
  body: { type: DataTypes.TEXT, allowNull: true },
  quoted_message_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'ID of the message being replied to' },
  status: { type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed', 'received'), defaultValue: 'sent' },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  // Which automatic message produced this outbound row (e.g. 'order_shipped',
  // 'abandoned_cart', 'broadcast:12'). NULL = typed by staff / inbound.
  automation_key: { type: DataTypes.STRING(64), allowNull: true },
  // Exact Meta template name for template sends (read-rate per template).
  template_name: { type: DataTypes.STRING(100), allowNull: true },
  // Staff user who sent it (NULL for inbound and automatic messages).
  sent_by: { type: DataTypes.INTEGER, allowNull: true },
  // Readable reason when status = 'failed'.
  error_reason: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'whatsapp_messages',
  timestamps: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  // Opening a chat loads messages by conversation_id ordered by id (getMessages,
  // incl. "load older" with id < before). Status webhooks (delivered/read) and
  // reply-quote lookups hit wa_message_id on every receipt. Both were full table
  // scans over the whole message history before these indexes.
  indexes: [
    { name: 'idx_wa_msg_conv_id',   fields: ['conversation_id', 'id'] },
    // UNIQUE so a redelivered Meta webhook (at-least-once) can't create a
    // duplicate message row. MySQL allows multiple NULLs in a unique index, so
    // outbound rows that haven't received a wa_message_id yet are unaffected.
    // (Production applies this via the guarded migration in index.js, which
    // de-duplicates existing rows first.)
    { name: 'idx_wa_msg_wa_msg_id', fields: ['wa_message_id'], unique: true },
    // Dashboard getStats groups outbound messages by status and windows the
    // last 7 days by sent_at; both were full scans before. Mirrored in
    // scripts/add-perf-indexes.js.
    { name: 'idx_wa_msg_dir_status', fields: ['direction', 'status'] },
    { name: 'idx_wa_msg_sent_at',    fields: ['sent_at'] },
    { name: 'idx_wa_msg_auto_created', fields: ['automation_key', 'createdAt'] },
  ],
});

// Associations
WhatsappConversation.hasMany(WhatsappMessage, { foreignKey: 'conversation_id', as: 'Messages', onDelete: 'CASCADE' });
WhatsappMessage.belongsTo(WhatsappConversation, { foreignKey: 'conversation_id', as: 'Conversation' });

// ─── Canned Responses ─────────────────────────────────────────────────────────
const WhatsappCannedResponse = sequelize.define('WhatsappCannedResponse', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  shortcut: { type: DataTypes.STRING(50), allowNull: false, comment: 'e.g. /track' },
  title: { type: DataTypes.STRING(100), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
  // Tab on the Quick replies page.
  category: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'other', comment: 'orders|returns|products|other' },
  // How many times staff inserted it (POST /canned-responses/:id/used).
  uses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // utf8mb4 is REQUIRED — canned bodies contain emojis (📦 📍 💳 …). Without it
  // the column can't store 4-byte chars and every emoji becomes "?".
}, { tableName: 'whatsapp_canned_responses', timestamps: true, charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

// ─── Broadcast Campaigns ──────────────────────────────────────────────────────
const WhatsappBroadcast = sequelize.define('WhatsappBroadcast', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  name: { type: DataTypes.STRING(150), allowNull: false },
  template_name: { type: DataTypes.STRING(100), allowNull: false },
  // JSON array of param arrays per recipient
  audience_filter: { type: DataTypes.TEXT, allowNull: true, comment: 'JSON: {segment, minOrders, minSpend}' },
  // scheduled → running (paused outside 10:00–20:00 IST) → done; cancelled
  // only before it starts.
  status: { type: DataTypes.ENUM('draft', 'scheduled', 'running', 'paused', 'done', 'failed', 'cancelled'), defaultValue: 'draft' },
  total_recipients: { type: DataTypes.INTEGER, defaultValue: 0 },
  sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
  // Recipients skipped because they replied STOP.
  skipped_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'whatsapp_broadcasts', timestamps: true });

module.exports = { WhatsappConversation, WhatsappMessage, WhatsappCannedResponse, WhatsappBroadcast };
