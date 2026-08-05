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
    { name: 'idx_wa_conv_phone_brand',          fields: ['customer_phone', 'brand_id'] },
  ],
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
    { name: 'idx_wa_msg_wa_msg_id', fields: ['wa_message_id'] },
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
}, { tableName: 'whatsapp_canned_responses', timestamps: true });

// ─── Broadcast Campaigns ──────────────────────────────────────────────────────
const WhatsappBroadcast = sequelize.define('WhatsappBroadcast', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  name: { type: DataTypes.STRING(150), allowNull: false },
  template_name: { type: DataTypes.STRING(100), allowNull: false },
  // JSON array of param arrays per recipient
  audience_filter: { type: DataTypes.TEXT, allowNull: true, comment: 'JSON: {segment, minOrders, minSpend}' },
  status: { type: DataTypes.ENUM('draft', 'running', 'done', 'failed'), defaultValue: 'draft' },
  total_recipients: { type: DataTypes.INTEGER, defaultValue: 0 },
  sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'whatsapp_broadcasts', timestamps: true });

module.exports = { WhatsappConversation, WhatsappMessage, WhatsappCannedResponse, WhatsappBroadcast };
